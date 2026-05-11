import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import * as XLSX from "xlsx";

// eBay field mapping for File Exchange format
const EBAY_FIELDS = [
  "Action",
  "ItemID",
  "Title",
  "Subtitle",
  "Description",
  "Category",
  "ConditionID",
  "ConditionDescription",
  "Format",
  "Duration",
  "StartPrice",
  "BuyItNowPrice",
  "Quantity",
  "Location",
  "Country",
  "Currency",
  "PictureURL1",
  "PictureURL2",
  "PictureURL3",
  "PictureURL4",
  "PictureURL5",
  "PictureURL6",
  "PictureURL7",
  "PictureURL8",
  "PictureURL9",
  "PictureURL10",
  "PictureURL11",
  "PictureURL12",
  "SKU",
  "ISBN",
  "UPC",
  "EAN",
  "Brand",
  "MPN",
  "Color",
  "Size",
  "SizeType",
  "Style",
  "Material",
  "GemType",
  "Clarity",
  "Cut",
  "Treatment",
  "Origin",
  "Weight",
  "WeightUnit",
  "MeasurementUnit",
  "Length",
  "Width",
  "Depth",
  "ShippingType",
  "ShippingService1",
  "ShippingServiceCost1",
  "ShippingServiceAdditionalCost1",
  "PaymentMethods",
  "PayPalEmailAddress",
  "ReturnsAcceptedOption",
  "ReturnsWithinOption",
  "RefundOption",
  "ReturnPolicyDescription",
  "ShippingCostPaidByOption",
  "UseTaxTable",
  "StoreCategory",
  "ProductReferenceID",
  "CustomLabel",
];

// Generate eBay-compatible HTML description
function generateEbayDescription(item: any, settings: any): string {
  const images = item.media?.filter((m: any) => m.type === "IMAGE" || m.type === "image").slice(0, 12) || [];
  const imageHtml = images.map((img: any, idx: number) => 
    `<img src="${img.mediaUrl}" alt="${item.itemName} - Image ${idx + 1}" style="max-width:100%;margin:10px 0;" />`
  ).join("\n");

  const specs = [
    ["Gem Type", item.gemType || item.gemstoneCode?.name || "Natural Gemstone"],
    ["Color", item.colorCode?.name || item.color || "As shown"],
    ["Shape", item.shape || "As shown"],
    ["Cut", item.cutCode?.name || item.cut || "As shown"],
    ["Clarity", item.clarity || "As shown"],
    ["Weight", `${item.weightValue || 0} ${item.weightUnit || "cts"}`],
    ["Dimensions", item.dimensionsMm || "As shown"],
    ["Treatment", item.treatment || "None/Unheated"],
    ["Origin", item.origin || "Natural"],
    ["Certification", item.certificateNumber || item.certification || "Included"],
    ["Lab", item.certificateLab || item.lab || "Certified"],
  ];

  const specsHtml = settings.includeMeasurements 
    ? `<table style="width:100%;border-collapse:collapse;margin:15px 0;">
        ${specs.map(([label, value]) => 
          `<tr><td style="padding:8px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold;width:40%;">${label}</td>
           <td style="padding:8px;border:1px solid #ddd;">${value}</td></tr>`
        ).join("")}
       </table>`
    : "";

  return `<![CDATA[
    <div style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;">
      <h1 style="color:#333;border-bottom:2px solid #c0a050;padding-bottom:10px;">${item.itemName}</h1>
      
      <div style="background:#f9f9f9;padding:15px;margin:15px 0;border-left:4px solid #c0a050;">
        <h3 style="margin-top:0;color:#c0a050;">✨ Product Images</h3>
        ${imageHtml || "<p>High-quality images available upon request.</p>"}
      </div>

      <div style="background:#fff;padding:15px;margin:15px 0;border:1px solid #ddd;">
        <h3 style="color:#c0a050;">📋 Product Description</h3>
        <p>${item.notes || `This exquisite ${item.gemType || "gemstone"} showcases exceptional quality and craftsmanship.`}</p>
      </div>

      ${settings.includeMeasurements ? specsHtml : ""}

      ${settings.includeCertificate ? `
      <div style="background:#f0f8ff;padding:15px;margin:15px 0;border-left:4px solid #4a90d9;">
        <h3 style="margin-top:0;color:#4a90d9;">📜 Certification</h3>
        <p><strong>Certificate Number:</strong> ${item.certificateNumber || item.certificateNo || "Included"}</p>
        <p><strong>Lab:</strong> ${item.certificateLab || item.lab || "Certified Laboratory"}</p>
        <p>This gemstone comes with a professional certificate guaranteeing authenticity and quality.</p>
      </div>
      ` : ""}

      ${settings.includeOrigin ? `
      <div style="background:#fff8f0;padding:15px;margin:15px 0;border-left:4px solid #e67e22;">
        <h3 style="margin-top:0;color:#e67e22;">🌍 Origin & Treatment</h3>
        <p><strong>Origin:</strong> ${item.origin || "Natural"}</p>
        <p><strong>Cut & Polished:</strong> ${item.cutPolishedIn || "India"}</p>
        <p><strong>Treatment:</strong> ${item.treatment || "None/Unheated"}</p>
      </div>
      ` : ""}

      <div style="background:#f5f5f5;padding:15px;margin:15px 0;text-align:center;border-top:2px solid #c0a050;">
        <h3 style="color:#c0a050;">💎 Khyati Precious Gems Private Limited</h3>
        <p>Since 1997 | Certified Gemstones | Worldwide Shipping</p>
        <p style="font-size:12px;color:#666;">
          All our gemstones are ethically sourced and come with a satisfaction guarantee.
          Contact us for custom jewelry designs and bulk orders.
        </p>
      </div>
    </div>
  ]]>`;
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
    const whereClause: any = {};
    
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
    const ebayData = inventory.map((item, index) => {
      // Calculate price with markup
      const basePrice = autoPrice 
        ? (item.sellingPrice || item.flatSellingPrice || 0)
        : 0;
      const finalPrice = Math.round(basePrice * (1 + markup / 100));

      // Get images (up to 12 for eBay)
      const images = item.media?.slice(0, 12) || [];
      const pictureUrls: Record<string, string> = {};
      for (let i = 0; i < 12; i++) {
        pictureUrls[`PictureURL${i + 1}`] = images[i]?.mediaUrl || "";
      }

      // Generate description
      const description = useTemplate 
        ? generateEbayDescription(item, settings)
        : (item.notes || item.itemName);

      return {
        Action: "Add",
        ItemID: "",
        Title: `${item.itemName} - ${item.gemType || "Gemstone"} ${item.weightValue || 0}${item.weightUnit || "cts"}`,
        Subtitle: `${item.color || "Natural"} ${item.shape || ""} ${item.certification || ""}`.trim(),
        Description: description,
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
    });

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
