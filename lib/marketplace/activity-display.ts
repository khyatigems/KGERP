export type SyncActivityShop = { id: string; name: string; marketplace: string };
export type SyncActivityJob = { id: string; batchId?: string | null; syncType: string; marketplaceShopId: string; marketplaceShop: { name: string; marketplace: string } };
type SyncActivity = { module?: string | null; entityType?: string | null; action?: string | null; actionType?: string | null; entityId?: string | null; referenceId?: string | null; entityIdentifier?: string | null; metadata?: string | null; fieldChanges?: string | null; description?: string | null; details?: string | null };
const platformName = (value: string) => ({ EBAY: "eBay", ETSY: "Etsy", AMAZON: "Amazon" }[value.toUpperCase()] || value);
export function syncActivityMetadata(log: SyncActivity): Record<string, unknown> {
  try { const value = JSON.parse(log.metadata || log.fieldChanges || "{}"); return value && typeof value === "object" && !Array.isArray(value) ? value : {}; } catch { return {}; }
}
export function isSyncActivity(log: SyncActivity) {
  return ["MARKETPLACE", "MarketplaceSyncJob"].includes(log.module || log.entityType || "") && ["SYNC_QUEUED", "SYNC_RETRY_QUEUED"].includes(log.action || log.actionType || "");
}
export function marketplaceSyncAudit(jobs: SyncActivityJob[], retry = false) {
  const shops = [...new Map(jobs.map(job => [job.marketplaceShopId, { id: job.marketplaceShopId, ...job.marketplaceShop }])).values()];
  const syncTypes = [...new Set(jobs.map(job => job.syncType))];
  const type = syncTypeLabel(syncTypes);
  const names = shops.map(shop => `${platformName(shop.marketplace)}: ${shop.name}`).join(", ");
  return { entityIdentifier: `${type} sync · ${names || "Marketplace shops"}`, details: `${type} sync ${retry ? "retry " : ""}queued for ${names || "marketplace shops"}.`, metadata: { shops, syncTypes } };
}
function syncTypeLabel(types: string[]) {
  const unique = new Set(types.map(type => type.toUpperCase()));
  return unique.has("ORDERS") && unique.has("LISTINGS") ? "Orders & listings" : unique.has("ORDERS") ? "Orders" : unique.has("LISTINGS") ? "Listings" : "Marketplace";
}
export function presentMarketplaceSync(log: SyncActivity, jobs: SyncActivityJob[] = [], availableShops: SyncActivityShop[] = []) {
  if (!isSyncActivity(log)) return null;
  const metadata = syncActivityMetadata(log);
  const snapshotShops = Array.isArray(metadata.shops) ? metadata.shops.filter((shop): shop is SyncActivityShop => Boolean(shop && typeof shop === "object" && typeof shop.id === "string" && typeof shop.name === "string" && typeof shop.marketplace === "string")) : [];
  const shops = snapshotShops.length ? snapshotShops : jobs.length ? [...new Map(jobs.map(job => [job.marketplaceShopId, { id: job.marketplaceShopId, ...job.marketplaceShop }])).values()] : availableShops;
  const types = Array.isArray(metadata.syncTypes) ? metadata.syncTypes.filter((value): value is string => typeof value === "string") : typeof metadata.syncType === "string" ? [metadata.syncType] : jobs.map(job => job.syncType);
  // Old events keep the type in their prose even if sync jobs have since been removed.
  if (!types.length) { const match = (log.description || log.details || "").match(/\b(orders|listings)\b/i); if (match) types.push(match[1]); }
  const type = syncTypeLabel(types);
  const names = shops.map(shop => `${platformName(shop.marketplace)}: ${shop.name}`).join(", ");
  const storedReference = log.referenceId || log.entityIdentifier;
  const readableReference = storedReference && storedReference !== log.entityId && !/^[0-9a-f-]{36}$/i.test(storedReference) ? storedReference : undefined;
  const retry = (log.action || log.actionType) === "SYNC_RETRY_QUEUED";
  return {
    reference: readableReference || `${type} sync · ${names || "Shop details unavailable"}`,
    label: retry ? "Sync retry queued" : "Sync queued",
    description: names ? `${type} sync ${retry ? "retry " : ""}queued for ${names}.` : log.description || log.details || `${type} sync queued. Shop details are no longer available.`,
    eventDetails: [`Sync type: ${type}`, ...shops.map(shop => `Shop: ${platformName(shop.marketplace)} — ${shop.name}`), `Sync batch ID: ${log.entityId || "Unavailable"}`, ...jobs.map(job => `Job ID: ${job.id}`)],
  };
}
