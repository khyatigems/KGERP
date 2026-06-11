import { NextRequest, NextResponse } from "next/server";
import { getPriceSuggestions } from "@/lib/price-suggestion";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const categoryCodeId = searchParams.get("categoryCodeId") || undefined;
  const gemstoneCodeId = searchParams.get("gemstoneCodeId") || undefined;
  const vendorId = searchParams.get("vendorId") || undefined;
  const weightValue = parseFloat(searchParams.get("weightValue") || "0");
  const weightUnit = searchParams.get("weightUnit") || "cts";
  const pricingMode = (searchParams.get("pricingMode") || "PER_CARAT") as "PER_CARAT" | "PER_RATTI" | "FLAT";
  const debug = searchParams.get("debug") === "true";

  try {
    const result = await getPriceSuggestions({
      categoryCodeId,
      gemstoneCodeId,
      vendorId,
      weightValue,
      weightUnit,
      pricingMode,
    });

    if (debug) {
      const diagnostics: Record<string, unknown> = {
        params: { categoryCodeId, gemstoneCodeId, vendorId, weightValue, weightUnit, pricingMode },
        result,
      };

      try {
        const tableCount = await prisma.$queryRawUnsafe<Array<{ cnt: bigint }>>(
          `SELECT COUNT(*) as cnt FROM "Inventory"`
        );
        diagnostics.totalInventoryItems = Number(tableCount[0]?.cnt ?? 0);
      } catch (e) {
        diagnostics.tableCountError = e instanceof Error ? e.message : String(e);
      }

      try {
        const withRates = await prisma.$queryRawUnsafe<Array<{ cnt: bigint }>>(
          `SELECT COUNT(*) as cnt FROM "Inventory" WHERE "status" = 'IN_STOCK'`
        );
        diagnostics.inStockItems = Number(withRates[0]?.cnt ?? 0);
      } catch (e) {
        diagnostics.inStockError = e instanceof Error ? e.message : String(e);
      }

      if (categoryCodeId) {
        try {
          const matchingCategory = await prisma.$queryRawUnsafe<Array<{ cnt: bigint }>>(
            `SELECT COUNT(*) as cnt FROM "Inventory" WHERE "categoryCodeId" = ?`,
            categoryCodeId
          );
          diagnostics.itemsWithCategoryCodeId = Number(matchingCategory[0]?.cnt ?? 0);
        } catch (e) {
          diagnostics.categoryCodeIdError = e instanceof Error ? e.message : String(e);
        }
      }

      try {
        const withValidRates = await prisma.$queryRawUnsafe<Array<{ cnt: bigint }>>(
          `SELECT COUNT(*) as cnt FROM "Inventory" WHERE "status" = 'IN_STOCK' AND (("carats" > 0 AND "sellingRatePerCarat" > 0) OR ("pricingMode" IN ('FLAT', 'FIXED') AND "flatSellingPrice" > 0))`
        );
        diagnostics.inStockWithValidRates = Number(withValidRates[0]?.cnt ?? 0);
      } catch (e) {
        diagnostics.validRatesError = e instanceof Error ? e.message : String(e);
      }

      return NextResponse.json(diagnostics);
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[price-suggestion] API route error:", err);
    return NextResponse.json({
      suggestedSellingRate: null,
      suggestedSellingPrice: null,
      suggestedPurchaseRate: null,
      confidence: 0,
      sampleCount: 0,
      minRate: null,
      maxRate: null,
      matchLevel: "none",
    });
  }
}
