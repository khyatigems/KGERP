import { NextRequest, NextResponse } from "next/server";
import { ensureMarketplaceMetricsSchema } from "@/lib/prisma";
import { requireExtensionApiToken } from "@/lib/extension-api-auth";
import { listOpportunities } from "@/lib/marketplace-metrics";

export const dynamic = "force-dynamic";

const ALLOWED_TIERS = new Set(["hot", "warm", "cold", "all"]);

export async function GET(request: NextRequest) {
  const unauthorized = requireExtensionApiToken(request);
  if (unauthorized) return unauthorized;

  await ensureMarketplaceMetricsSchema();

  const { searchParams } = new URL(request.url);
  const marketplace = searchParams.get("marketplace") || undefined;
  const tierRaw = searchParams.get("tier") || "all";
  const tier = ALLOWED_TIERS.has(tierRaw) ? (tierRaw as "hot" | "warm" | "cold" | "all") : "all";
  const inStockOnly = searchParams.get("inStockOnly") === "1" || searchParams.get("inStockOnly") === "true";
  const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit")) || 50));

  try {
    const opportunities = await listOpportunities({
      marketplace,
      tier,
      inStockOnly,
      limit,
    });
    return NextResponse.json({ opportunities, count: opportunities.length, tier, marketplace: marketplace || "ALL" });
  } catch (error) {
    console.error("opportunities fetch failed", error);
    return NextResponse.json(
      { message: "Internal error fetching opportunities" },
      { status: 500 }
    );
  }
}
