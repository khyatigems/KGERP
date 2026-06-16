import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 30;

export async function GET(req: NextRequest) {
  try {
    const usdRate = parseFloat(req.nextUrl.searchParams.get("usdRate") || "86");
    const MARGIN_THRESHOLD = 1.00; // Critical below 100%
    const OPPORTUNITY_THRESHOLD = 0.50;

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        sku: string;
        itemName: string;
        platform: string;
        listedPrice: number;
        currency: string;
        sellingPrice: number;
        costPrice: number;
      }>
    >(`
      SELECT
        i."sku",
        i."itemName",
        l."platform",
        l."listedPrice",
        COALESCE(l."currency", 'USD') AS "currency",
        i."sellingPrice",
        i."costPrice"
      FROM "Listing" l
      JOIN "Inventory" i ON i."id" = l."inventoryId"
      WHERE UPPER(l."status") IN ('ACTIVE', 'LISTED')
    `);

    let priceAlertCount = 0;
    let lowMarginCount = 0;
    let revenueLeakage = 0;
    let opportunityCount = 0;

    for (const row of rows) {
      const listedPrice = Number(row.listedPrice) || 0;
      const currency = String(row.currency || "INR");
      let listedPriceInr = listedPrice;
      if (currency === "USD" || currency === "US") listedPriceInr = listedPrice * usdRate;
      else if (currency === "EUR") listedPriceInr = listedPrice * (usdRate * 1.08);
      const sellingPrice = Number(row.sellingPrice) || 0;
      const costPrice = Number(row.costPrice) || 0;
      const marginPct = costPrice > 0 ? (listedPriceInr - costPrice) / costPrice : 0;

      if (listedPriceInr < sellingPrice) {
        priceAlertCount++;
        revenueLeakage += sellingPrice - listedPriceInr;
      }

      if (marginPct < MARGIN_THRESHOLD) {
        lowMarginCount++;
      }

      if (listedPriceInr > sellingPrice * (1 + OPPORTUNITY_THRESHOLD)) {
        opportunityCount++;
      }
    }

    return NextResponse.json({
      priceAlertCount,
      lowMarginCount,
      revenueLeakage: Math.round(revenueLeakage),
      opportunityCount,
      marginThreshold: 100,
      opportunityThreshold: 50,
      totalListings: rows.length,
    });
  } catch (error) {
    console.error("[marketplace/health] Error:", error);
    return NextResponse.json({
      priceAlertCount: 0,
      lowMarginCount: 0,
      revenueLeakage: 0,
      opportunityCount: 0,
      marginThreshold: 0.05,
      opportunityThreshold: 0.15,
      totalListings: 0,
    });
  }
}
