import { NextRequest, NextResponse } from "next/server";
import { ensureMarketplaceMetricsSchema, prisma } from "@/lib/prisma";
import { requireExtensionApiToken } from "@/lib/extension-api-auth";
import { normalizeMarketplace } from "@/lib/marketplace-metrics";

export const dynamic = "force-dynamic";

function tierForScore(score: number): "hot" | "warm" | "cold" {
  if (score >= 70) return "hot";
  if (score >= 40) return "warm";
  return "cold";
}

export async function GET(request: NextRequest) {
  const unauthorized = requireExtensionApiToken(request);
  if (unauthorized) return unauthorized;

  await ensureMarketplaceMetricsSchema();

  const { searchParams } = new URL(request.url);
  const skusParam = searchParams.get("skus") || "";
  const marketplaceParam = searchParams.get("marketplace") || undefined;

  const skus = skusParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 100);
  if (!skus.length) {
    return NextResponse.json({ scores: {} });
  }

  const inventory = await prisma.inventory.findMany({
    where: { sku: { in: skus } },
    select: { id: true, sku: true },
  });
  const skuToId = new Map(inventory.map((i) => [i.sku, i.id]));

  if (!skuToId.size) {
    return NextResponse.json({ scores: {} });
  }

  const inventoryIds = Array.from(skuToId.values());
  const marketplaceFilter = marketplaceParam ? normalizeMarketplace(marketplaceParam) : undefined;

  const opportunities = await prisma.listingOpportunity.findMany({
    where: {
      inventoryId: { in: inventoryIds },
      ...(marketplaceFilter ? { marketplace: marketplaceFilter } : {}),
    },
  });

  const scores: Record<string, { trendScore: number; tier: string; views: number; watches: number; favourites: number; delta7d: number }> = {};

  for (const sku of skus) {
    const inventoryId = skuToId.get(sku);
    if (!inventoryId) continue;
    const opp = opportunities.find((o) => o.inventoryId === inventoryId);
    if (!opp) continue;
    scores[sku] = {
      trendScore: opp.trendScore,
      tier: tierForScore(opp.trendScore),
      views: opp.currentViews,
      watches: opp.currentWatches,
      favourites: opp.currentFavourites,
      delta7d: opp.viewsDelta7d,
    };
  }

  return NextResponse.json({ scores });
}
