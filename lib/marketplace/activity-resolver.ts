import type { ActivityLog } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isSyncActivity, presentMarketplaceSync, syncActivityMetadata } from "./activity-display";

/** Resolve legacy batches in two bulk queries; preserve stored shop-name snapshots. */
export async function resolveMarketplaceActivities(logs: ActivityLog[]) {
  const events = logs.filter(isSyncActivity);
  const result = new Map<string, NonNullable<ReturnType<typeof presentMarketplaceSync>>>();
  if (!events.length) return result;
  const batchIds = events.map(log => log.entityId || log.referenceId || "").filter(Boolean);
  const metadata = events.map(syncActivityMetadata);
  const stringArray = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  const jobIds = metadata.flatMap(value => [...stringArray(value.jobIds), ...stringArray(value.retryJobIds)]);
  const shopIds = metadata.flatMap(value => stringArray(value.shopIds));
  const [jobs, shops] = await Promise.all([
    prisma.marketplaceSyncJob.findMany({ where: { OR: [{ batchId: { in: batchIds } }, { id: { in: jobIds } }] }, select: { id: true, batchId: true, syncType: true, marketplaceShopId: true, marketplaceShop: { select: { name: true, marketplace: true } } } }).catch(() => []),
    shopIds.length ? prisma.marketplaceShop.findMany({ where: { id: { in: shopIds } }, select: { id: true, name: true, marketplace: true } }).catch(() => []) : Promise.resolve([]),
  ]);
  for (const log of events) {
    const meta = syncActivityMetadata(log);
    const ids = [...stringArray(meta.jobIds), ...stringArray(meta.retryJobIds)];
    const selectedShops = stringArray(meta.shopIds);
    const display = presentMarketplaceSync(log, jobs.filter(job => job.batchId === log.entityId || ids.includes(job.id)), shops.filter(shop => selectedShops.includes(shop.id)));
    if (display) result.set(log.id, display);
  }
  return result;
}
