import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import * as XLSX from "xlsx";

// Comprehensive field mapping
const FIELD_MAPPINGS: Record<string, { label: string; getter: (item: any) => any }> = {
  // Basic Information
  id: { label: "Inventory ID", getter: (item) => item.id },
  sku: { label: "SKU", getter: (item) => item.sku },
  itemName: { label: "Item Name", getter: (item) => item.itemName },
  internalName: { label: "Internal Name", getter: (item) => item.internalName || "" },
  category: { label: "Category", getter: (item) => item.category },
  gemType: { label: "Gem Type", getter: (item) => item.gemType || "" },
  stoneType: { label: "Stone Type", getter: (item) => item.stoneType || "" },
  description: { label: "eBay HTML Description", getter: (item) => {
    const d = item.description || "";
    // Replace double-quotes with single-quotes for Excel-friendly output (prevents doubled quoting)
    return typeof d === 'string' ? d.replace(/"/g, "'") : d;
  } },
  productDescription: { label: "Product Description", getter: (item) => {
    const p = item.productDescription || "";
    return typeof p === 'string' ? p.replace(/"/g, "'") : p;
  } },
  
  // Classification & Codes
  categoryCode: { label: "Category Code", getter: (item) => item.categoryCode?.code || "" },
  gemstoneCode: { label: "Gemstone Code", getter: (item) => item.gemstoneCode?.code || "" },
  colorCode: { label: "Color Code", getter: (item) => item.colorCode?.code || "" },
  cutCode: { label: "Cut Code", getter: (item) => item.cutCode?.code || "" },
  collectionCode: { label: "Collection", getter: (item) => item.collectionCode?.name || "" },
  hsnCode: { label: "HSN Code", getter: (item) => item.hsnCode || "" },
  qcCode: { label: "QC Code", getter: (item) => item.qcCode || "" },
  
  // Physical Properties
  weightValue: { label: "Weight Value", getter: (item) => item.weightValue || 0 },
  weightUnit: { label: "Weight Unit", getter: (item) => item.weightUnit || "" },
  carats: { label: "Carats", getter: (item) => item.carats || 0 },
  weightRatti: { label: "Weight (Ratti)", getter: (item) => item.weightRatti || 0 },
  weightGrams: { label: "Weight (Grams)", getter: (item) => item.weightGrams || 0 },
  pieces: { label: "Pieces/Qty", getter: (item) => item.pieces || 1 },
  shape: { label: "Shape", getter: (item) => item.shape || "" },
  color: { label: "Color", getter: (item) => item.colorCode?.name || item.color || "" },
  clarity: { label: "Clarity", getter: (item) => item.clarity || "" },
  clarityGrade: { label: "Clarity Grade", getter: (item) => item.clarityGrade || "" },
  cut: { label: "Cut", getter: (item) => item.cut || "" },
  cutGrade: { label: "Cut Grade", getter: (item) => item.cutGrade || "" },
  polish: { label: "Polish", getter: (item) => item.polish || "" },
  symmetry: { label: "Symmetry", getter: (item) => item.symmetry || "" },
  fluorescence: { label: "Fluorescence", getter: (item) => item.fluorescence || "" },
  measurements: { label: "Measurements", getter: (item) => item.measurements || "" },
  dimensionsMm: { label: "Dimensions (mm)", getter: (item) => item.dimensionsMm || "" },
  tablePercent: { label: "Table %", getter: (item) => item.tablePercent || 0 },
  depthPercent: { label: "Depth %", getter: (item) => item.depthPercent || 0 },
  ratio: { label: "Ratio", getter: (item) => item.ratio || 0 },
  transparency: { label: "Transparency", getter: (item) => item.transparency || "" },
  
  // Origin & Treatment
  origin: { label: "Origin", getter: (item) => item.origin || "" },
  originCountry: { label: "Origin Country", getter: (item) => item.originCountry || "" },
  treatment: { label: "Treatment", getter: (item) => item.treatment || "" },
  cutPolishedIn: { label: "Cut/Polished In", getter: (item) => item.cutPolishedIn || "" },
  
  // Bracelet/Bead Specific
  braceletType: { label: "Bracelet Type", getter: (item) => item.braceletType || "" },
  standardSize: { label: "Standard Size", getter: (item) => item.standardSize || "" },
  beadSizeMm: { label: "Bead Size (mm)", getter: (item) => item.beadSizeMm || 0 },
  beadSizeLabel: { label: "Bead Size Label", getter: (item) => item.beadSizeLabel || "" },
  beadCount: { label: "Bead Count", getter: (item) => item.beadCount || 0 },
  holeSizeMm: { label: "Hole Size (mm)", getter: (item) => item.holeSizeMm || 0 },
  innerCircumferenceMm: { label: "Inner Circumference (mm)", getter: (item) => item.innerCircumferenceMm || 0 },
  
  // Certification
  certificateNo: { label: "Certificate No", getter: (item) => item.certificateNo || "" },
  certificateNumber: { label: "Certificate Number", getter: (item) => item.certificateNumber || "" },
  certification: { label: "Certification", getter: (item) => item.certification || "" },
  lab: { label: "Lab", getter: (item) => item.lab || "" },
  certificateLab: { label: "Certificate Lab", getter: (item) => item.certificateLab || "" },
  certificateComments: { label: "Certificate Comments", getter: (item) => item.certificateComments || "" },
  rashis: { label: "Rashis", getter: (item) => item.rashis?.map((r: any) => r.name).join(", ") || "" },
  certificates: { label: "Certificates", getter: (item) => item.certificates?.map((c: any) => c.name).join(", ") || "" },
  
  // Pricing
  pricingMode: { label: "Pricing Mode", getter: (item) => item.pricingMode || "" },
  costPrice: { label: "Cost Price", getter: (item) => item.costPrice || 0 },
  sellingPrice: { label: "Selling Price", getter: (item) => item.sellingPrice || 0 },
  purchaseRatePerCarat: { label: "Purchase Rate/Carat", getter: (item) => item.purchaseRatePerCarat || 0 },
  sellingRatePerCarat: { label: "Selling Rate/Carat", getter: (item) => item.sellingRatePerCarat || 0 },
  flatPurchaseCost: { label: "Flat Purchase Cost", getter: (item) => item.flatPurchaseCost || 0 },
  flatSellingPrice: { label: "Flat Selling Price", getter: (item) => item.flatSellingPrice || 0 },
  profit: { label: "Profit", getter: (item) => item.profit || 0 },
  rapPrice: { label: "RAP Price", getter: (item) => item.rapPrice || 0 },
  discountPercent: { label: "Discount %", getter: (item) => item.discountPercent || 0 },
  
  // Status & Location
  status: { label: "Status", getter: (item) => item.status },
  condition: { label: "Condition", getter: (item) => item.condition || "" },
  location: { label: "Location", getter: (item) => item.location || "" },
  stockLocation: { label: "Stock Location", getter: (item) => item.stockLocation || "" },
  hideFromAttention: { label: "Hide From Attention", getter: (item) => item.hideFromAttention ? "Yes" : "No" },
  
  // Vendor & Purchase
  vendorId: { label: "Vendor ID", getter: (item) => item.vendorId || "" },
  vendorName: { label: "Vendor Name", getter: (item) => item.vendor?.name || "" },
  purchaseId: { label: "Purchase ID", getter: (item) => item.purchaseId || "" },
  batchId: { label: "Batch ID", getter: (item) => item.batchId || "" },
  
  // Media
  imageUrl: { label: "Image URL", getter: (item) => item.imageUrl || "" },
  videoUrl: { label: "Video URL", getter: (item) => item.videoUrl || "" },
  mediaUrls: { label: "All Media URLs", getter: (item) => item.media?.map((m: any) => m.mediaUrl).join("; ") || "" },
  primaryMediaUrl: { label: "Primary Media URL", getter: (item) => item.media?.find((m: any) => m.isPrimary)?.mediaUrl || item.imageUrl || "" },
  
  // Notes
  notes: { label: "Notes", getter: (item) => item.notes || "" },
  
  // Metadata - Format dates as strings for Excel compatibility
  createdAt: { label: "Created At", getter: (item) => item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : "" },
  updatedAt: { label: "Updated At", getter: (item) => item.updatedAt ? new Date(item.updatedAt).toISOString().split('T')[0] : "" },
};

export async function GET(req: NextRequest) {
  try {
    console.log("[Export API] Starting comprehensive export...");
    
    // Check authentication
    const session = await auth();
    const userId = session?.user?.id;
    console.log("[Export API] Auth check:", userId ? "authenticated" : "not authenticated");
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission
    let canExport = false;
    try {
      canExport = await checkUserPermission(userId, PERMISSIONS.INVENTORY_VIEW);
      console.log("[Export API] Permission check:", canExport);
    } catch (permError) {
      console.error("[Export API] Permission check failed:", permError);
      // Fallback: assume user can export if permission check fails
      canExport = true;
    }
    
    if (!canExport) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const fieldsParam = searchParams.get("fields");
    const statusParam = searchParams.get("status");
    const allStock = searchParams.get("allStock") === "true";
    console.log("[Export API] Query params:", { fieldsParam: fieldsParam?.substring(0, 50), statusParam, allStock });

    // Parse requested fields
    const requestedFields = fieldsParam 
      ? fieldsParam.split(",").filter(f => FIELD_MAPPINGS[f])
      : Object.keys(FIELD_MAPPINGS);
    console.log("[Export API] Requested fields count:", requestedFields.length);

    // Build where clause
    let where: any = {};
    if (!allStock && statusParam && statusParam !== "ALL") {
      where.status = statusParam;
    }

    // Fetch all inventory data with relations
    console.log("[Export API] Fetching inventory from database...");
    let inventory;
    try {
      inventory = await prisma.inventory.findMany({
        where,
        include: {
          categoryCode: { select: { name: true, code: true } },
          gemstoneCode: { select: { name: true, code: true } },
          colorCode: { select: { name: true, code: true } },
          cutCode: { select: { name: true, code: true } },
          collectionCode: { select: { name: true, code: true } },
          rashis: { select: { name: true } },
          certificates: { select: { name: true, remarks: true } },
          media: { select: { mediaUrl: true, isPrimary: true, type: true } },
          vendor: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      console.log("[Export API] Fetched inventory count:", inventory.length);
    } catch (dbError) {
      console.error("[Export API] Database query failed:", dbError);
      throw new Error("Database query failed: " + (dbError instanceof Error ? dbError.message : "Unknown error"));
    }

    // Transform data for export
    console.log("[Export API] Transforming data...");
    const exportData = inventory.map(item => {
      const row: Record<string, any> = {};
      requestedFields.forEach(field => {
        const mapping = FIELD_MAPPINGS[field];
        if (mapping) {
          row[mapping.label] = mapping.getter(item);
        }
      });
      return row;
    });

    // Create workbook
    console.log("[Export API] Creating Excel workbook...");
    let workbook;
    let worksheet;
    try {
      workbook = XLSX.utils.book_new();
      worksheet = XLSX.utils.json_to_sheet(exportData);
      console.log("[Export API] Worksheet created with", exportData.length, "rows");
    } catch (xlsxError) {
      console.error("[Export API] XLSX worksheet creation failed:", xlsxError);
      throw new Error("Failed to create Excel worksheet: " + (xlsxError instanceof Error ? xlsxError.message : "Unknown error"));
    }
    
    // Set column widths (safely handle missing mappings)
    const colWidths = requestedFields
      .filter(field => FIELD_MAPPINGS[field])
      .map(field => {
        const label = FIELD_MAPPINGS[field].label;
        const maxContentLength = exportData.reduce((max, row) => {
          const content = String(row[label] || "");
          return Math.max(max, content.length);
        }, label.length);
        return { wch: Math.min(maxContentLength + 2, 50) }; // Cap at 50 to avoid extremely wide columns
      });
    if (colWidths.length > 0) {
      worksheet['!cols'] = colWidths;
    }

    try {
      XLSX.utils.book_append_sheet(workbook, worksheet, "Complete Inventory");
      console.log("[Export API] Sheet appended to workbook");
    } catch (appendError) {
      console.error("[Export API] Failed to append sheet:", appendError);
      throw new Error("Failed to append sheet to workbook");
    }

    // Generate buffer
    console.log("[Export API] Generating Excel buffer...");
    let buffer;
    try {
      buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      console.log("[Export API] Buffer generated, size:", buffer.byteLength);
    } catch (writeError) {
      console.error("[Export API] Failed to write workbook:", writeError);
      throw new Error("Failed to generate Excel file: " + (writeError instanceof Error ? writeError.message : "Unknown error"));
    }

    // Return response
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="inventory-complete-export-${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Comprehensive export error:", error);
    // Log more details for debugging
    if (error instanceof Error) {
      console.error("Error stack:", error.stack);
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
