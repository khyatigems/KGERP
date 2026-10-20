import type { PrismaClient } from "@prisma/client";
import { prisma, executeDdlBatch } from "@/lib/prisma";

// Additive mirror of 20261020000000_work_tracker. Match the ERP's runtime
// schema initialization convention; never replay unrelated historical migrations.
export const workTrackerDdl: string[] = [
  "CREATE TABLE IF NOT EXISTS \"WorkSession\" (\n    \"id\" TEXT NOT NULL PRIMARY KEY,\n    \"userId\" TEXT NOT NULL,\n    \"platform\" TEXT NOT NULL,\n    \"activityType\" TEXT NOT NULL,\n    \"description\" TEXT NOT NULL DEFAULT '',\n    \"sku\" TEXT,\n    \"marketplaceListingId\" TEXT,\n    \"startedAt\" DATETIME NOT NULL,\n    \"endedAt\" DATETIME,\n    \"durationSeconds\" INTEGER NOT NULL DEFAULT 0,\n    \"status\" TEXT NOT NULL DEFAULT 'RUNNING',\n    \"trackingSource\" TEXT NOT NULL DEFAULT 'MANUAL',\n    \"notes\" TEXT,\n    \"requestId\" TEXT NOT NULL,\n    \"activeUserId\" TEXT,\n    \"revision\" INTEGER NOT NULL DEFAULT 0,\n    \"createdAt\" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n    \"updatedAt\" DATETIME NOT NULL\n)",
  "CREATE TABLE IF NOT EXISTS \"WorkInterval\" (\n    \"id\" TEXT NOT NULL PRIMARY KEY,\n    \"sessionId\" TEXT NOT NULL,\n    \"startedAt\" DATETIME NOT NULL,\n    \"endedAt\" DATETIME\n)",
  "CREATE TABLE IF NOT EXISTS \"WorkTarget\" (\n    \"id\" TEXT NOT NULL PRIMARY KEY,\n    \"userId\" TEXT NOT NULL,\n    \"platform\" TEXT NOT NULL,\n    \"period\" TEXT NOT NULL,\n    \"targetMinutes\" INTEGER NOT NULL,\n    \"createdAt\" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n    \"updatedAt\" DATETIME NOT NULL\n)",
  "CREATE TABLE IF NOT EXISTS \"WorkActivityEvent\" (\n    \"id\" TEXT NOT NULL PRIMARY KEY,\n    \"userId\" TEXT NOT NULL,\n    \"platform\" TEXT NOT NULL,\n    \"domain\" TEXT NOT NULL,\n    \"eventType\" TEXT NOT NULL,\n    \"occurredAt\" DATETIME NOT NULL,\n    \"durationSeconds\" INTEGER NOT NULL DEFAULT 0,\n    \"source\" TEXT NOT NULL DEFAULT 'EXTENSION',\n    \"sessionId\" TEXT,\n    \"createdAt\" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP\n)",
  "CREATE TABLE IF NOT EXISTS \"WorkTrackerCredential\" (\n    \"id\" TEXT NOT NULL PRIMARY KEY,\n    \"userId\" TEXT NOT NULL,\n    \"name\" TEXT NOT NULL,\n    \"tokenHash\" TEXT NOT NULL,\n    \"expiresAt\" DATETIME NOT NULL,\n    \"revokedAt\" DATETIME,\n    \"createdAt\" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP\n)",
  "CREATE UNIQUE INDEX IF NOT EXISTS \"WorkSession_activeUserId_key\" ON \"WorkSession\"(\"activeUserId\")",
  "CREATE INDEX IF NOT EXISTS \"WorkSession_userId_startedAt_idx\" ON \"WorkSession\"(\"userId\", \"startedAt\")",
  "CREATE INDEX IF NOT EXISTS \"WorkSession_platform_startedAt_idx\" ON \"WorkSession\"(\"platform\", \"startedAt\")",
  "CREATE INDEX IF NOT EXISTS \"WorkSession_status_idx\" ON \"WorkSession\"(\"status\")",
  "CREATE UNIQUE INDEX IF NOT EXISTS \"WorkSession_userId_requestId_key\" ON \"WorkSession\"(\"userId\", \"requestId\")",
  "CREATE INDEX IF NOT EXISTS \"WorkInterval_sessionId_startedAt_idx\" ON \"WorkInterval\"(\"sessionId\", \"startedAt\")",
  "CREATE UNIQUE INDEX IF NOT EXISTS \"WorkTarget_userId_platform_period_key\" ON \"WorkTarget\"(\"userId\", \"platform\", \"period\")",
  "CREATE INDEX IF NOT EXISTS \"WorkActivityEvent_userId_occurredAt_idx\" ON \"WorkActivityEvent\"(\"userId\", \"occurredAt\")",
  "CREATE INDEX IF NOT EXISTS \"WorkActivityEvent_sessionId_idx\" ON \"WorkActivityEvent\"(\"sessionId\")",
  "CREATE UNIQUE INDEX IF NOT EXISTS \"WorkTrackerCredential_tokenHash_key\" ON \"WorkTrackerCredential\"(\"tokenHash\")",
  "CREATE INDEX IF NOT EXISTS \"WorkTrackerCredential_userId_idx\" ON \"WorkTrackerCredential\"(\"userId\")"
];

const probes: string[] = [
  "SELECT \"id\", \"userId\", \"platform\", \"activityType\", \"description\", \"sku\", \"marketplaceListingId\", \"startedAt\", \"endedAt\", \"durationSeconds\", \"status\", \"trackingSource\", \"notes\", \"requestId\", \"activeUserId\", \"revision\", \"createdAt\", \"updatedAt\" FROM \"WorkSession\" LIMIT 0",
  "SELECT \"id\", \"sessionId\", \"startedAt\", \"endedAt\" FROM \"WorkInterval\" LIMIT 0",
  "SELECT \"id\", \"userId\", \"platform\", \"period\", \"targetMinutes\", \"createdAt\", \"updatedAt\" FROM \"WorkTarget\" LIMIT 0",
  "SELECT \"id\", \"userId\", \"platform\", \"domain\", \"eventType\", \"occurredAt\", \"durationSeconds\", \"source\", \"sessionId\", \"createdAt\" FROM \"WorkActivityEvent\" LIMIT 0",
  "SELECT \"id\", \"userId\", \"name\", \"tokenHash\", \"expiresAt\", \"revokedAt\", \"createdAt\" FROM \"WorkTrackerCredential\" LIMIT 0"
];

const pending = new WeakMap<PrismaClient, Promise<void>>();
const ready = new WeakSet<PrismaClient>();

export async function ensureWorkTrackerSchema(db: PrismaClient = prisma): Promise<void> {
  if (ready.has(db)) return;
  const existing = pending.get(db);
  if (existing) return existing;
  const initialization = (async () => {
    if (db === prisma) await executeDdlBatch(workTrackerDdl);
    else for (const statement of workTrackerDdl) await db.$executeRawUnsafe(statement);
    const columns = await db.$queryRawUnsafe<Array<{ name: string }>>('PRAGMA table_info("WorkSession")');
    for (const column of ["inventoryId", "marketplaceShopId", "listingRecordId"]) {
      if (columns.some(c => c.name === column)) continue;
      try { await db.$executeRawUnsafe(`ALTER TABLE "WorkSession" ADD COLUMN "${column}" TEXT`); }
      catch (error) {
        const refreshed = await db.$queryRawUnsafe<Array<{ name: string }>>('PRAGMA table_info("WorkSession")');
        if (!refreshed.some(c => c.name === column)) throw error;
      }
    }
    // The shared DDL helper tolerates failures. Verify success before caching;
    // missing columns or a failed unique timer index must remain a real error.
    for (const query of probes) await db.$queryRawUnsafe(query);
    const indexes = await db.$queryRawUnsafe<Array<{ name: string }>>(
      "SELECT name FROM sqlite_master WHERE type = 'index' AND name IN ('WorkSession_activeUserId_key', 'WorkSession_userId_requestId_key', 'WorkTarget_userId_platform_period_key', 'WorkTrackerCredential_tokenHash_key')"
    );
    if (indexes.length !== 4) throw new Error("Work Tracker database indexes could not be initialized");
    ready.add(db);
  })();
  pending.set(db, initialization);
  try { await initialization; } finally { pending.delete(db); }
}
