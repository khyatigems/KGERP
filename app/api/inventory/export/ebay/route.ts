import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { buildEbayHtmlDescription } from "@/lib/ebay-description";
import { getEbaySettings, getCategoryImages, selectImagesForDescription } from "@/lib/ebay-settings-server";
import * as XLSX from "xlsx";

type EbayDescriptionInput = {
  sku?: string | null;
  itemName?: string | null;
  category?: string | null;
  gemType?: string | null;
  gemstoneCode?: { name?: string | null } | null;
  color?: string | null;
  colorCode?: { name?: string | null } | null;
  shape?: string | null;
  weightValue?: number | null;
  weightUnit?: string | null;
  dimensionsMm?: string | null;
  treatment?: string | null;
  origin?: string | null;
  transparency?: string | null;
  certification?: string | null;
  braceletType?: string | null;
  beadSizeMm?: number | null;
  beadCount?: number | null;
  holeSizeMm?: number | null;
  innerCircumferenceMm?: number | null;
  standardSize?: string | null;
  notes?: string | null;
};

type EbayExportSettings = {
  includeImages: boolean;
  includeDescription: boolean;
  useTemplate: boolean;
  includeMeasurements: boolean;
  includeCertificate: boolean;
  includeOrigin: boolean;
  autoPrice: boolean;
  markup: number;
};

// Generate eBay-compatible HTML description with category-specific images
async function generateEbayDescription(item: EbayDescriptionInput, settings: EbayExportSettings): Promise<string> {
  // Fetch eBay settings to get category-specific images
  const ebaySettingsResult = await getEbaySettings();
  const ebaySettings = ebaySettingsResult.success ? ebaySettingsResult.data : null;
  
  // Get category-specific images for this item
  const categoryImages = ebaySettings 
    ? getCategoryImages(ebaySettings, item.category || undefined)
    : undefined;
  
  // Select images based on rotation mode
  const imagesPerDescription = ebaySettings?.imagesPerDescription || 2;
  const rotationMode = ebaySettings?.imageRotationMode || "RANDOM";
  const selectedImages = categoryImages 
    ? selectImagesForDescription(categoryImages, imagesPerDescription, rotationMode)
    : undefined;

  const builderSettings = ebaySettings
    ? {
        companyName: ebaySettings.companyName ?? undefined,
        tagline: ebaySettings.tagline ?? undefined,
        brandLogoUrl: ebaySettings.brandLogoUrl ?? undefined,
        globalBannerImages: typeof ebaySettings.globalBannerImages === "string"
          ? JSON.parse(ebaySettings.globalBannerImages)
          : ebaySettings.globalBannerImages ?? undefined,
        categoryImageUrls: typeof ebaySettings.categoryImageUrls === "string"
          ? JSON.parse(ebaySettings.categoryImageUrls)
          : ebaySettings.categoryImageUrls ?? undefined,
        categoryGemtypeImageUrls: typeof ebaySettings.categoryGemtypeImageUrls === "string"
          ? JSON.parse(ebaySettings.categoryGemtypeImageUrls)
          : ebaySettings.categoryGemtypeImageUrls ?? undefined,
      }
    : undefined;
  
  return buildEbayHtmlDescription(
    {
      sku: item.sku,
      itemName: item.itemName,
      category: item.category,
      gemType: item.gemType || item.gemstoneCode?.name,
      color: item.colorCode?.name || item.color,
      shape: item.shape,
      weightValue: item.weightValue,
      weightUnit: item.weightUnit,
      dimensionsMm: item.dimensionsMm,
      treatment: item.treatment,
      origin: item.origin,
      transparency: item.transparency,
      certification: item.certification,
      braceletType: item.braceletType,
      beadSizeMm: item.beadSizeMm,
      beadCount: item.beadCount,
      holeSizeMm: item.holeSizeMm,
      innerCircumferenceMm: item.innerCircumferenceMm,
      standardSize: item.standardSize,
      notes: item.notes,
    },
    {
      includeMeasurements: settings.includeMeasurements,
      includeCertificate: settings.includeCertificate,
      includeOrigin: settings.includeOrigin,
      categoryImages: selectedImages,
      settings: builderSettings,
    }
  );
}

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    const userId = session?.user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission
    const canExport = await checkUserPermission(userId, PERMISSIONS.INVENTORY_VIEW);
    if (!canExport) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId") || "35952";
    const conditionId = searchParams.get("conditionId") || "1000";
    const format = searchParams.get("format") || "FixedPrice";
    const duration = searchParams.get("duration") || "GTC";
    const quantity = searchParams.get("quantity") || "1";
    const includeImages = searchParams.get("includeImages") === "true";
    const includeDescription = searchParams.get("includeDescription") === "true";
    const useTemplate = searchParams.get("useTemplate") === "true";
    const includeMeasurements = searchParams.get("includeMeasurements") === "true";
    const includeCertificate = searchParams.get("includeCertificate") === "true";
    const includeOrigin = searchParams.get("includeOrigin") === "true";
    const autoPrice = searchParams.get("autoPrice") === "true";
    const markup = parseFloat(searchParams.get("markup") || "20");

    const settings = {
      includeImages,
      includeDescription,
      useTemplate,
      includeMeasurements,
      includeCertificate,
      includeOrigin,
      autoPrice,
      markup,
    };

    // Get filtering parameters (reuses existing searchParams from line 169)
    const statusFilter = searchParams.get("status") || "IN_STOCK";
    const includeHiddenParam = searchParams.get("includeHidden") === "true";
    
    console.log("[eBay Export] Filters:", { statusFilter, includeHidden: includeHiddenParam });
    
    // Fetch inventory based on filters
    const whereClause: { status?: string; hideFromAttention?: boolean } = {};
    
    if (statusFilter && statusFilter !== "ALL") {
      whereClause.status = statusFilter;
    }
    
    if (!includeHiddenParam) {
      whereClause.hideFromAttention = false;
    }
    
    console.log("[eBay Export] Where clause:", whereClause);
    
    const inventory = await prisma.inventory.findMany({
      where: whereClause,
      include: {
        media: { 
          select: { mediaUrl: true, isPrimary: true, type: true },
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          take: 12,
        },
        rashis: { select: { name: true } },
        certificates: { select: { name: true, remarks: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    
    console.log("[eBay Export] Found inventory items:", inventory.length);
    
    // Return warning if no items found
    if (inventory.length === 0) {
      console.log("[eBay Export] No items found with filters:", whereClause);
      return NextResponse.json(
        { 
          warning: true, 
          message: "No inventory items found matching the selected filters. Please check your inventory status or adjust filters."
        },
        { status: 200 }
      );
    }

    // Transform data for eBay
    const ebayData = await Promise.all(inventory.map(async (item) => {
      // Calculate price with markup
      const basePrice = autoPrice 
        ? (item.sellingPrice || item.flatSellingPrice || 0)
        : 0;
      const finalPrice = Math.round(basePrice * (1 + markup / 100));

      // Get images (up to 12 for eBay)
      const images = item.media?.slice(0, 12) || [];
      const pictureUrls: Record<string, string> = {};
      for (let i = 0; i < 12; i++) {
        pictureUrls[`PictureURL${i + 1}`] = includeImages ? images[i]?.mediaUrl || "" : "";
      }

      // Generate description with category-specific images when requested
      const generatedDescription = useTemplate
        ? await generateEbayDescription(item, settings)
        : item.notes || item.itemName;
      const description = includeDescription
        ? item.description || generatedDescription
        : "";

      // Pass description directly without unescaping to preserve HTML structure
      const safeDescription = description;

      return {
        Action: "Add",
        ItemID: "",
        Title: `${item.itemName} - ${item.gemType || "Gemstone"} ${item.weightValue || 0}${item.weightUnit || "cts"}`,
        Subtitle: `${item.color || "Natural"} ${item.shape || ""} ${item.certification || ""}`.trim(),
        Description: safeDescription,
        Category: categoryId,
        ConditionID: conditionId,
        ConditionDescription: "New without tags - Brand new, unused gemstone",
        Format: format,
        Duration: duration,
        StartPrice: finalPrice.toFixed(2),
        BuyItNowPrice: format === "AuctionWithBIN" ? (finalPrice * 1.1).toFixed(2) : "",
        Quantity: quantity,
        Location: "Mumbai, India",
        Country: "IN",
        Currency: "USD",
        ...pictureUrls,
        SKU: item.sku,
        ISBN: "",
        UPC: "",
        EAN: "",
        Brand: "Khyati Gems",
        MPN: item.sku,
        Color: item.color || "Natural",
        Size: item.standardSize || item.dimensionsMm || "As shown",
        SizeType: "Regular",
        Style: item.category || "Gemstone",
        Material: item.gemType || "Gemstone",
        GemType: item.gemType || "Natural Gemstone",
        Clarity: item.clarity || item.clarityGrade || "As shown",
        Cut: item.cut || "As shown",
        Treatment: item.treatment || "None/Unheated",
        Origin: item.origin || "Natural",
        Weight: item.weightValue?.toString() || "0",
        WeightUnit: item.weightUnit || "cts",
        MeasurementUnit: "mm",
        Length: item.dimensionsMm?.split("x")[0]?.trim() || "",
        Width: item.dimensionsMm?.split("x")[1]?.trim() || "",
        Depth: item.dimensionsMm?.split("x")[2]?.trim() || "",
        ShippingType: "Flat",
        ShippingService1: "Standard Shipping",
        ShippingServiceCost1: "0",
        ShippingServiceAdditionalCost1: "0",
        PaymentMethods: "PayPal",
        PayPalEmailAddress: "",
        ReturnsAcceptedOption: "ReturnsAccepted",
        ReturnsWithinOption: "Days_14",
        RefundOption: "MoneyBack",
        ReturnPolicyDescription: "Returns accepted within 14 days if item is not as described. Please contact us before returning.",
        ShippingCostPaidByOption: "Buyer",
        UseTaxTable: "false",
        StoreCategory: "",
        ProductReferenceID: "",
        CustomLabel: item.internalName || item.sku,
      };
    }));

    // Create workbook
    console.log("[eBay Export API] Creating workbook with", ebayData.length, "listings");
    let workbook;
    try {
      workbook = XLSX.utils.book_new();
    } catch (err) {
      console.error("[eBay Export API] Failed to create workbook:", err);
      throw new Error("Failed to create Excel workbook");
    }
    
    // Main listings sheet
    let worksheet;
    try {
      worksheet = XLSX.utils.json_to_sheet(ebayData);
      XLSX.utils.book_append_sheet(workbook, worksheet, "eBay Listings");
      console.log("[eBay Export API] Main sheet created");
    } catch (err) {
      console.error("[eBay Export API] Failed to create main sheet:", err);
      throw new Error("Failed to create listings sheet");
    }

    // Instructions sheet
    const instructions = [
      { Step: 1, Action: "Review the listings", Details: "Check all titles, prices, and descriptions before uploading" },
      { Step: 2, Action: "Update images", Details: "Ensure all Cloudinary image URLs are accessible" },
      { Step: 3, Action: "Set PayPal email", Details: "Fill in your PayPal email in the PayPalEmailAddress column" },
      { Step: 4, Action: "Upload to eBay", Details: "Go to eBay Seller Hub > Listings > Upload a file" },
      { Step: 5, Action: "Review and submit", Details: "Preview all listings before final submission" },
    ];
    const instructionsSheet = XLSX.utils.json_to_sheet(instructions);
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions");

    // Settings sheet
    const settingsData = [
      { Setting: "Export Date", Value: new Date().toISOString() },
      { Setting: "Total Listings", Value: ebayData.length.toString() },
      { Setting: "Category ID", Value: categoryId },
      { Setting: "Condition ID", Value: conditionId },
      { Setting: "Format", Value: format },
      { Setting: "Duration", Value: duration },
      { Setting: "Price Markup", Value: `${markup}%` },
      { Setting: "Images Included", Value: includeImages ? "Yes" : "No" },
      { Setting: "Template Used", Value: useTemplate ? "Yes" : "No" },
    ];
    const settingsSheet = XLSX.utils.json_to_sheet(settingsData);
    XLSX.utils.book_append_sheet(workbook, settingsSheet, "Settings");

    // Generate buffer
    console.log("[eBay Export API] Generating buffer...");
    let buffer;
    try {
      buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      console.log("[eBay Export API] Buffer generated, size:", buffer.byteLength);
    } catch (err) {
      console.error("[eBay Export API] Failed to generate buffer:", err);
      throw new Error("Failed to generate Excel file");
    }

    // Return response
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="ebay-listings-${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("[eBay Export API] Export error:", error);
    if (error instanceof Error) {
      console.error("[eBay Export API] Error stack:", error.stack);
    }
    return NextResponse.json(
      { 
        error: "Export failed", 
        message: error instanceof Error ? error.message : "Unknown error",
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
