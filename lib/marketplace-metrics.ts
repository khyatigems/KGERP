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
      await recomputeOpportunityBatch({ inventoryIds, marketplace });
    } catch (e) {
      errors.push({
        externalId: "*",
        reason: `recompute batch failed: ${e instanceof Error ? e.message : String(e)}`
      });
    }
  }

  return { upserted: upserts.length, skipped, errors };
}

async function platformMaxInWindowBulk(marketplace: string): Promise<{ maxViews: number; maxWatches: number }> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const result = await prisma.listingMetricSnapshot.groupBy({
    by: ["marketplace"],
    where: { marketplace, capturedAt: { gte: since } },
    _max: { views: true, watches: true }
  });
  const row = result.find((r) => r.marketplace === marketplace);
  return {
    maxViews: row?._max.views ?? 0,
    maxWatches: row?._max.watches ?? 0
  };
}

export async function recomputeOpportunityBatch(input: {
  inventoryIds: string[];
  marketplace: string;
}): Promise<{ updated: number; errors: Array<{ inventoryId: string; reason: string }> }> {
  if (!input.inventoryIds.length) return { updated: 0, errors: [] };

  const inventoryIds = Array.from(new Set(input.inventoryIds));
  const errors: Array<{ inventoryId: string; reason: string }> = [];

  // Query 1: get the latest snapshot per inventory (uses capturedAt index)
  const latestSnapshots = await prisma.listingMetricSnapshot.findMany({
    where: {
      inventoryId: { in: inventoryIds },
      marketplace: input.marketplace
    },
    orderBy: { capturedAt: "desc" },
    distinct: ["inventoryId"]
  });
  if (!latestSnapshots.length) return { updated: 0, errors: [] };

  const foundInventoryIds = Array.from(new Set(latestSnapshots.map((s) => s.inventoryId)));
  const priorStart = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const priorEnd = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Queries 2-5: run all independent lookups in parallel
  const [inventories, activeListings, platformMax, priorRows] = await Promise.all([
    prisma.inventory.findMany({
      where: { id: { in: foundInventoryIds } },
      select: { id: true, status: true }
    }),
    prisma.listing.findMany({
      where: {
        inventoryId: { in: foundInventoryIds },
        platform: input.marketplace,
        status: { in: ["ACTIVE", "LISTED", "active", "listed"] }
      },
      select: { inventoryId: true }
    }),
    platformMaxInWindowBulk(input.marketplace),
    prisma.listingMetricSnapshot.groupBy({
      by: ["inventoryId"],
      where: {
        inventoryId: { in: foundInventoryIds },
        marketplace: input.marketplace,
        capturedAt: { gte: priorStart, lt: priorEnd }
      },
      _avg: { views: true, watches: true }
    })
  ]);

  const statusById = new Map(inventories.map((i) => [i.id, i.status]));
  const listedSet = new Set(activeListings.map((l) => l.inventoryId));
  const priorById = new Map(priorRows.map((p) => [p.inventoryId, p]));

  // Compute scores in memory
  const now = new Date();
  const rows: Array<{
    inventoryId: string;
    marketplace: string;
    externalId: string;
    currentViews: number;
    currentWatches: number;
    currentFavourites: number;
    viewsDelta7d: number;
    watchesDelta7d: number;
    trendScore: number;
    isListed: boolean;
    isInStock: boolean;
    lastSnapshotAt: Date;
    updatedAt: Date;
  }> = [];

  for (const snap of latestSnapshots) {
    const invStatus = statusById.get(snap.inventoryId);
    if (!invStatus) {
      errors.push({ inventoryId: snap.inventoryId, reason: "Inventory not found" });
      continue;
    }

    const prior = priorById.get(snap.inventoryId);
    const avgViews = prior?._avg.views ?? 0;
    const avgWatches = prior?._avg.watches ?? 0;
    const viewsDelta7d = Math.round(snap.views - avgViews);
    const watchesDelta7d = Math.round(snap.watches - avgWatches);

    const isListed = listedSet.has(snap.inventoryId);
    const isInStock = invStatus === "IN_STOCK";

    const demandScore = platformMax.maxViews > 0
      ? (snap.views / platformMax.maxViews) * 40
      : 0;
    const watchDemandScore = platformMax.maxWatches > 0
      ? (snap.watches / platformMax.maxWatches) * 10
      : 0;
    const priorFloor = Math.max(avgViews, 1);
    const trendRaw = (viewsDelta7d - avgViews) / priorFloor;
    const trendScore = Math.max(0, Math.min(100, trendRaw * 25 + 12.5));
    const supplyGap = isListed ? 0 : 30;
    const stockPenalty = isInStock ? 10 : -50;

    const raw = demandScore + watchDemandScore + trendScore + supplyGap + stockPenalty;
    const trendScoreFinal = Math.max(0, Math.min(100, raw));

    rows.push({
      inventoryId: snap.inventoryId,
      marketplace: input.marketplace,
      externalId: snap.externalId,
      currentViews: snap.views,
      currentWatches: snap.watches,
      currentFavourites: snap.favourites,
      viewsDelta7d,
      watchesDelta7d,
      trendScore: trendScoreFinal,
      isListed,
      isInStock,
      lastSnapshotAt: snap.capturedAt,
      updatedAt: now
    });
  }

  // Bulk upsert via single SQL statement (76+ rows in 1 round-trip)
  if (rows.length) {
    const placeholders = rows.map(() =>
      "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).join(", ");
    const params: Array<string | number | Date> = [];
    for (const row of rows) {
      params.push(
        crypto.randomUUID(),
        row.inventoryId,
        row.marketplace,
        row.externalId ?? "",
        row.currentViews,
        row.currentWatches,
        row.currentFavourites,
        row.viewsDelta7d,
        row.watchesDelta7d,
        row.trendScore,
        row.isListed ? 1 : 0,
        row.isInStock ? 1 : 0,
        row.lastSnapshotAt,
        row.updatedAt
      );
    }
    const sql = `
      INSERT INTO "ListingOpportunity" (
        "id", "inventoryId", "marketplace", "externalId",
        "currentViews", "currentWatches", "currentFavourites",
        "viewsDelta7d", "watchesDelta7d", "trendScore",
        "isListed", "isInStock",
        "lastSnapshotAt", "updatedAt"
      ) VALUES ${placeholders}
      ON CONFLICT("inventoryId") DO UPDATE SET
        "marketplace" = excluded."marketplace",
        "externalId" = excluded."externalId",
        "currentViews" = excluded."currentViews",
        "currentWatches" = excluded."currentWatches",
        "currentFavourites" = excluded."currentFavourites",
        "viewsDelta7d" = excluded."viewsDelta7d",
        "watchesDelta7d" = excluded."watchesDelta7d",
        "trendScore" = excluded."trendScore",
        "isListed" = excluded."isListed",
        "isInStock" = excluded."isInStock",
        "lastSnapshotAt" = excluded."lastSnapshotAt",
        "updatedAt" = excluded."updatedAt"
    `;
    await prisma.$executeRawUnsafe(sql, ...params);
  }

  return { updated: rows.length, errors };
}

async function platformMaxInWindow(marketplace: string): Promise<{ maxViews: number; maxWatches: number }> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const result = await prisma.listingMetricSnapshot.groupBy({
    by: ["marketplace"],
    where: { marketplace, capturedAt: { gte: since } },
    _max: { views: true, watches: true },
  });
  const row = result.find((r) => r.marketplace === marketplace);
  return {
    maxViews: row?._max.views ?? 0,
    maxWatches: row?._max.watches ?? 0,
  };
}

async function priorWindowAverages(input: {
  inventoryId: string;
  marketplace: string;
}): Promise<{ avgViews: number; avgWatches: number }> {
  const now = Date.now();
  const priorStart = new Date(now - 14 * 24 * 60 * 60 * 1000);
  const priorEnd = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const result = await prisma.listingMetricSnapshot.aggregate({
    where: {
      inventoryId: input.inventoryId,
      marketplace: input.marketplace,
      capturedAt: { gte: priorStart, lt: priorEnd },
    },
    _avg: { views: true, watches: true },
  });
  return {
    avgViews: result._avg.views ?? 0,
    avgWatches: result._avg.watches ?? 0,
  };
}

export async function recomputeOpportunity(input: {
  inventoryId: string;
  marketplace: string;
}): Promise<void> {
  const latest = await prisma.listingMetricSnapshot.findFirst({
    where: { inventoryId: input.inventoryId, marketplace: input.marketplace },
    orderBy: { capturedAt: "desc" },
  });
  if (!latest) return;

  const inventory = await prisma.inventory.findUnique({
    where: { id: input.inventoryId },
    select: { status: true, sku: true },
  });
  if (!inventory) return;

  const activeListing = await prisma.listing.findFirst({
    where: {
      inventoryId: input.inventoryId,
      platform: input.marketplace,
      status: { in: ["ACTIVE", "LISTED", "active", "listed"] },
    },
    select: { id: true },
  });
  const isListed = Boolean(activeListing);
  const isInStock = inventory.status === "IN_STOCK";

  const [prior, platformMax] = await Promise.all([
    priorWindowAverages(input),
    platformMaxInWindow(input.marketplace),
  ]);

  const viewsDelta7d = Math.round(latest.views - prior.avgViews);
  const watchesDelta7d = Math.round(latest.watches - prior.avgWatches);

  const demandScore = platformMax.maxViews > 0
    ? (latest.views / platformMax.maxViews) * 40
    : 0;
  const watchDemandScore = platformMax.maxWatches > 0
    ? (latest.watches / platformMax.maxWatches) * 10
    : 0;
  const priorFloor = Math.max(prior.avgViews, 1);
  const trendRaw = (viewsDelta7d - prior.avgViews) / priorFloor;
  const trendScore = Math.max(0, Math.min(100, trendRaw * 25 + 12.5));
  const supplyGap = isListed ? 0 : 30;
  const stockPenalty = isInStock ? 10 : -50;

  const raw = demandScore + watchDemandScore + trendScore + supplyGap + stockPenalty;
  const trendScoreFinal = Math.max(0, Math.min(100, raw));

  await prisma.listingOpportunity.upsert({
    where: { inventoryId: input.inventoryId },
    create: {
      inventoryId: input.inventoryId,
      marketplace: input.marketplace,
      externalId: latest.externalId,
      currentViews: latest.views,
      currentWatches: latest.watches,
      currentFavourites: latest.favourites,
      viewsDelta7d,
      watchesDelta7d,
      trendScore: trendScoreFinal,
      isListed,
      isInStock,
      lastSnapshotAt: latest.capturedAt,
      updatedAt: new Date(),
    },
    update: {
      marketplace: input.marketplace,
      externalId: latest.externalId,
      currentViews: latest.views,
      currentWatches: latest.watches,
      currentFavourites: latest.favourites,
      viewsDelta7d,
      watchesDelta7d,
      trendScore: trendScoreFinal,
      isListed,
      isInStock,
      lastSnapshotAt: latest.capturedAt,
      updatedAt: new Date(),
    },
  });
}

export async function listOpportunities(input: {
  marketplace?: string;
  tier?: "hot" | "warm" | "cold" | "all";
  inStockOnly?: boolean;
  limit?: number;
}) {
  const where: {
    marketplace?: string;
    isInStock?: boolean;
    trendScore?: { gte?: number; lt?: number };
  } = {};

  if (input.marketplace) where.marketplace = normalizeMarketplace(input.marketplace);
  if (input.inStockOnly) where.isInStock = true;

  if (input.tier === "hot") where.trendScore = { gte: 70 };
  else if (input.tier === "warm") where.trendScore = { gte: 40, lt: 70 };
  else if (input.tier === "cold") where.trendScore = { lt: 40 };

  const rows = await prisma.listingOpportunity.findMany({
    where,
    orderBy: [{ trendScore: "desc" }, { lastSnapshotAt: "desc" }],
    take: input.limit ?? 50,
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
    viewsDelta7d: r.viewsDelta7d,
    watchesDelta7d: r.watchesDelta7d,
    trendScore: r.trendScore,
    isListed: r.isListed,
    isInStock: r.isInStock,
    lastSnapshotAt: r.lastSnapshotAt?.toISOString() ?? null,
    tier:
      r.trendScore >= 70 ? "hot" : r.trendScore >= 40 ? "warm" : "cold",
  }));
}
