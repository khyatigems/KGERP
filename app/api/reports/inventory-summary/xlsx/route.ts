import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const ALL_COLS = new Set([
  "sku",
  "itemName",
  "category",
  "gemType",
  "weightValue",
  "sellingPrice",
  "costPrice",
  "hsnCode",
  "certificateNumber",
]);

function pick(obj: Record<string, unknown>, keys: string[]) {
  const out: Record<string, unknown> = {};
  for (const k of keys) out[k] = obj[k];
  return out;
}

function headerMap(key: string) {
  const map: Record<string, string> = {
    sku: "SKU",
    itemName: "Item",
    category: "Category",
    gemType: "Gem Type",
    weightValue: "Weight",
    sellingPrice: "Selling Price",
    costPrice: "Cost Price",
    hsnCode: "HSN",
    certificateNumber: "Certificate",
  };
  return map[key] || key;
}

function setCurrencyFormat(ws: XLSX.WorkSheet, currencyHeaders: string[]) {
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1:A1");
  const headerRow = range.s.r;
  const headerIndex = new Map<string, number>();
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: headerRow, c });
    const cell = ws[addr];
    if (!cell) continue;
    const v = String((cell as XLSX.CellObject).v ?? "");
    headerIndex.set(v, c);
  }
  for (const h of currencyHeaders) {
    const col = headerIndex.get(h);
    if (col === undefined) continue;
    for (let r = headerRow + 1; r <= range.e.r; r++) {
      const addr = XLSX.utils.encode_cell({ r, c: col });
      const cell = ws[addr] as XLSX.CellObject | undefined;
      if (!cell) continue;
      if (typeof cell.v === "number") (cell as XLSX.CellObject & { z?: string }).z = "₹#,##0.00";
    }
  }
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, PERMISSIONS.REPORTS_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const colsRaw = (sp.get("cols") || "").split(",").map((s) => s.trim()).filter(Boolean);
  const cols = colsRaw.length ? colsRaw.filter((c) => ALL_COLS.has(c)) : ["sku", "itemName", "category", "gemType", "weightValue", "sellingPrice"];

  const select = {
    sku: true,
    itemName: true,
    category: true,
    gemType: true,
    weightValue: true,
    sellingPrice: true,
    costPrice: true,
    hsnCode: true,
    certificateNumber: true,
    certificateNo: true,
  } as const;

  const [inStock, sold] = await Promise.all([
    prisma.inventory.findMany({ where: { status: "IN_STOCK" }, select, orderBy: { category: "asc" } }),
    prisma.inventory.findMany({ where: { status: "SOLD" }, select, orderBy: { category: "asc" } }),
  ]);

  type InvRow = {
    sku: string;
    itemName: string;
    category: string | null;
    gemType: string | null;
    weightValue: number | null;
    sellingPrice: number | null;
    costPrice: number | null;
    hsnCode: string | null;
    certificateNumber: string | null;
    certificateNo: string | null;
  };

  const normalize = (row: InvRow) => ({
    sku: row.sku,
    itemName: row.itemName,
    category: row.category || "Uncategorized",
    gemType: row.gemType || "",
    weightValue: row.weightValue || 0,
    sellingPrice: row.sellingPrice || 0,
    costPrice: row.costPrice || 0,
    hsnCode: row.hsnCode || "",
    certificateNumber: row.certificateNumber || row.certificateNo || "",
  });

  const headers = cols.map(headerMap);
  const currencyHeaders = headers.filter((h) => h === "Selling Price" || h === "Cost Price");

  const sheetRows = (rows: InvRow[]) =>
    rows.map((r) => {
      const picked = pick(normalize(r), cols);
      const out: Record<string, unknown> = {};
      for (const k of cols) out[headerMap(k)] = picked[k];
      return out;
    });

  const summary = [
    { Metric: "In-Stock Items", Count: inStock.length },
    { Metric: "Sold Items", Count: sold.length },
    { Metric: "Total", Count: inStock.length + sold.length },
  ];

  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet(sheetRows(inStock));
  const ws2 = XLSX.utils.json_to_sheet(sheetRows(sold));
  const ws3 = XLSX.utils.json_to_sheet(summary);

  setCurrencyFormat(ws1, currencyHeaders);
  setCurrencyFormat(ws2, currencyHeaders);

  XLSX.utils.book_append_sheet(wb, ws1, "InStock");
  XLSX.utils.book_append_sheet(wb, ws2, "Sold");
  XLSX.utils.book_append_sheet(wb, ws3, "Summary");

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "buffer" }) as unknown as Buffer;
  const filename = `Inventory_Summary_${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
