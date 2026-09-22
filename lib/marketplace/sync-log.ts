import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type { MarketplacePlatform } from "@/lib/marketplace/types";

export interface SyncLogCounters {
  scanned?: number;
  created?: number;
  updated?: number;
  skipped?: number;
  failed?: number;
}

export interface SyncLogFinalize {
  status?: "SUCCESS" | "PARTIAL" | "FAILED";
  counters?: SyncLogCounters;
  errorDetails?: string | null;
}

export async function startSyncLog(
  marketplace: MarketplacePlatform,
  syncType: "LISTINGS" | "ORDERS" | "METRICS",
  triggeredBy = "SYSTEM"
): Promise<string> {
  const id = crypto.randomUUID();
  await prisma.marketplaceSyncLog.create({
    data: {
      id,
      marketplace,
      syncType,
      status: "RUNNING",
      triggeredBy,
      startedAt: new Date(),
    },
  });
  return id;
}

export async function finalizeSyncLog(id: string, final: SyncLogFinalize): Promise<void> {
  await prisma.marketplaceSyncLog.update({
    where: { id },
    data: {
      status: final.status ?? "SUCCESS",
      endedAt: new Date(),
      recordsScanned: final.counters?.scanned ?? 0,
      recordsCreated: final.counters?.created ?? 0,
      recordsUpdated: final.counters?.updated ?? 0,
      recordsSkipped: final.counters?.skipped ?? 0,
      recordsFailed: final.counters?.failed ?? 0,
      errorDetails: final.errorDetails ?? null,
    },
  });
}

export async function failSyncLog(id: string, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  await prisma.marketplaceSyncLog
    .update({
      where: { id },
      data: { status: "FAILED", endedAt: new Date(), errorDetails: message },
    })
    .catch(() => {});
}

export async function getLatestSyncLog(
  marketplace: MarketplacePlatform,
  syncType: "LISTINGS" | "ORDERS" | "METRICS"
) {
  return prisma.marketplaceSyncLog.findFirst({
    where: { marketplace, syncType },
    orderBy: { startedAt: "desc" },
  });
}
