import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-logger";

export const MARKETPLACE_PLATFORMS = ["EBAY", "ETSY", "AMAZON"] as const;
export const ACTIVE_LISTING_STATUSES = ["ACTIVE", "LISTED"] as const;
export const MARKETPLACE_EVENT_MODULE = "MARKETPLACE";

export type MarketplacePlatform = (typeof MARKETPLACE_PLATFORMS)[number];
export type MarketplaceConflictStatus = "Pending" | "Reviewed" | "Resolved";

export type MarketplaceConflictRow = {
  id: string;
  inventoryId: string;
  sku: string;
  productName: string;
  soldDate: string | null;
  currentQuantity: number;
  activePlatforms: string;
  conflictStatus: MarketplaceConflictStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionNote: string | null;
};

export type MarketplaceTimelineRow = {
  id: string;
  actionType: string;
  userName: string | null;
  source: string | null;
  details: string | null;
  entityIdentifier: string | null;
  createdAt: Date;
};

export type MarketplacePortfolioRow = {
  inventoryId: string;
  sku: string;
  productName: string;
  category: string | null;
  inventoryStatus: string;
  pieces: number;
  createdAt: string;
  platforms: MarketplacePlatform[];
  urls: Partial<Record<MarketplacePlatform, string[]>>;
  lastListedDates: Partial<Record<MarketplacePlatform, string>>;
  coveragePercent: number;
  missingPlatforms: MarketplacePlatform[];
  opportunityScore: number;
};

export type MarketplaceDashboardData = {
  totalListings: number;
  platformCounts: Record<MarketplacePlatform, number>;
  conflictCounts: Record<MarketplaceConflictStatus, number>;
  criticalConflicts: number;
  coverageSummary: Record<string, number>;
  recentActivity: MarketplaceTimelineRow[];
  rows: MarketplacePortfolioRow[];
};

export function normalizePlatform(value: string | null | undefined): MarketplacePlatform | null {
  const normalized = String(value || "").trim().toUpperCase();
  if ((MARKETPLACE_PLATFORMS as readonly string[]).includes(normalized)) return normalized as MarketplacePlatform;
  return null;
}

function toIsoDate(value: unknown): string {
  if (!value) return "";
  const d = new Date(value as string | number | Date);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

function parsePlatforms(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
  } catch {
    return [];
  }
}

export async function ensureMarketplaceControlCenterSchema(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MarketplaceConflict" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "inventoryId" TEXT NOT NULL,
      "sku" TEXT NOT NULL,
      "productName" TEXT NOT NULL,
      "soldDate" DATETIME,
      "currentQuantity" INTEGER NOT NULL DEFAULT 0,
      "activePlatforms" TEXT NOT NULL DEFAULT '[]',
      "conflictStatus" TEXT NOT NULL DEFAULT 'Pending',
      "resolvedAt" DATETIME,
      "resolvedBy" TEXT,
      "resolutionNote" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MarketplaceConflict_inventoryId_idx" ON "MarketplaceConflict"("inventoryId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MarketplaceConflict_sku_idx" ON "MarketplaceConflict"("sku");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MarketplaceConflict_status_idx" ON "MarketplaceConflict"("conflictStatus");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MarketplaceConflict_createdAt_idx" ON "MarketplaceConflict"("createdAt");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MarketplaceConflict_inventory_status_idx" ON "MarketplaceConflict"("inventoryId", "conflictStatus");`);

  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Listing_inventoryId_status_idx" ON "Listing"("inventoryId", "status");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Listing_platform_status_idx" ON "Listing"("platform", "status");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Listing_inventory_platform_idx" ON "Listing"("inventoryId", "platform");`);

  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ActivityLog_entityId_idx" ON "ActivityLog"("entityId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ActivityLog_actionType_idx" ON "ActivityLog"("actionType");`);
}

export async function logMarketplaceActivity(params: {
  entityType: string;
  entityId: string;
  entityIdentifier: string;
  actionType: string;
  details: string;
  userId?: string;
  userName?: string;
  source?: string;
  metadata?: Record<string, unknown>;
}) {
  await logActivity({
    module: MARKETPLACE_EVENT_MODULE,
    entityType: params.entityType,
    entityId: params.entityId,
    entityIdentifier: params.entityIdentifier,
    actionType: params.actionType,
    description: params.details,
    details: params.details,
    metadata: params.metadata,
    userId: params.userId,
    userName: params.userName,
    source: params.source || "SYSTEM",
  });
}

async function getActiveListingsForInventory(inventoryId: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{
    platform: string | null;
    listingUrl: string | null;
  }>>(
    `SELECT "platform", "listingUrl" FROM "Listing" WHERE "inventoryId" = ? AND UPPER("status") IN ('ACTIVE', 'LISTED') ORDER BY "createdAt" DESC`,
    inventoryId
  );

  return rows
    .map((row) => ({ platform: normalizePlatform(row.platform), listingUrl: row.listingUrl || null }))
    .filter((row): row is { platform: MarketplacePlatform; listingUrl: string | null } => Boolean(row.platform));
}

export async function triggerMarketplaceConflict(params: {
  inventoryId: string;
  status?: string | null;
  pieces?: number | null;
  userId?: string;
  userName?: string;
  source?: string;
}) {
  await ensureMarketplaceControlCenterSchema();

  const inventory = await prisma.inventory.findUnique({
    where: { id: params.inventoryId },
    select: { id: true, sku: true, itemName: true, status: true, pieces: true },
  });
  if (!inventory) return { created: false, conflict: null };

  const currentStatus = String(params.status || inventory.status || "").toUpperCase();
  const currentPieces = typeof params.pieces === "number" ? params.pieces : (inventory.pieces ?? 0);
  const shouldCheck = currentStatus === "SOLD" || currentStatus === "INACTIVE" || currentPieces === 0;
  if (!shouldCheck) return { created: false, conflict: null };

  const activeListings = await getActiveListingsForInventory(inventory.id);
  if (activeListings.length === 0) return { created: false, conflict: null };

  const activePlatforms = activeListings.map((row) => row.platform);
  const existing = await prisma.$queryRawUnsafe<Array<MarketplaceConflictRow>>(
    `SELECT * FROM "MarketplaceConflict" WHERE "inventoryId" = ? AND "conflictStatus" IN ('Pending', 'Reviewed') ORDER BY "createdAt" DESC LIMIT 1`,
    inventory.id
  );

  const payload = {
    inventoryId: inventory.id,
    sku: inventory.sku,
    productName: inventory.itemName,
    soldDate: new Date().toISOString(),
    currentQuantity: currentPieces,
    activePlatforms: JSON.stringify(activePlatforms),
    conflictStatus: "Pending" as MarketplaceConflictStatus,
  };

  if (existing.length > 0) {
    await prisma.$executeRawUnsafe(
      `UPDATE "MarketplaceConflict" SET "sku" = ?, "productName" = ?, "soldDate" = ?, "currentQuantity" = ?, "activePlatforms" = ?, "conflictStatus" = 'Pending', "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ?`,
      payload.sku,
      payload.productName,
      payload.soldDate,
      payload.currentQuantity,
      payload.activePlatforms,
      existing[0].id
    );

    await logMarketplaceActivity({
      entityType: "Inventory",
      entityId: inventory.id,
      entityIdentifier: inventory.sku,
      actionType: "CONFLICT_UPDATED",
      details: `Marketplace conflict updated for ${inventory.sku}`,
      userId: params.userId,
      userName: params.userName,
      source: params.source || "SYSTEM",
      metadata: { activePlatforms },
    });

    return { created: false, conflict: { ...existing[0], ...payload } };
  }

  const conflictId = crypto.randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "MarketplaceConflict" ("id", "inventoryId", "sku", "productName", "soldDate", "currentQuantity", "activePlatforms", "conflictStatus", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    conflictId,
    payload.inventoryId,
    payload.sku,
    payload.productName,
    payload.soldDate,
    payload.currentQuantity,
    payload.activePlatforms
  );

  await logMarketplaceActivity({
    entityType: "Inventory",
    entityId: inventory.id,
    entityIdentifier: inventory.sku,
    actionType: "CONFLICT_CREATED",
    details: `Marketplace conflict created for ${inventory.sku}`,
    userId: params.userId,
    userName: params.userName,
    source: params.source || "SYSTEM",
    metadata: { activePlatforms },
  });

  return { created: true, conflict: { id: conflictId, ...payload } };
}

export async function resolveMarketplaceConflict(params: {
  conflictId: string;
  userId?: string;
  userName?: string;
  note?: string;
}) {
  await ensureMarketplaceControlCenterSchema();

  const conflict = await prisma.$queryRawUnsafe<Array<MarketplaceConflictRow>>(
    `SELECT * FROM "MarketplaceConflict" WHERE "id" = ? LIMIT 1`,
    params.conflictId
  );
  if (conflict.length === 0) return { success: false, message: "Conflict not found" };

  await prisma.$executeRawUnsafe(
    `UPDATE "MarketplaceConflict" SET "conflictStatus" = 'Resolved', "resolvedAt" = CURRENT_TIMESTAMP, "resolvedBy" = ?, "resolutionNote" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ?`,
    params.userName || params.userId || "System",
    params.note || null,
    params.conflictId
  );

  await logMarketplaceActivity({
    entityType: "Inventory",
    entityId: conflict[0].inventoryId,
    entityIdentifier: conflict[0].sku,
    actionType: "CONFLICT_RESOLVED",
    details: `Marketplace conflict resolved for ${conflict[0].sku}`,
    userId: params.userId,
    userName: params.userName,
    source: "WEB",
    metadata: { conflictId: params.conflictId, note: params.note || null },
  });

  return { success: true };
}

export async function getMarketplaceConflictRows(options: {
  status?: string;
  sku?: string;
  page?: number;
  limit?: number;
} = {}) {
  await ensureMarketplaceControlCenterSchema();
  const page = Math.max(Number(options.page || 1), 1);
  const limit = Math.min(Math.max(Number(options.limit || 50), 1), 200);
  const skip = (page - 1) * limit;

  const conditions: string[] = [];
  const values: Array<string | number> = [];
  if (options.status && options.status !== "ALL") {
    conditions.push(`"conflictStatus" = ?`);
    values.push(options.status);
  }
  if (options.sku) {
    conditions.push(`("sku" LIKE ? OR "productName" LIKE ?)`);
    values.push(`%${options.sku}%`, `%${options.sku}%`);
  }

  const whereSql = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = await prisma.$queryRawUnsafe<Array<MarketplaceConflictRow>>(
    `SELECT * FROM "MarketplaceConflict" ${whereSql} ORDER BY "createdAt" DESC LIMIT ${limit} OFFSET ${skip}`,
    ...values
  );
  const countRows = await prisma.$queryRawUnsafe<Array<{ total: number }>>(
    `SELECT COUNT(*) AS total FROM "MarketplaceConflict" ${whereSql}`,
    ...values
  );

  return { rows, total: Number(countRows[0]?.total || 0), page, limit };
}

export async function getMarketplaceConflictListingMap(inventoryIds: string[]) {
  await ensureMarketplaceControlCenterSchema();
  if (inventoryIds.length === 0) return new Map<string, Record<MarketplacePlatform, string[]>>();

  const placeholders = inventoryIds.map(() => "?").join(", ");
  const rows = await prisma.$queryRawUnsafe<Array<{ inventoryId: string; platform: string | null; listingUrl: string | null }>>(
    `SELECT "inventoryId", "platform", "listingUrl" FROM "Listing" WHERE "inventoryId" IN (${placeholders}) AND UPPER("status") IN ('ACTIVE', 'LISTED') ORDER BY "createdAt" DESC`,
    ...inventoryIds
  );

  const map = new Map<string, Record<MarketplacePlatform, string[]>>();
  for (const row of rows) {
    const platform = normalizePlatform(row.platform);
    if (!platform) continue;
    if (!map.has(row.inventoryId)) map.set(row.inventoryId, { EBAY: [], ETSY: [], AMAZON: [] });
    if (row.listingUrl) map.get(row.inventoryId)![platform].push(row.listingUrl);
  }
  return map;
}

export async function getMarketplaceTimeline(entityId?: string, limit = 12) {
  await ensureMarketplaceControlCenterSchema();
  const rows = entityId
    ? await prisma.activityLog.findMany({
        where: { entityId, module: MARKETPLACE_EVENT_MODULE },
        orderBy: { createdAt: "desc" },
        take: limit,
      })
    : await prisma.activityLog.findMany({
        where: { module: MARKETPLACE_EVENT_MODULE },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

  return rows.map((row) => ({
    id: row.id,
    actionType: row.actionType || row.action || "UNKNOWN",
    userName: row.userName,
    source: row.source,
    details: row.description || row.details,
    entityIdentifier: row.entityIdentifier,
    createdAt: row.createdAt,
  })) as MarketplaceTimelineRow[];
}

export async function getMarketplaceDashboardData(options: {
  category?: string;
  marketplace?: string;
  from?: string;
  to?: string;
} = {}): Promise<MarketplaceDashboardData> {
  await ensureMarketplaceControlCenterSchema();

  const rows = await prisma.$queryRawUnsafe<Array<{
    inventoryId: string;
    sku: string;
    itemName: string;
    category: string | null;
    inventoryStatus: string;
    pieces: number | null;
    createdAt: string;
    platform: string | null;
    listingUrl: string | null;
    lastListedDate: string | null;
  }>>(
    `SELECT i."id" AS "inventoryId", i."sku", i."itemName", i."category", i."status" AS "inventoryStatus", i."pieces", i."createdAt", l."platform", l."listingUrl", l."createdAt" AS "lastListedDate"
     FROM "Inventory" i
     LEFT JOIN "Listing" l ON l."inventoryId" = i."id" AND UPPER(l."status") IN ('ACTIVE', 'LISTED')
     WHERE i."status" != 'SOLD'
     ORDER BY i."sku" ASC, l."platform" ASC, l."createdAt" DESC`
  );

  const grouped = new Map<string, MarketplacePortfolioRow>();
  for (const row of rows) {
    const existing = grouped.get(row.inventoryId) || {
      inventoryId: row.inventoryId,
      sku: row.sku,
      productName: row.itemName,
      category: row.category,
      inventoryStatus: row.inventoryStatus,
      pieces: Number(row.pieces || 0),
      createdAt: toIsoDate(row.createdAt),
      platforms: [],
      urls: { EBAY: [], ETSY: [], AMAZON: [] },
      lastListedDates: {},
      coveragePercent: 0,
      missingPlatforms: [],
      opportunityScore: 3,
    };

    const platform = normalizePlatform(row.platform);
    if (platform) {
      if (!existing.platforms.includes(platform)) existing.platforms.push(platform);
      if (row.listingUrl) existing.urls[platform] = [...(existing.urls[platform] || []), row.listingUrl];
      // First encounter holds the latest listedDate due to ORDER BY l."createdAt" DESC
      if (row.lastListedDate && !existing.lastListedDates[platform]) {
        existing.lastListedDates[platform] = toIsoDate(row.lastListedDate);
      }
    }

    grouped.set(row.inventoryId, existing);
  }

  const filtered = [...grouped.values()].filter((item) => {
    if (options.category && options.category !== "ALL" && item.category !== options.category) return false;
    if (options.marketplace && options.marketplace !== "ALL") {
      const marketplace = normalizePlatform(options.marketplace);
      if (!marketplace || !item.platforms.includes(marketplace)) return false;
    }
    if (options.from) {
      const from = new Date(`${options.from}T00:00:00.000Z`);
      if (!Number.isNaN(from.getTime()) && new Date(item.createdAt) < from) return false;
    }
    if (options.to) {
      const to = new Date(`${options.to}T23:59:59.999Z`);
      if (!Number.isNaN(to.getTime()) && new Date(item.createdAt) > to) return false;
    }
    return true;
  });

  for (const item of filtered) {
    const activeSet = new Set(item.platforms);
    item.coveragePercent = Math.round((activeSet.size / MARKETPLACE_PLATFORMS.length) * 100);
    item.missingPlatforms = MARKETPLACE_PLATFORMS.filter((platform) => !activeSet.has(platform));
    item.opportunityScore = item.missingPlatforms.length;
    item.platforms.sort();
  }

  const totalListings = filtered.reduce(
    (sum, item) => sum + MARKETPLACE_PLATFORMS.reduce((platformSum, platform) => platformSum + (item.urls[platform]?.length || 0), 0),
    0
  );
  const platformCounts = MARKETPLACE_PLATFORMS.reduce((acc, platform) => {
    acc[platform] = filtered.reduce((sum, item) => sum + (item.urls[platform]?.length || 0), 0);
    return acc;
  }, {} as Record<MarketplacePlatform, number>);

  const conflictRows = await prisma.$queryRawUnsafe<Array<{ conflictStatus: string; total: number }>>(
    `SELECT "conflictStatus", COUNT(*) AS total FROM "MarketplaceConflict" GROUP BY "conflictStatus"`
  );
  const conflictCounts: Record<MarketplaceConflictStatus, number> = { Pending: 0, Reviewed: 0, Resolved: 0 };
  for (const row of conflictRows) {
    if (row.conflictStatus === "Pending" || row.conflictStatus === "Reviewed" || row.conflictStatus === "Resolved") {
      conflictCounts[row.conflictStatus] = Number(row.total || 0);
    }
  }

  const criticalRows = await prisma.$queryRawUnsafe<Array<{ conflictStatus: string; activePlatforms: string | null; currentQuantity: number }>>(
    `SELECT "conflictStatus", "activePlatforms", "currentQuantity" FROM "MarketplaceConflict"`
  );
  const criticalConflicts = criticalRows.filter((row) => {
    if (row.conflictStatus !== "Pending") return false;
    const active = parsePlatforms(row.activePlatforms);
    return active.length > 1 || Number(row.currentQuantity || 0) === 0;
  }).length;

  const coverageSummary: Record<string, number> = {
    "eBayOnly": 0,
    "etsyOnly": 0,
    "amazonOnly": 0,
    "ebayEtsy": 0,
    "ebayAmazon": 0,
    "etsyAmazon": 0,
    "allPlatforms": 0,
  };

  for (const item of filtered) {
    const key = item.platforms.slice().sort().join("+");
    if (key === "EBAY") coverageSummary.eBayOnly += 1;
    else if (key === "ETSY") coverageSummary.etsyOnly += 1;
    else if (key === "AMAZON") coverageSummary.amazonOnly += 1;
    else if (key === "EBAY+ETSY") coverageSummary.ebayEtsy += 1;
    else if (key === "AMAZON+EBAY") coverageSummary.ebayAmazon += 1;
    else if (key === "AMAZON+ETSY") coverageSummary.etsyAmazon += 1;
    else if (key === "AMAZON+EBAY+ETSY") coverageSummary.allPlatforms += 1;
  }

  const recentActivity = await getMarketplaceTimeline(undefined, 10);
  return { totalListings, platformCounts, conflictCounts, criticalConflicts, coverageSummary, recentActivity, rows: filtered };
}
