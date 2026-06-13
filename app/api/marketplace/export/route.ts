import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureMarketplaceControlCenterSchema, normalizePlatform } from "@/lib/marketplace-control-center";
import * as XLSX from "xlsx";


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

    if (category && category !== "ALL") {
      conditions.push(`i."category" = ?`);
      values.push(category);
    }

    if (from) {
      conditions.push(`i."createdAt" >= ?`);
      values.push(`${from}T00:00:00.000Z`);
    }
    if (to) {
      conditions.push(`i."createdAt" <= ?`);
      values.push(`${to}T23:59:59.999Z`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT
         i."id" AS "inventoryId",
         i."sku",
         i."itemName",
         i."internalName",
         i."category",
         i."gemType",
         i."stone_type" AS "stoneType",
         i."description",
         i."productDescription",
         i."pieces",
         i."weightValue",
         i."weightUnit",
         i."carats",
         i."weightRatti",
         i."weight_grams" AS "weightGrams",
         i."costPrice",
         i."sellingPrice",
         i."profit",
         i."status",
         i."shape",
         i."color",
         i."clarity",
         i."clarity_grade" AS "clarityGrade",
         i."cut",
         i."cut_grade" AS "cutGrade",
         i."polish",
         i."symmetry",
         i."fluorescence",
         i."measurements",
         i."dimensionsMm",
         i."tablePercent",
         i."depthPercent",
         i."ratio",
         i."origin",
         i."origin_country" AS "originCountry",
         i."treatment",
         i."transparency",
         i."braceletType",
         i."standardSize",
         i."beadSizeMm",
         i."bead_size_label" AS "beadSizeLabel",
         i."beadCount",
         i."pricingMode",
         i."sellingRatePerCarat",
         i."flatSellingPrice",
         i."imageUrl",
         i."createdAt",
         i."updatedAt",
         i."collectionCodeId",
         i."certificateNo",
         i."certification",
         i."lab",
         i."condition",
         l."platform",
         l."listingUrl",
         l."status" AS "listingStatus",
         cc."name" AS "collectionName"
       FROM "Inventory" i
       LEFT JOIN "Listing" l ON l."inventoryId" = i."id" AND UPPER(l."status") IN ('ACTIVE', 'LISTED')
       LEFT JOIN "CollectionCode" cc ON cc."id" = i."collectionCodeId"
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
      if (!grouped.has(invId)) {
        grouped.set(invId, {
          base: { ...row },
          platforms: new Set(),
        });
      }
      const group = grouped.get(invId)!;
      const platform = normalizePlatform(String(row.platform || ""));
      if (platform) {
        group.platforms.add(platform);
      }
    }

    const allItems = [...grouped.values()];
    const opportunityItems = allItems.filter((item) => item.platforms.size < 3);
    const normMarketplace = normalizePlatform(marketplace);
    const marketplaceFiltered = marketplace && marketplace !== "ALL" && normMarketplace
      ? allItems.filter((item) => item.platforms.has(normMarketplace))
      : allItems;

    const targetItems = report === "opportunity" ? opportunityItems : marketplaceFiltered;

    function buildRow(item: typeof allItems[0]): Record<string, unknown> {
      const b = item.base;
      const platformList = [...item.platforms].sort().join(", ");
      const missing = ["EBAY", "ETSY", "AMAZON"].filter((p) => !item.platforms.has(p)).join(", ");
      const fmtDate = (d: unknown) => d ? String(d).split(".")[0] : "";
      return {
        "SKU": b.sku || "",
        "Item Name": b.itemName || "",
        "Internal Name": b.internalName || "",
        "Category": b.category || "",
        "Gem Type": b.gemType || "",
        "Stone Type": b.stoneType || "",
        "Collection": b.collectionName || "",
        "eBay HTML Description": b.productDescription || b.description || "",
        "Weight Value": b.weightValue ?? "",
        "Weight Unit": b.weightUnit || "",
        "Carats": b.carats ?? "",
        "Weight (Ratti)": b.weightRatti ?? "",
        "Weight (Grams)": b.weightGrams ?? "",
        "Pieces/Qty": b.pieces ?? "",
        "Shape": b.shape || "",
        "Color": b.color || "",
        "Clarity": b.clarity || "",
        "Clarity Grade": b.clarityGrade || "",
        "Cut": b.cut || "",
        "Cut Grade": b.cutGrade || "",
        "Fluorescence": b.fluorescence || "",
        "Measurements": b.measurements || "",
        "Dimensions (mm)": b.dimensionsMm || "",
        "Transparency": b.transparency || "",
        "Origin": b.origin || "",
        "Origin Country": b.originCountry || "",
        "Treatment": b.treatment || "",
        "Bracelet Type": b.braceletType || "",
        "Standard Size": b.standardSize || "",
        "Bead Size (mm)": b.beadSizeMm ?? "",
        "Bead Size Label": b.beadSizeLabel || "",
        "Bead Count": b.beadCount ?? "",
        "Pricing Mode": b.pricingMode || "",
        "Selling Rate/Carat": b.sellingRatePerCarat ?? "",
        "Flat Selling Price": b.flatSellingPrice ?? "",
        "Status": b.status || "",
        "Image URL": b.imageUrl || "",
        "Created At": fmtDate(b.createdAt),
        "Updated At": fmtDate(b.updatedAt),
        "Current Marketplaces": platformList,
        "Missing Marketplaces": missing,
      };
    }

    const wb = XLSX.utils.book_new();

    const mainSheetName = report === "opportunity" ? "Opportunity Report" : "Coverage Report";
    const mainRows = targetItems.map((item) => buildRow(item));
    if (mainRows.length > 0) {
      const ws = XLSX.utils.json_to_sheet(mainRows);
      XLSX.utils.book_append_sheet(wb, ws, mainSheetName.substring(0, 31));
    }

    for (const platform of ["EBAY", "ETSY", "AMAZON"]) {
      const platRows = targetItems
        .filter((item) => !item.platforms.has(platform))
        .map((item) => buildRow(item));
      if (platRows.length === 0) continue;
      const ws = XLSX.utils.json_to_sheet(platRows);
      XLSX.utils.book_append_sheet(wb, ws, platform);
    }

    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });

    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="marketplace-${report}-report.xlsx"`,
      },
    });
  } catch (error) {
    console.error("[Marketplace Export] Error:", error);
    return NextResponse.json({ error: "Export failed", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
