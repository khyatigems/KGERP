import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureMarketplaceControlCenterSchema, normalizePlatform, MARKETPLACE_PLATFORMS } from "@/lib/marketplace-control-center";
import { buildEbayHtmlDescription } from "@/lib/ebay-description";
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
              i."dimensionsMm", i."stockLocation", i."hsn_code" AS "hsnCode",
              i."shape", i."color", i."origin", i."treatment", i."transparency",
              i."braceletType", i."beadSizeMm", i."beadCount",
              i."standardSize",
              l."platform", l."listingUrl"
       FROM "Inventory" i
       LEFT JOIN "Listing" l ON l."inventoryId" = i."id" AND UPPER(l."status") IN ('ACTIVE', 'LISTED')
       ${whereClause}
       ORDER BY i."sku" ASC`,
      ...values
    );

    // Fetch eBay settings once for all description generation
    let categoryImageUrls: Record<string, string[]> = {};
    let categoryGemtypeImageUrls: Record<string, string[]> = {};
    let globalBannerImages: string[] | undefined;
    let ebaySettings: Record<string, unknown> = {};
    try {
      const rows = await prisma.$queryRawUnsafe<Array<{ globalBannerImages: string | null; categoryImageUrls: string | null; categoryGemtypeImageUrls: string | null; brandLogoUrl: string | null; companyName: string | null; tagline: string | null }>>(`SELECT * FROM "EbaySettings" LIMIT 1`);
      if (rows && rows.length > 0) {
        const row = rows[0];
        const parseJson = (v: string | null, fallback: any) => { if (!v) return fallback; try { return JSON.parse(v); } catch { return fallback; } };
        categoryImageUrls = parseJson(row.categoryImageUrls, {});
        categoryGemtypeImageUrls = parseJson(row.categoryGemtypeImageUrls, {});
        globalBannerImages = parseJson(row.globalBannerImages, []);
        ebaySettings = {
          companyName: row.companyName ?? "KhyatiGems",
          tagline: row.tagline ?? "Precious Gems for your Precious Ones",
          brandLogoUrl: row.brandLogoUrl ?? undefined,
          globalBannerImages: globalBannerImages ?? undefined,
          categoryImageUrls: categoryImageUrls ?? undefined,
          categoryGemtypeImageUrls: categoryGemtypeImageUrls ?? undefined,
        };
      }
    } catch { /* use defaults */ }

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

    // Fetch latest engagement metrics for every inventoryId in scope
    const allInventoryIds = Array.from(new Set(allItems.map((it) => String(it.base.inventoryId || ""))));
    const allMetrics = allInventoryIds.length
      ? await prisma.listingOpportunity.findMany({
          where: { inventoryId: { in: allInventoryIds } }
        })
      : [];
    const metricsByKey = new Map(
      allMetrics.map((m) => [`${m.inventoryId}|${m.marketplace}`, m])
    );
    const getMetric = (inventoryId: string, platform: string) =>
      metricsByKey.get(`${inventoryId}|${platform.toUpperCase()}`) || null;
    const fmtDate = (d: Date | string | null | undefined) =>
      d ? new Date(d).toLocaleString() : "Never";
    const num = (v: number | null | undefined) => (typeof v === "number" ? v : 0);

    // ── Helpers ──
    const getDesc = (b: Record<string, unknown>): string => {
      try {
        const html = buildEbayHtmlDescription(
          {
            sku: String(b.sku || ""),
            itemName: String(b.itemName || ""),
            category: String(b.category || ""),
            gemType: String(b.gemType || ""),
            color: String(b.color || ""),
            shape: String(b.shape || ""),
            weightValue: Number(b.weightValue) || null,
            weightUnit: String(b.weightUnit || "cts"),
            dimensionsMm: String(b.dimensionsMm || ""),
            treatment: String(b.treatment || ""),
            origin: String(b.origin || ""),
            transparency: String(b.transparency || ""),
            certification: String(b.certification || ""),
            braceletType: String(b.braceletType || ""),
            beadSizeMm: Number(b.beadSizeMm) || null,
            beadCount: Number(b.beadCount) || null,
            standardSize: String(b.standardSize || ""),
          },
          { settings: ebaySettings as Record<string, unknown> }
        );
        // Replace double-quotes with single-quotes (same fix as inventory export)
        // This prevents Excel/XLSX from CSV-encoding HTML double-quotes
        return typeof html === "string" ? html.replace(/"/g, "'") : html;
      } catch {
        return "";
      }
    };

    // Helper to set cell as text (prevents ExcelJS from corrupting HTML)
    const setText = (cell: ExcelJS.Cell) => {
      cell.numFmt = '@';
      cell.alignment = { wrapText: false, vertical: "top" };
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
      const h1 = ["SKU", "Product Name", "Category", "Platform to List", "Listed Elsewhere?", "Image", "Certificate", "Ready?", "Weight", "Selling Price (INR)", "Priority", "Stock Location", "HSN Code", "eBay Description"];
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
            getDesc(b),
          ]);
        }
      }
      autoW(ws1);
      for (let r = 2; r <= ws1.rowCount; r++) {
        ws1.getCell(r, 10).numFmt = "₹ #,##0";
        ws1.getCell(r, 14).numFmt = "@";
        const prio = ws1.getCell(r, 11).value?.toString();
        if (prio === "HIGH") ws1.getCell(r, 11).font = { bold: true, color: { argb: C.red }, size: 10, name: "Calibri" };
        else if (prio === "MEDIUM") ws1.getCell(r, 11).font = { color: { argb: C.amber }, size: 10, name: "Calibri" };
      }

      // ═══ Sheet 2: SKU Summary ═══
      const ws2 = wb.addWorksheet("SKU Summary", { properties: { tabColor: { argb: C.emerald } } });
      const h2 = [
        "SKU", "Product Name", "Category", "Listed On", "Missing Platforms", "Missing Count",
        "Image", "Certificate", "Ready?", "Weight", "Selling Price (INR)",
        "Stock Location", "HSN Code", "eBay Description",
        "eBay: Views", "eBay: Watchers", "eBay: Orders", "eBay: Revenue", "eBay: Last Synced",
        "Etsy: Views", "Etsy: Favourites", "Etsy: Orders", "Etsy: Revenue", "Etsy: Last Synced"
      ];
      ws2.addRow(h2); hdrStyle(ws2, h2.length);

      for (const item of opportunityItems) {
        const b = item.base;
        const ready = isReady(b);
        const missing = MARKETPLACE_PLATFORMS.filter((p) => !item.platforms.has(p));
        const invId = String(b.inventoryId || "");
        const eb = getMetric(invId, "EBAY");
        const et = getMetric(invId, "ETSY");
        ws2.addRow([
          b.sku || "", b.itemName || "", b.category || "",
          [...item.platforms].sort().join(", ") || "None",
          missing.join(", "), missing.length,
          ready.hasImage ? "✅" : "❌",
          ready.hasCert ? "✅" : "❌",
          ready.ready ? "Ready" : "Prep Needed",
          fmtFmt(b.weightValue || b.carats), fmtFmt(b.sellingPrice),
          b.stockLocation || "—",
          b.hsnCode || "—",
          getDesc(b),
          num(eb?.currentViews), num(eb?.currentWatches), num(eb?.currentOrders), num(eb?.currentRevenue), fmtDate(eb?.lastSyncedAt),
          num(et?.currentViews), num(et?.currentFavourites), num(et?.currentOrders), num(et?.currentRevenue), fmtDate(et?.lastSyncedAt),
        ]);
      }
      autoW(ws2);
      for (let r = 2; r <= ws2.rowCount; r++) {
        ws2.getCell(r, 11).numFmt = "₹ #,##0";
        ws2.getCell(r, 14).numFmt = "@";
        ws2.getCell(r, 19).numFmt = "₹ #,##0.00";
        ws2.getCell(r, 24).numFmt = "₹ #,##0.00";
      }

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
            getDesc(b),
          ]);
        }
        autoW(ws3);
        for (let r = 2; r <= ws3.rowCount; r++) ws3.getCell(r, 7).numFmt = "@";
      }

      // ═══ Sheets 4-6: Per-platform missing ═══
      for (const mp of MARKETPLACE_PLATFORMS) {
        const platItems = opportunityItems.filter((item) => !item.platforms.has(mp));
        if (!platItems.length) continue;
        const ws = wb.addWorksheet(mp, { properties: { tabColor: { argb: mp === "EBAY" ? C.blue : mp === "ETSY" ? C.amber : C.emerald } } });
        const h = [
          "SKU", "Product Name", "Category", "Listed On",
          "Image", "Certificate", "Ready?", "Weight", "Selling Price (INR)", "Priority",
          "Stock Location", "eBay Description",
          "eBay: Views", "eBay: Watchers", "eBay: Orders", "eBay: Revenue", "eBay: Last Synced",
          "Etsy: Views", "Etsy: Favourites", "Etsy: Orders", "Etsy: Revenue", "Etsy: Last Synced"
        ];
        ws.addRow(h); hdrStyle(ws, h.length);
        for (const item of platItems) {
          const b = item.base;
          const ready = isReady(b);
          const invId = String(b.inventoryId || "");
          const eb = getMetric(invId, "EBAY");
          const et = getMetric(invId, "ETSY");
          ws.addRow([
            b.sku || "", b.itemName || "", b.category || "",
            [...item.platforms].sort().join(", ") || "None",
            ready.hasImage ? "✅" : "❌", ready.hasCert ? "✅" : "❌",
            ready.ready ? "Ready" : "Prep Needed",
            fmtFmt(b.weightValue || b.carats), fmtFmt(b.sellingPrice),
            item.platforms.size >= 2 ? "HIGH" : "MEDIUM",
            b.stockLocation || "—",
            getDesc(b),
            num(eb?.currentViews), num(eb?.currentWatches), num(eb?.currentOrders), num(eb?.currentRevenue), fmtDate(eb?.lastSyncedAt),
            num(et?.currentViews), num(et?.currentFavourites), num(et?.currentOrders), num(et?.currentRevenue), fmtDate(et?.lastSyncedAt),
          ]);
        }
        autoW(ws);
        for (let r = 2; r <= ws.rowCount; r++) {
          ws.getCell(r, 9).numFmt = "₹ #,##0";
          ws.getCell(r, 12).numFmt = "@";
          ws.getCell(r, 17).numFmt = "₹ #,##0.00";
          ws.getCell(r, 22).numFmt = "₹ #,##0.00";
        }
      }

      // ═══ Engagement Report sheet (all listings + their latest metrics) ═══
      // Apply same filters as the main report
      const engagementFilterConditions: string[] = [];
      const engagementFilterValues: Array<string | number> = [];
      if (category && category !== "ALL") {
        engagementFilterConditions.push(`i."category" = ?`);
        engagementFilterValues.push(category);
      }
      if (from) {
        engagementFilterConditions.push(`l."createdAt" >= ?`);
        engagementFilterValues.push(`${from}T00:00:00.000Z`);
      }
      if (to) {
        engagementFilterConditions.push(`l."createdAt" <= ?`);
        engagementFilterValues.push(`${to}T23:59:59.999Z`);
      }
      if (marketplace && marketplace !== "ALL") {
        engagementFilterConditions.push(`UPPER(l."platform") = ?`);
        engagementFilterValues.push(marketplace.toUpperCase());
      }
      const engagementWhere = engagementFilterConditions.length
        ? `WHERE ${engagementFilterConditions.join(" AND ")}`
        : "";

      const allListings = await prisma.$queryRawUnsafe<Array<{
        id: string;
        inventoryId: string;
        platform: string;
        externalId: string | null;
        listedPrice: number;
        currency: string;
        status: string;
        sku: string;
        itemName: string;
      }>>(
        `SELECT l."id", l."inventoryId", l."platform", l."externalId", l."listedPrice", l."currency", l."status",
                i."sku", i."itemName"
         FROM "Listing" l
         INNER JOIN "Inventory" i ON i."id" = l."inventoryId"
         ${engagementWhere}
         ORDER BY i."sku" ASC, l."platform" ASC`,
        ...engagementFilterValues
      );

      // Fetch latest metrics for these listings
      const inventoryIds = Array.from(new Set(allListings.map((l) => l.inventoryId)));
      const latestMetrics = inventoryIds.length
        ? await prisma.listingOpportunity.findMany({
            where: { inventoryId: { in: inventoryIds } }
          })
        : [];
      const metricsByKey = new Map(
        latestMetrics.map((m) => [`${m.inventoryId}|${m.marketplace}`, m])
      );

      // Build "Engagement Report" sheet
      const wsEng = wb.addWorksheet("Engagement Report", { properties: { tabColor: { argb: C.emerald } } });
      const engHeaders = [
        "SKU", "Product Name", "Platform", "Listing ID", "Price", "Currency", "Status",
        "Views", "Watchers (eBay)", "Favourites (Etsy)", "Orders", "Revenue",
        "Last Synced"
      ];
      wsEng.addRow(engHeaders); hdrStyle(wsEng, engHeaders.length);
      for (const l of allListings) {
        const m = metricsByKey.get(`${l.inventoryId}|${l.platform.toUpperCase()}`);
        const lastSynced = m?.lastSyncedAt
          ? new Date(m.lastSyncedAt).toLocaleString()
          : "Never synced";
        wsEng.addRow([
          l.sku || "",
          l.itemName || "",
          l.platform,
          l.externalId || "",
          l.listedPrice,
          l.currency,
          l.status,
          m?.currentViews ?? 0,
          m?.currentWatches ?? 0,
          m?.currentFavourites ?? 0,
          m?.currentOrders ?? 0,
          m?.currentRevenue ?? 0,
          lastSynced
        ]);
      }
      // Auto-width and number formats
      wsEng.getColumn(1).width = 18;
      wsEng.getColumn(2).width = 40;
      wsEng.getColumn(3).width = 12;
      wsEng.getColumn(4).width = 20;
      wsEng.getColumn(13).width = 22;
      for (let r = 2; r <= wsEng.rowCount; r++) {
        wsEng.getCell(r, 5).numFmt = "₹ #,##0.00";
        wsEng.getCell(r, 12).numFmt = "₹ #,##0.00";
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
