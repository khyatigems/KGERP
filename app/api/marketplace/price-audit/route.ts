import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const usdRate = parseFloat(req.nextUrl.searchParams.get("usdRate") || "87");

    const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT
         i."id" AS "inventoryId",
         i."sku",
         i."itemName",
         i."category",
         i."gemType",
         i."stone_type" AS "stoneType",
         i."carats",
         i."weightValue",
         i."weightUnit",
         i."weightRatti",
         i."weight_grams" AS "weightGrams",
         i."sellingPrice",
         i."costPrice",
         i."shape",
         i."color",
         i."clarity",
         i."clarity_grade" AS "clarityGrade",
         i."cut",
         i."origin",
         i."origin_country" AS "originCountry",
         i."treatment",
         i."certificateNo",
         i."condition",
         i."status",
         l."id" AS "listingId",
         l."platform",
         l."listedPrice",
         l."currency",
         l."listingUrl",
         l."listingRef",
         l."status" AS "listingStatus",
         l."listedDate"
       FROM "Listing" l
       INNER JOIN "Inventory" i ON i."id" = l."inventoryId"
       ORDER BY i."sku" ASC, l."platform" ASC`
    );

    const mapped = rows.map((r) => {
      const listedPrice = Number(r.listedPrice) || 0;
      const currency = String(r.currency || "INR");
      const sellingPrice = Number(r.sellingPrice) || 0;
      const costPrice = Number(r.costPrice) || 0;

      let listedPriceInr = listedPrice;
      if (currency === "USD" || currency === "US") {
        listedPriceInr = listedPrice * usdRate;
      } else if (currency === "EUR") {
        listedPriceInr = listedPrice * (usdRate * 1.08);
      }

      const vsSellingDiff = listedPriceInr - sellingPrice;
      const vsSellingMarginPct = sellingPrice > 0 ? ((vsSellingDiff / sellingPrice) * 100) : 0;

      const erpProfit = sellingPrice - costPrice;
      const erpMarginPct = costPrice > 0 ? ((erpProfit / costPrice) * 100) : 0;

      const marketplaceProfit = listedPriceInr - costPrice;
      const marketplaceMarginPct = costPrice > 0 ? ((marketplaceProfit / costPrice) * 100) : 0;

      return {
        sku: String(r.sku || ""),
        itemName: String(r.itemName || ""),
        category: String(r.category || ""),
        gemType: String(r.gemType || ""),
        stoneType: String(r.stoneType || ""),
        carats: r.carats ?? "",
        weightValue: r.weightValue ?? "",
        weightUnit: String(r.weightUnit || ""),
        weightRatti: r.weightRatti ?? "",
        weightGrams: r.weightGrams ?? "",
        shape: String(r.shape || ""),
        color: String(r.color || ""),
        clarity: String(r.clarity || ""),
        clarityGrade: String(r.clarityGrade || ""),
        cut: String(r.cut || ""),
        origin: String(r.origin || ""),
        originCountry: String(r.originCountry || ""),
        treatment: String(r.treatment || ""),
        certificateNo: String(r.certificateNo || ""),
        condition: String(r.condition || ""),
        inventoryStatus: String(r.status || ""),
        platform: String(r.platform || ""),
        listedPrice,
        currency,
        listedPriceInr: Math.round(listedPriceInr * 100) / 100,
        sellingPrice,
        costPrice,
        erpProfit: Math.round(erpProfit * 100) / 100,
        erpMarginPct: Math.round(erpMarginPct * 10) / 10,
        vsSellingDiff: Math.round(vsSellingDiff * 100) / 100,
        vsSellingMarginPct: Math.round(vsSellingMarginPct * 10) / 10,
        marketplaceProfit: Math.round(marketplaceProfit * 100) / 100,
        marketplaceMarginPct: Math.round(marketplaceMarginPct * 10) / 10,
        listingUrl: String(r.listingUrl || ""),
        listingRef: String(r.listingRef || ""),
        listingStatus: String(r.listingStatus || ""),
        listedDate: r.listedDate ? String(r.listedDate).split(".")[0] : "",
        inventoryId: String(r.inventoryId || ""),
      };
    });

    return NextResponse.json({ rows: mapped, usdRate });
  } catch (error) {
    console.error("[Price Audit API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch price audit data", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
