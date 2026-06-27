import { NextRequest, NextResponse } from "next/server";
import { ensureMarketplaceMetricsSchema, prisma } from "@/lib/prisma";
import { requireExtensionApiToken } from "@/lib/extension-api-auth";
import { logActivity } from "@/lib/activity-logger";
import { syncMetricsBatch, normalizeMarketplace } from "@/lib/marketplace-metrics";

export const dynamic = "force-dynamic";

const ALLOWED_SOURCES = new Set([
  "active_page",
  "ended_page",
  "scheduled_page",
  "stats_page",
  "mapping_sync",
]);

type SyncRequest = {
  marketplace?: string;
  source?: string;
  rows?: Array<{
    externalId?: string;
    sku?: string;
    views?: number;
    watches?: number;
    favourites?: number;
    orders?: number;
    revenue?: number;
    currency?: string;
  }>;
};

export async function POST(request: NextRequest) {
  const unauthorized = requireExtensionApiToken(request);
  if (unauthorized) return unauthorized;

  let body: SyncRequest;
  try {
    body = (await request.json()) as SyncRequest;
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const marketplace = normalizeMarketplace(body.marketplace);
  if (!marketplace) {
    return NextResponse.json({ message: "marketplace is required" }, { status: 400 });
  }

  const source = String(body.source || "");
  if (!ALLOWED_SOURCES.has(source)) {
    return NextResponse.json(
      { message: `source must be one of: ${Array.from(ALLOWED_SOURCES).join(", ")}` },
      { status: 400 }
    );
  }

  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (!rows.length) {
    return NextResponse.json({ upserted: 0, skipped: 0, errors: [], message: "No rows to sync" });
  }

  if (rows.length > 500) {
    return NextResponse.json(
      { message: "Batch too large; max 500 rows per request" },
      { status: 400 }
    );
  }

  await ensureMarketplaceMetricsSchema();

  try {
    const result = await syncMetricsBatch({
      marketplace,
      source: source as
        | "active_page"
        | "ended_page"
        | "scheduled_page"
        | "stats_page"
        | "mapping_sync",
      rows,
    });

    await logActivity({
      actionType: "METRICS_SYNC",
      entityType: "ListingMetricSnapshot",
      details: {
        marketplace,
        source,
        requested: rows.length,
        upserted: result.upserted,
        skipped: result.skipped,
        errors: result.errors.length,
      },
    }).catch(() => null);

    return NextResponse.json({
      upserted: result.upserted,
      skipped: result.skipped,
      errors: result.errors,
    });
  } catch (error) {
    console.error("metrics sync failed", error);
    return NextResponse.json(
      { message: "Internal error during metrics sync", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
