import { NextRequest, NextResponse } from "next/server";
import { ensureMarketplaceMetricsSchema } from "@/lib/prisma";
import { requireExtensionApiToken } from "@/lib/extension-api-auth";
import { listOpportunities } from "@/lib/marketplace-metrics";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const unauthorized = requireExtensionApiToken(request);
  if (unauthorized) return unauthorized;

  await ensureMarketplaceMetricsSchema();

  const { searchParams } = new URL(request.url);
  const marketplace = searchParams.get("marketplace") || undefined;
  const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit")) || 200));

  try {
    const opportunities = await listOpportunities({
      marketplace,
      limit,
    });
    return NextResponse.json({
      opportunities,
      count: opportunities.length,
      marketplace: marketplace || "ALL"
    });
  } catch (error) {
    console.error("opportunities fetch failed", error);
    return NextResponse.json(
      { message: "Internal error fetching opportunities" },
      { status: 500 }
    );
  }
}
