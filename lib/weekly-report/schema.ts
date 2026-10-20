import type { PrismaClient } from "@prisma/client";
import { prisma, executeDdlBatch } from "@/lib/prisma";
export const weeklyReportDdl: string[] = [
  "CREATE TABLE IF NOT EXISTS \"WeeklyReportRun\" (\n    \"id\" TEXT NOT NULL PRIMARY KEY,\n    \"executionKey\" TEXT NOT NULL,\n    \"mode\" TEXT NOT NULL,\n    \"status\" TEXT NOT NULL DEFAULT 'QUEUED',\n    \"periodStart\" DATETIME NOT NULL,\n    \"periodEnd\" DATETIME NOT NULL,\n    \"timezone\" TEXT NOT NULL,\n    \"scheduledFor\" DATETIME,\n    \"configHash\" TEXT NOT NULL,\n    \"settingsJson\" TEXT NOT NULL,\n    \"metricsJson\" TEXT,\n    \"dataQuality\" TEXT NOT NULL DEFAULT 'PENDING',\n    \"pdfBase64\" TEXT,\n    \"pdfChecksum\" TEXT,\n    \"pdfBytes\" INTEGER,\n    \"attempts\" INTEGER NOT NULL DEFAULT 0,\n    \"leaseOwner\" TEXT,\n    \"leaseUntil\" DATETIME,\n    \"nextAttemptAt\" DATETIME,\n    \"requestedById\" TEXT,\n    \"errorCode\" TEXT,\n    \"errorSummary\" TEXT,\n    \"startedAt\" DATETIME,\n    \"completedAt\" DATETIME,\n    \"createdAt\" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n    \"updatedAt\" DATETIME NOT NULL\n)",
  "CREATE TABLE IF NOT EXISTS \"WeeklyReportDelivery\" (\n    \"id\" TEXT NOT NULL PRIMARY KEY,\n    \"runId\" TEXT NOT NULL,\n    \"recipient\" TEXT NOT NULL,\n    \"status\" TEXT NOT NULL DEFAULT 'PENDING',\n    \"attempts\" INTEGER NOT NULL DEFAULT 0,\n    \"attemptedAt\" DATETIME,\n    \"acceptedAt\" DATETIME,\n    \"nextAttemptAt\" DATETIME,\n    \"providerMessageId\" TEXT,\n    \"emailLogId\" TEXT,\n    \"errorCode\" TEXT,\n    \"errorSummary\" TEXT,\n    \"createdAt\" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n    \"updatedAt\" DATETIME NOT NULL\n)",
  "CREATE UNIQUE INDEX IF NOT EXISTS \"WeeklyReportRun_executionKey_key\" ON \"WeeklyReportRun\"(\"executionKey\")",
  "CREATE INDEX IF NOT EXISTS \"WeeklyReportRun_status_nextAttemptAt_idx\" ON \"WeeklyReportRun\"(\"status\", \"nextAttemptAt\")",
  "CREATE INDEX IF NOT EXISTS \"WeeklyReportRun_periodStart_periodEnd_idx\" ON \"WeeklyReportRun\"(\"periodStart\", \"periodEnd\")",
  "CREATE INDEX IF NOT EXISTS \"WeeklyReportRun_createdAt_idx\" ON \"WeeklyReportRun\"(\"createdAt\")",
  "CREATE INDEX IF NOT EXISTS \"WeeklyReportDelivery_status_nextAttemptAt_idx\" ON \"WeeklyReportDelivery\"(\"status\", \"nextAttemptAt\")",
  "CREATE INDEX IF NOT EXISTS \"WeeklyReportDelivery_runId_idx\" ON \"WeeklyReportDelivery\"(\"runId\")",
  "CREATE UNIQUE INDEX IF NOT EXISTS \"WeeklyReportDelivery_runId_recipient_key\" ON \"WeeklyReportDelivery\"(\"runId\", \"recipient\")"
];
const pending = new WeakMap<PrismaClient, Promise<void>>();
const ready = new WeakSet<PrismaClient>();
export async function ensureWeeklyReportSchema(db: PrismaClient = prisma) {
 if (ready.has(db)) return;
 if (pending.has(db)) return pending.get(db)!;
 const operation = (async () => {
  if (db === prisma) await executeDdlBatch(weeklyReportDdl);
  else for (const sql of weeklyReportDdl) await db.$executeRawUnsafe(sql);
  await db.weeklyReportRun.findFirst({ select: { id: true } });
  await db.weeklyReportDelivery.findFirst({ select: { id: true } });
  const indexes = await db.$queryRawUnsafe<Array<{ name: string }>>("SELECT name FROM sqlite_master WHERE type='index' AND name IN ('WeeklyReportRun_executionKey_key','WeeklyReportDelivery_runId_recipient_key')");
  if (indexes.length !== 2) throw new Error("Weekly report idempotency indexes are unavailable");
  ready.add(db);
 })();
 pending.set(db, operation); try { await operation; } finally { pending.delete(db); }
}
