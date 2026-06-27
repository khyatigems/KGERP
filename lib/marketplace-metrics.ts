import { prisma } from "@/lib/prisma";

const MARKETPLACE_NORMALIZE: Record<string, string> = {
  ebay: "EBAY",
  etsy: "ETSY",
  amazon: "AMAZON",
};

export function normalizeMarketplace(value: string | null | undefined): string {
  const raw = String(value || "").trim().toLowerCase();
  return MARKETPLACE_NORMALIZE[raw] || raw.toUpperCase();
}

type MetricRow = {
  externalId: string;
  sku?: string | null;
  views?: number;
  watches?: number;
  favourites?: number;
  orders?: number;
  revenue?: number;
  currency?: string;
};

type SyncResult = {
  upserted: number;
  skipped: number;
  errors: Array<{ externalId: string; reason: string }>;
};

export type SnapshotSource =
  | "active_page"
  | "ended_page"
  | "scheduled_page"
  | "stats_page"
  | "mapping_sync";

function toInt(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : fallback;
}

function toFloat(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, n) : fallback;
}

export async function syncMetricsBatch(input: {
  marketplace: string;
  source: SnapshotSource;
  rows: MetricRow[];
}): Promise<SyncResult> {
  const marketplace = normalizeMarketplace(input.marketplace);
  if (!marketplace) {
    return { upserted: 0, skipped: 0, errors: [{ externalId: "*", reason: "Invalid marketplace" }] };
  }

  const cleaned: Array<{
    externalId: string;
    sku: string;
    views: number;
    watches: number;
    favourites: number;
    orders: number;
    revenue: number;
    currency: string;
  }> = [];

  const errors: Array<{ externalId: string; reason: string }> = [];

  for (const row of input.rows || []) {
    const externalId = String(row.externalId || "").trim();
    const sku = String(row.sku || "").trim();
    if (!externalId || !sku) {
      if (!externalId) errors.push({ externalId: "*", reason: "Missing externalId" });
      else if (!sku) errors.push({ externalId, reason: "Missing sku" });
      continue;
    }
    cleaned.push({
      externalId,
      sku,
      views: toInt(row.views),
      watches: toInt(row.watches),
      favourites: toInt(row.favourites),
      orders: toInt(row.orders),
      revenue: toFloat(row.revenue),
      currency: String(row.currency || "USD").toUpperCase(),
    });
  }

  if (!cleaned.length) {
    return { upserted: 0, skipped: 0, errors };
  }

  const skus = Array.from(new Set(cleaned.map((r) => r.sku)));
  const inventoryRows = await prisma.inventory.findMany({
    where: { sku: { in: skus } },
    select: { id: true, sku: true, status: true },
  });
  const skuToInventory = new Map(inventoryRows.map((i) => [i.sku, i]));

  const upserts: Array<{
    inventoryId: string;
    marketplace: string;
    externalId: string;
    capturedAt: Date;
    views: number;
    watches: number;
    favourites: number;
    orders: number;
    revenue: number;
    currency: string;
    rawPayload: string;
    source: string;
  }> = [];

  let skipped = 0;
  for (const row of cleaned) {
    const inv = skuToInventory.get(row.sku);
    if (!inv) {
      errors.push({ externalId: row.externalId, reason: `Unknown SKU: ${row.sku}` });
      skipped++;
      continue;
    }
    upserts.push({
      inventoryId: inv.id,
      marketplace,
      externalId: row.externalId,
      capturedAt: new Date(),
      views: row.views,
      watches: row.watches,
      favourites: row.favourites,
      orders: row.orders,
      revenue: row.revenue,
      currency: row.currency,
      rawPayload: JSON.stringify(row),
      source: input.source,
    });
  }

  if (upserts.length) {
    await prisma.listingMetricSnapshot.createMany({
      data: upserts,
    });
  }

  const inventoryIds = Array.from(new Set(upserts.map((u) => u.inventoryId)));

  if (inventoryIds.length) {
    try {
      const cacheResult = await syncOpportunityCache({ inventoryIds, marketplace });
      if (cacheResult.errors.length) {
        errors.push(...cacheResult.errors.map(e => ({
          externalId: e.inventoryId,
          reason: e.reason
        })));
      }
    } catch (e) {
      console.error("[syncMetricsBatch] syncOpportunityCache failed:", e);
      errors.push({
        externalId: "*",
        reason: `recompute batch failed: ${e instanceof Error ? e.message : String(e)}`
      });
    }
  }

  return { upserted: upserts.length, skipped, errors };
}

export async function syncOpportunityCache(input: {
  inventoryIds: string[];
  marketplace: string;
}): Promise<{ updated: number; errors: Array<{ inventoryId: string; reason: string }> }> {
  if (!input.inventoryIds.length) return { updated: 0, errors: [] };

  const inventoryIds = Array.from(new Set(input.inventoryIds));
  const errors: Array<{ inventoryId: string; reason: string }> = [];

  // Get the latest snapshot per inventory (using raw SQL for proper GROUP BY support)
  const latestSnapshots = await prisma.$queryRawUnsafe<Array<{
    id: string;
    inventoryId: string;
    marketplace: string;
    externalId: string | null;
    views: number;
    watches: number;
    favourites: number;
    orders: number;
    revenue: number;
    currency: string;
    capturedAt: Date;
  }>>(
    `SELECT s1.* FROM "ListingMetricSnapshot" s1
     INNER JOIN (
       SELECT "inventoryId", MAX("capturedAt") as "maxCaptured"
       FROM "ListingMetricSnapshot"
       WHERE "marketplace" = ?
         AND "inventoryId" IN (${inventoryIds.map(() => "?").join(",")})
       GROUP BY "inventoryId"
     ) s2 ON s1."inventoryId" = s2."inventoryId" AND s1."capturedAt" = s2."maxCaptured"
     WHERE s1."marketplace" = ?`,
    input.marketplace,
    ...inventoryIds,
    input.marketplace
  );
  if (!latestSnapshots.length) return { updated: 0, errors: [] };

  // Build rows with raw latest values (no score calculation)
  const now = new Date();
  const rows = latestSnapshots.map((snap) => ({
    inventoryId: snap.inventoryId,
    marketplace: input.marketplace,
    externalId: snap.externalId ?? "",
    currentViews: snap.views,
    currentWatches: snap.watches,
    currentFavourites: snap.favourites,
    currentOrders: snap.orders,
    currentRevenue: snap.revenue,
    currency: snap.currency,
    lastSyncedAt: snap.capturedAt,
    updatedAt: now
  }));

  // Bulk upsert via single SQL statement (1 round-trip regardless of batch size)
  if (rows.length) {
    const placeholders = rows.map(() =>
      "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).join(", ");
    const params: Array<string | number | Date> = [];
    for (const row of rows) {
      params.push(
        crypto.randomUUID(),
        row.inventoryId,
        row.marketplace,
        row.externalId,
        row.currentViews,
        row.currentWatches,
        row.currentFavourites,
        row.currentOrders,
        row.currentRevenue,
        row.currency,
        row.lastSyncedAt,
        row.updatedAt
      );
    }
    const sql = `
      INSERT INTO "ListingOpportunity" (
        "id", "inventoryId", "marketplace", "externalId",
        "currentViews", "currentWatches", "currentFavourites",
        "currentOrders", "currentRevenue", "currency",
        "lastSyncedAt", "updatedAt"
      ) VALUES ${placeholders}
      ON CONFLICT("inventoryId") DO UPDATE SET
        "marketplace" = excluded."marketplace",
        "externalId" = excluded."externalId",
        "currentViews" = excluded."currentViews",
        "currentWatches" = excluded."currentWatches",
        "currentFavourites" = excluded."currentFavourites",
        "currentOrders" = excluded."currentOrders",
        "currentRevenue" = excluded."currentRevenue",
        "currency" = excluded."currency",
        "lastSyncedAt" = excluded."lastSyncedAt",
        "updatedAt" = excluded."updatedAt"
    `;
    await prisma.$executeRawUnsafe(sql, ...params);
  }

  return { updated: rows.length, errors };
}

export async function listOpportunities(input: {
  marketplace?: string;
  limit?: number;
}) {
  const where: {
    marketplace?: string;
  } = {};

  if (input.marketplace) where.marketplace = normalizeMarketplace(input.marketplace);

  const rows = await prisma.listingOpportunity.findMany({
    where,
    orderBy: [{ lastSyncedAt: "desc" }],
    take: input.limit ?? 500,
    include: {
      inventory: {
        select: {
          id: true,
          sku: true,
          itemName: true,
          sellingPrice: true,
          status: true,
          imageUrl: true,
        },
      },
    },
  });

  return rows.map((r) => ({
    inventoryId: r.inventoryId,
    sku: r.inventory.sku,
    itemName: r.inventory.itemName,
    sellingPrice: r.inventory.sellingPrice,
    inStock: r.inventory.status === "IN_STOCK",
    imageUrl: r.inventory.imageUrl,
    marketplace: r.marketplace,
    externalId: r.externalId,
    currentViews: r.currentViews,
    currentWatches: r.currentWatches,
    currentFavourites: r.currentFavourites,
    currentOrders: r.currentOrders,
    currentRevenue: r.currentRevenue,
    currency: r.currency,
    lastSyncedAt: r.lastSyncedAt?.toISOString() ?? null,
  }));
}
