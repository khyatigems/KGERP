import assert from "node:assert/strict";
import { marketplaceSyncAudit, presentMarketplaceSync } from "@/lib/marketplace/activity-display";
import type { ActivityLog } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveMarketplaceActivities } from "@/lib/marketplace/activity-resolver";

const jobs = [
  { id: "job-1", batchId: "batch-uuid", syncType: "ORDERS", marketplaceShopId: "shop-1", marketplaceShop: { name: "Khyati Gems", marketplace: "ETSY" } },
  { id: "job-2", batchId: "batch-uuid", syncType: "ORDERS", marketplaceShopId: "shop-2", marketplaceShop: { name: "Gem Store", marketplace: "EBAY" } },
];
const audit = marketplaceSyncAudit(jobs);
assert.equal(audit.entityIdentifier, "Orders sync · Etsy: Khyati Gems, eBay: Gem Store");
assert.match(audit.details, /queued for Etsy: Khyati Gems/);
const legacy = { entityType: "MARKETPLACE", entityId: "batch-uuid", referenceId: "batch-uuid", actionType: "SYNC_QUEUED", details: "orders sync queued for 2 shops", metadata: '{"syncType":"ORDERS","shopIds":["shop-1","shop-2"]}' };
const resolved = presentMarketplaceSync(legacy, jobs)!;
assert.equal(resolved.reference, audit.entityIdentifier);
assert.equal(resolved.label, "Sync queued");
assert.ok(resolved.eventDetails.includes("Sync batch ID: batch-uuid"));
assert.ok(resolved.eventDetails.includes("Job ID: job-1"));
const snapshot = presentMarketplaceSync({ ...legacy, entityIdentifier: audit.entityIdentifier, referenceId: audit.entityIdentifier, metadata: JSON.stringify(audit.metadata) }, jobs.map(job => ({ ...job, marketplaceShop: { ...job.marketplaceShop, name: "Renamed shop" } })))!;
assert.equal(snapshot.reference, audit.entityIdentifier);
assert.match(snapshot.description, /Khyati Gems/);
assert.doesNotMatch(snapshot.description, /Renamed shop/);
const missing = presentMarketplaceSync({ ...legacy, metadata: "invalid JSON" })!;
assert.equal(missing.reference, "Orders sync · Shop details unavailable");
assert.doesNotMatch(missing.reference, /batch-uuid/);
const shopFallback = presentMarketplaceSync(legacy, [], [{ id: "shop-1", name: "Still available", marketplace: "ETSY" }])!;
assert.match(shopFallback.reference, /Etsy: Still available/);
const retry = marketplaceSyncAudit([{ ...jobs[0], syncType: "LISTINGS" }, jobs[1]], true);
assert.match(retry.entityIdentifier, /Orders & listings sync/);
assert.match(retry.details, /retry queued/);
assert.equal(presentMarketplaceSync({ ...legacy, actionType: "SYNC_RETRY_QUEUED" }, jobs)?.label, "Sync retry queued");
assert.equal(presentMarketplaceSync({ entityType: "Inventory", actionType: "STATUS_CHANGE", entityIdentifier: "KG-123" }), null);
assert.equal(presentMarketplaceSync({ ...legacy, actionType: "SHOP_CONNECTED" }), null);
console.log("Marketplace activity checks passed: named single/multiple shops, legacy batches, snapshots, retry types, missing history and unrelated logs.");

async function checkResolver() {
  const originalJobs = prisma.marketplaceSyncJob.findMany, originalShops = prisma.marketplaceShop.findMany;
  let jobQueries = 0, shopQueries = 0;
  try {
    prisma.marketplaceSyncJob.findMany = (async () => { jobQueries++; return jobs; }) as unknown as typeof originalJobs;
    prisma.marketplaceShop.findMany = (async () => { shopQueries++; return [{ id: "fallback-shop", name: "Saved shop", marketplace: "ETSY" }]; }) as unknown as typeof originalShops;
    const logs = [
      { ...legacy, id: "first" },
      { ...legacy, id: "second", entityId: "removed-batch", referenceId: "removed-batch", metadata: '{"shopIds":["fallback-shop"]}' },
      { id: "inventory", entityType: "Inventory", actionType: "STATUS_CHANGE" },
    ] as ActivityLog[];
    const resolved = await resolveMarketplaceActivities(logs);
    assert.equal(jobQueries, 1, "jobs resolved in one bulk query");
    assert.equal(shopQueries, 1, "fallback shops resolved in one bulk query");
    assert.match(resolved.get("first")!.reference, /Khyati Gems/);
    assert.match(resolved.get("second")!.reference, /Saved shop/);
    assert.doesNotMatch(resolved.get("second")!.reference, /Khyati Gems|Gem Store/, "another batch's shops cannot leak into this event");
    assert.equal(resolved.has("inventory"), false);
    console.log("Marketplace legacy resolver checks passed: batch isolation, shop fallback, bulk queries and unrelated logs.");
  } finally { prisma.marketplaceSyncJob.findMany = originalJobs; prisma.marketplaceShop.findMany = originalShops; }
}
checkResolver().catch(error => { console.error(error); process.exitCode = 1; });
