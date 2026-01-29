import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Fetch Master Data
  const [categories, gemstones, colors, cuts, vendors] = await Promise.all([
    prisma.categoryCode.findMany({ where: { status: "ACTIVE" }, select: { name: true } }),
    prisma.gemstoneCode.findMany({ where: { status: "ACTIVE" }, select: { name: true } }),
    prisma.colorCode.findMany({ where: { status: "ACTIVE" }, select: { name: true } }),
    prisma.cutCode.findMany({ where: { status: "ACTIVE" }, select: { name: true } }),
    prisma.vendor.findMany({ where: { status: "APPROVED" }, select: { name: true } }),
  ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "KhyatiGems ERP";
  workbook.created = new Date();

  // --- Sheet 1: Template ---
  const sheet = workbook.addWorksheet("Import Template");

  const headers = [
    "itemName",
    "categoryCode",
    "gemstoneCode",
    "colorCode",
    "color", // Free text or same as colorCode? keeping both as per existing import
    "gemType", // PRECIOUS, SEMI_PRECIOUS etc.
    "shape",
    "weightValue",
    "weightUnit",
    "vendorName",
    "pricingMode",
    "purchaseRatePerCarat",
    "sellingRatePerCarat",
    "flatPurchaseCost",
    "flatSellingPrice",
    "stockLocation",
    "notes",
  ];

  sheet.columns = headers.map((header) => ({
    header,
    key: header,
    width: 20,
  }));

  // Style header row
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD3D3D3" },
  };

  // --- Sheet 2: Reference Data ---
  const refSheet = workbook.addWorksheet("Reference Data");
  refSheet.state = "hidden"; // Hide it to keep UI clean, but users can unhide if needed

  // Populate Reference Data
  // Columns: A: Category, B: Gemstone, C: Color, D: Cut, E: Vendor, F: PricingMode, G: WeightUnit
  refSheet.getCell("A1").value = "Categories";
  refSheet.getCell("B1").value = "Gemstones";
  refSheet.getCell("C1").value = "Colors";
  refSheet.getCell("D1").value = "Cuts";
  refSheet.getCell("E1").value = "Vendors";
  refSheet.getCell("F1").value = "Pricing Modes";
  refSheet.getCell("G1").value = "Weight Units";

  categories.forEach((c, i) => { refSheet.getCell(`A${i + 2}`).value = c.name; });
  gemstones.forEach((c, i) => { refSheet.getCell(`B${i + 2}`).value = c.name; });
  colors.forEach((c, i) => { refSheet.getCell(`C${i + 2}`).value = c.name; });
  cuts.forEach((c, i) => { refSheet.getCell(`D${i + 2}`).value = c.name; });
  vendors.forEach((c, i) => { refSheet.getCell(`E${i + 2}`).value = c.name; });

  const pricingModes = ["PER_CARAT", "FIXED"];
  pricingModes.forEach((p, i) => { refSheet.getCell(`F${i + 2}`).value = p; });

  const weightUnits = ["cts", "grams", "ratti"];
  weightUnits.forEach((w, i) => { refSheet.getCell(`G${i + 2}`).value = w; });

  // Add Data Validations to Template Sheet
  // We assume a reasonable max rows for validation, e.g., 1000
  const maxRows = 1000;

  // Helper to add validation
  const addValidation = (colIndex: number, refCol: string, count: number) => {
    // colIndex is 1-based index of column in Template sheet
    // refCol is the letter of the column in Reference sheet
    // count is the number of items
    if (count === 0) return;
    
    // The formula needs to refer to the Reference Data sheet
    // Note: Excel formulas for validation across sheets might need the sheet name quoted if it has spaces
    const formula = `'Reference Data'!$${refCol}$2:$${refCol}$${count + 1}`;

    for (let i = 2; i <= maxRows; i++) {
      sheet.getCell(i, colIndex).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [formula],
        showErrorMessage: true,
        errorStyle: 'error',
        errorTitle: 'Invalid Value',
        error: 'Please select a value from the list.'
      };
    }
  };

  // Apply validations
  // Headers index (1-based):
  // 1: itemName
  // 2: categoryCode -> Ref Col A
  addValidation(2, "A", categories.length);
  
  // 3: gemstoneCode -> Ref Col B
  addValidation(3, "B", gemstones.length);
  
  // 4: colorCode -> Ref Col C
  addValidation(4, "C", colors.length);
  
  // 5: color -> Maybe same as colorCode? Let's leave it free text for now as it might be descriptive
  
  // 7: shape -> Usually free text or cut? Using Cut for now if relevant, or free text.
  // The user asked for "all drop down feeded". Let's assume Cut is Shape for now or add Cut validation if Shape maps to Cut.
  // Looking at schema: Shape and Cut are separate. But usually related. 
  // Let's add validation for Cut if we map it to shape or add a Cut column. 
  // The import headers have "shape" but not "cut". 
  // Let's check if we should map CutCode to Shape. 
  // For now, let's leave Shape as free text or use CutCode list if they are synonymous in this system.
  // Actually, let's add CutCode list to Shape column as a suggestion.
  addValidation(7, "D", cuts.length);

  // 9: weightUnit -> Ref Col G
  addValidation(9, "G", weightUnits.length);
  
  // 10: vendorName -> Ref Col E
  addValidation(10, "E", vendors.length);
  
  // 11: pricingMode -> Ref Col F
  addValidation(11, "F", pricingModes.length);

  // Add some sample data
  sheet.addRow({
    itemName: "Sample Emerald Ring",
    categoryCode: categories[0]?.name,
    gemstoneCode: gemstones[0]?.name,
    weightValue: 2.5,
    weightUnit: "cts",
    pricingMode: "PER_CARAT",
    purchaseRatePerCarat: 5000,
    sellingRatePerCarat: 8000,
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="inventory_import_template.xlsx"',
    },
  });
}
