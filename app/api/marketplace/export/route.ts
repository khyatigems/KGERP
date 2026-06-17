import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureMarketplaceControlCenterSchema, normalizePlatform, MARKETPLACE_PLATFORMS } from "@/lib/marketplace-control-center";
import ExcelJS from "exceljs";

export async function GET(req: NextRequest) {
  try {
    await ensureMarketplaceControlCenterSchema();
    const report = req.nextUrl.searchParams.get("report") || "coverage";
    const category = req.nextUrl.searchParams.get("category") || "ALL";
    const marketplace = req.nextUrl.searchParams.get("marketplace") || "ALL";
    const from = req.nextUrl.searchParams.get("from") || "";
    const to = req.nextUrl.searchParams.get("to") || "";

    const conditions: string[] = [`i."status" != 'SOLD'`];
    const values: Array<string | number> = [];

    if (category && category !== "ALL") { conditions.push(`i."category" = ?`); values.push(category); }
    if (from) { conditions.push(`i."createdAt" >= ?`); values.push(`${from}T00:00:00.000Z`); }
    if (to) { conditions.push(`i."createdAt" <= ?`); values.push(`${to}T23:59:59.999Z`); }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT i."id" AS "inventoryId", i."sku", i."itemName", i."internalName", i."category",
              i."gemType", i."weightValue", i."weightUnit", i."carats",
              i."costPrice", i."sellingPrice", i."status", i."imageUrl",
              i."certificateNo", i."certification",
              i."description", i."productDescription", i."dimensionsMm",
              i."shape", i."color", i."origin", i."treatment",
              i."clarity", i."transparency",
              i."stockLocation", i."hsn_code" AS "hsnCode",
              l."platform", l."listingUrl"
       FROM "Inventory" i
       LEFT JOIN "Listing" l ON l."inventoryId" = i."id" AND UPPER(l."status") IN ('ACTIVE', 'LISTED')
       ${whereClause}
       ORDER BY i."sku" ASC`,
      ...values
    );

    const grouped = new Map<string, {
      base: Record<string, unknown>;
      platforms: Set<string>;
    }>();
    for (const row of rows) {
      const invId = String(row.inventoryId || "");
      if (!grouped.has(invId)) { grouped.set(invId, { base: { ...row }, platforms: new Set() }); }
      const g = grouped.get(invId)!;
      const p = normalizePlatform(String(row.platform || ""));
      if (p) g.platforms.add(p);
    }

    const allItems = [...grouped.values()];

    // ── Helpers ──
    const cleanDesc = (d: unknown): string => {
      const raw = String(d || "");
      // Fix: database may store HTML with escaped quotes; normalize to single quotes
      return raw.replace(/\\"/g, '"').replace(/""/g, '"').trim();
    };

    const isReady = (b: Record<string, unknown>) => {
      const hasImage = !!(b.imageUrl);
      const hasCert = !!(b.certificateNo && String(b.certificateNo).trim()) || !!(b.certification && String(b.certification).trim());
      return { hasImage, hasCert, ready: hasImage && hasCert };
    };

    const fmtFmt = (v: unknown) => typeof v === "number" ? v : Number(v) || 0;

    // ── C: Brand colors ──
    const C = { navy: "FF1E293B", white: "FFFFFFFF", emerald: "FF10B981", emeraldLight: "FFD1FAE5", red: "FFEF4444", redLight: "FFFEE2E2", amber: "FFF59E0B", amberLight: "FFFEF3C7", blue: "FF3B82F6", greenLight: "FFD1FAE5" };

    function hdrStyle(wb: ExcelJS.Worksheet, cols: number) {
      for (let c = 1; c <= cols; c++) wb.getCell(1, c).style = { fill: { type: "pattern", pattern: "solid", fgColor: { argb: C.navy } }, font: { bold: true, color: { argb: C.white }, size: 11, name: "Calibri" }, alignment: { horizontal: "center", vertical: "middle", wrapText: true } };
      wb.views = [{ state: "frozen", ySplit: 1 }];
    }

    function autoW(wb: ExcelJS.Worksheet) {
      wb.columns.forEach((col, i) => {
        if (!col) return; let mx = 10;
        wb.eachRow({ includeEmpty: false }, (r) => { const v = r.getCell(i + 1).value?.toString() || ""; mx = Math.max(mx, Math.min(v.length + 3, 40)); });
        col.width = mx;
      });
    }

    const wb = new ExcelJS.Workbook(); wb.creator = "KhyatiGems ERP";

    if (report === "opportunity") {
      // ── Filter items ──
      const opportunityItems = allItems.filter((item) => {
        if (item.platforms.size >= 3) return false;
        if (item.platforms.size > 0) return true;
        return isReady(item.base).ready;
      });

      const needsPrepItems = allItems.filter((item) => {
        if (item.platforms.size >= 3 || item.platforms.size > 0) return false;
        return !isReady(item.base).ready;
      });

      // ═══ Sheet 1: Action Plan (SKU × missing platform) ═══
      const ws1 = wb.addWorksheet("Action Plan", { properties: { tabColor: { argb: C.blue } } });
      const h1 = ["SKU", "Product Name", "Category", "Platform to List", "Listed Elsewhere?", "Image", "Certificate", "Ready?", "Weight", "Selling Price (INR)", "Priority", "Stock Location", "HSN Code", "eBay HTML Description"];
      ws1.addRow(h1); hdrStyle(ws1, h1.length);

      for (const item of opportunityItems) {
        const b = item.base;
        const ready = isReady(b);
        const listed = [...item.platforms].sort().join(", ");
        const weight = fmtFmt(b.weightValue || b.carats);
        const sp = fmtFmt(b.sellingPrice);

        for (const mp of MARKETPLACE_PLATFORMS) {
          if (item.platforms.has(mp)) continue;
          ws1.addRow([
            b.sku || "", b.itemName || "", b.category || "", mp,
            item.platforms.size > 0 ? listed : "None",
            ready.hasImage ? "✅" : "❌",
            ready.hasCert ? "✅" : "❌",
            ready.ready ? "Ready" : "Prep Needed",
            weight, sp,
            item.platforms.size >= 2 ? "HIGH" : "MEDIUM",
            b.stockLocation || "—",
            b.hsnCode || "—",
            cleanDesc(b.description || b.productDescription),
          ]);
        }
      }
      autoW(ws1);
      for (let r = 2; r <= ws1.rowCount; r++) {
        ws1.getCell(r, 10).numFmt = "₹ #,##0";
        const prio = ws1.getCell(r, 11).value?.toString();
        if (prio === "HIGH") ws1.getCell(r, 11).font = { bold: true, color: { argb: C.red }, size: 10, name: "Calibri" };
        else if (prio === "MEDIUM") ws1.getCell(r, 11).font = { color: { argb: C.amber }, size: 10, name: "Calibri" };
      }

      // ═══ Sheet 2: SKU Summary ═══
      const ws2 = wb.addWorksheet("SKU Summary", { properties: { tabColor: { argb: C.emerald } } });
      const h2 = ["SKU", "Product Name", "Category", "Missing Platforms", "Missing Count", "Image", "Certificate", "Ready?", "Weight", "Selling Price (INR)", "Stock Location", "HSN Code", "eBay Description"];
      ws2.addRow(h2); hdrStyle(ws2, h2.length);

      for (const item of opportunityItems) {
        const b = item.base;
        const ready = isReady(b);
        const missing = MARKETPLACE_PLATFORMS.filter((p) => !item.platforms.has(p));
        ws2.addRow([
          b.sku || "", b.itemName || "", b.category || "",
          missing.join(", "), missing.length,
          ready.hasImage ? "✅" : "❌",
          ready.hasCert ? "✅" : "❌",
          ready.ready ? "Ready" : "Prep Needed",
          fmtFmt(b.weightValue || b.carats), fmtFmt(b.sellingPrice),
          b.stockLocation || "—",
          b.hsnCode || "—",
          cleanDesc(b.description || b.productDescription),
        ]);
      }
      autoW(ws2);
      for (let r = 2; r <= ws2.rowCount; r++) ws2.getCell(r, 10).numFmt = "₹ #,##0";

      // ═══ Sheet 3: Needs Preparation ═══
      if (needsPrepItems.length > 0) {
        const ws3 = wb.addWorksheet("Needs Preparation", { properties: { tabColor: { argb: C.red } } });
        const h3 = ["SKU", "Product Name", "Category", "Missing Image", "Missing Certificate", "Missing Platforms", "eBay Description"];
        ws3.addRow(h3); hdrStyle(ws3, h3.length);
        for (const item of needsPrepItems) {
          const b = item.base;
          const ready = isReady(b);
          ws3.addRow([
            b.sku || "", b.itemName || "", b.category || "",
            ready.hasImage ? "✅" : "❌ Needs Image",
            ready.hasCert ? "✅" : "❌ Needs Certificate",
            MARKETPLACE_PLATFORMS.join(", "),
            cleanDesc(b.description || b.productDescription),
          ]);
        }
        autoW(ws3);
      }

      // ═══ Sheets 4-6: Per-platform missing ═══
      for (const mp of MARKETPLACE_PLATFORMS) {
        const platItems = opportunityItems.filter((item) => !item.platforms.has(mp));
        if (!platItems.length) continue;
        const ws = wb.addWorksheet(mp, { properties: { tabColor: { argb: mp === "EBAY" ? C.blue : mp === "ETSY" ? C.amber : C.emerald } } });
        const h = ["SKU", "Product Name", "Category", "Image", "Certificate", "Ready?", "Weight", "Selling Price (INR)", "Priority", "Stock Location", "eBay Description"];
        ws.addRow(h); hdrStyle(ws, h.length);
        for (const item of platItems) {
          const b = item.base;
          const ready = isReady(b);
          ws.addRow([
            b.sku || "", b.itemName || "", b.category || "",
            ready.hasImage ? "✅" : "❌", ready.hasCert ? "✅" : "❌",
            ready.ready ? "Ready" : "Prep Needed",
            fmtFmt(b.weightValue || b.carats), fmtFmt(b.sellingPrice),
            item.platforms.size >= 2 ? "HIGH" : "MEDIUM",
            b.stockLocation || "—",
            cleanDesc(b.description || b.productDescription),
          ]);
        }
        autoW(ws);
        for (let r = 2; r <= ws.rowCount; r++) ws.getCell(r, 8).numFmt = "₹ #,##0";
      }
    } else {
      // ═══ Coverage Report (simplified) ═══
      const covItems = marketplace && marketplace !== "ALL"
        ? allItems.filter((item) => item.platforms.has(normalizePlatform(marketplace) || ""))
        : allItems;

      const ws = wb.addWorksheet("Coverage Report", { properties: { tabColor: { argb: C.blue } } });
      const h = ["SKU", "Product Name", "Category", "eBay", "Etsy", "Amazon", "Coverage", "Missing", "Image", "Certificate"];
      ws.addRow(h); hdrStyle(ws, h.length);
      for (const item of covItems) {
        const b = item.base;
        const ready = isReady(b);
        ws.addRow([
          b.sku || "", b.itemName || "", b.category || "",
          item.platforms.has("EBAY") ? "✅" : "—",
          item.platforms.has("ETSY") ? "✅" : "—",
          item.platforms.has("AMAZON") ? "✅" : "—",
          `${item.platforms.size}/3`,
          MARKETPLACE_PLATFORMS.filter((p) => !item.platforms.has(p)).join(", ") || "All Covered",
          ready.hasImage ? "✅" : "❌",
          ready.hasCert ? "✅" : "❌",
        ]);
      }
      autoW(ws);
    }

    // ── Write ──
    const buf = await wb.xlsx.writeBuffer();
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="marketplace-${report}-report.xlsx"`,
      },
    });
  } catch (error) {
    console.error("[Marketplace Export] Error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
