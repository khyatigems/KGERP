import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { format } from "date-fns";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // "summary" | "detailed"
  const search = searchParams.get("search");

  // Construct WHERE clause (same as in page.tsx)
  const where: any = search ? {
    OR: [
      { invoiceNo: { contains: search } },
      { vendor: { name: { contains: search } } },
      { purchaseItems: { some: { itemName: { contains: search } } } },
      { purchaseItems: { some: { category: { contains: search } } } },
    ]
  } : {};

  const purchases = await prisma.purchase.findMany({
    where,
    orderBy: { purchaseDate: "desc" },
    include: {
      purchaseItems: true,
      vendor: { select: { name: true } },
    },
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "KhyatiGems ERP";
  workbook.created = new Date();

  const sheetName = type === "detailed" ? "Detailed Purchases" : "Purchase Summary";
  const sheet = workbook.addWorksheet(sheetName);

  if (type === "detailed") {
    // Report 2: Details view of purchases
    // Date of Purchase, Invoice Number, Item list with name, provide each item entery in excel, Vendor name, Category of the item, Shape, Size, Qty, Cost/Unit, Total
    sheet.columns = [
      { header: "Date of Purchase", key: "date", width: 15 },
      { header: "Invoice Number", key: "invoice", width: 20 },
      { header: "Item Name", key: "item", width: 25 },
      { header: "Vendor Name", key: "vendor", width: 20 },
      { header: "Category", key: "category", width: 15 },
      { header: "Shape", key: "shape", width: 15 },
      { header: "Size", key: "size", width: 15 }, // Dimensions or Bead Size
      { header: "Qty", key: "qty", width: 10 },
      { header: "Unit", key: "unit", width: 10 }, // Extra helper column
      { header: "Cost/Unit", key: "rate", width: 15 },
      { header: "Total Cost", key: "total", width: 15 },
    ];

    purchases.forEach((p) => {
      p.purchaseItems.forEach((item) => {
        sheet.addRow({
          date: p.purchaseDate ? format(p.purchaseDate, "dd-MM-yyyy") : "-",
          invoice: p.invoiceNo || "-",
          item: item.itemName,
          vendor: p.vendor?.name || "-",
          category: item.category,
          shape: item.shape || "-",
          size: item.dimensions || (item.beadSizeMm ? `${item.beadSizeMm} mm` : "-"),
          qty: item.weightValue || item.quantity,
          unit: item.weightUnit || "pcs",
          rate: item.unitCost,
          total: item.totalCost,
        });
      });
    });

  } else {
    // Report 1: Summary of purchases
    // Date of Purchase, Invoice number, Vendor Name, Items purchases Qty, Total Cost, payment status
    sheet.columns = [
      { header: "Date of Purchase", key: "date", width: 15 },
      { header: "Invoice Number", key: "invoice", width: 20 },
      { header: "Vendor Name", key: "vendor", width: 20 },
      { header: "Items Qty", key: "qty", width: 15 }, // Sum of quantities (pieces) or line items count? User said "Items purchases Qty". I will put sum of pieces/weight if homogenous or count of items. Let's put Total Items count and Total Weight for clarity.
      { header: "Total Cost", key: "total", width: 15 },
      { header: "Payment Status", key: "status", width: 15 },
    ];

    purchases.forEach((p) => {
      // Calculate total quantity (pieces) or weight?
      // If mixed units, summing weight is wrong.
      // Let's sum quantities (usually pieces if not weight) but `quantity` field in PurchaseItem is pieces (default 1).
      // `weightValue` is the weight.
      // Let's just show number of line items or maybe a summary string like "5 items".
      // User asked for "Items purchases Qty".
      // Let's sum the 'quantity' field (which is pieces/count).
      const totalQty = p.purchaseItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

      sheet.addRow({
        date: p.purchaseDate ? format(p.purchaseDate, "dd-MM-yyyy") : "-",
        invoice: p.invoiceNo || "-",
        vendor: p.vendor?.name || "-",
        qty: totalQty,
        total: p.totalAmount,
        status: p.paymentStatus || "PENDING",
      });
    });
  }

  // Styling
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD3D3D3" },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `purchases_${type}_${format(new Date(), "yyyyMMdd")}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
