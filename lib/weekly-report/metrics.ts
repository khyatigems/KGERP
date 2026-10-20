import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dayKey } from "@/lib/work-tracker/core";
import { reportingPeriod, percentChange, type ReportSettings } from "./config";

const inventorySelect = { id: true, sku: true, itemName: true, status: true, category: true, gemType: true, costPrice: true, sellingPrice: true, pieces: true, imageUrl: true, certificateNo: true, certificateNumber: true, description: true, productDescription: true, carats: true, weightValue: true, shape: true, color: true, media: { select: { type: true, mediaUrl: true } } } satisfies Prisma.InventorySelect;
type Inventory = Prisma.InventoryGetPayload<{ select: typeof inventorySelect }>;
type Order = { id: string; marketplace: string; marketplaceOrderId: string; marketplaceShopId: string | null; status: string; currency: string; orderTotal: number | null; orderDate: Date | null; lastSyncedAt?: Date | null; updatedAt?: Date; items: { quantity: number }[] };
type Listing = { id: string; inventoryId: string | null; platform: string; marketplaceShopId: string | null; externalId: string | null; status: string; syncStatus: string | null; syncError: string | null; listingSku: string | null; marketplaceTitle: string | null; rawMetadata: string | null };
type Shop = { id: string; name: string; marketplace: string; status: string; connection: { status: string } };
type Sync = { marketplaceShopId: string | null; syncType: string; status: string; startedAt: Date; endedAt: Date | null; recordsFailed: number };
type SyncJob = { marketplaceShopId: string; syncType: string; status: string; createdAt: Date; endedAt: Date | null; recordsFailed: number };
export type Data = { inventory: Inventory[]; orders: Order[]; listings: Listing[]; shops: Shop[]; syncs: Sync[]; syncJobs?: SyncJob[]; sales: { inventoryId: string; saleDate: Date }[]; returns: { returnDate: Date; items: { quantity: number }[] }[]; coverage: string[]; returnsAvailable?: boolean };
export type Exception = { sku: string; name: string; status: string; listings: string; missing: string[]; severity: "WARNING" | "CRITICAL"; action: string };
type CurrencyTotals = Record<string, number>;
const sum = (totals: CurrencyTotals, currency: string, amount: number) => { totals[currency] = Number(((totals[currency] || 0) + amount).toFixed(6)); };
// Keep certificate completeness aligned with Inventory > Missing Certification.
// That operational filter counts in-stock rows with an image/media reference where
// both certificate identifier fields are null or empty. CertificateCode relations
// alone are not treated as a saved inventory certificate identifier.
export function isInventoryCertificateEligible(item: Pick<Inventory, "status" | "imageUrl" | "media">) {
 return item.status === "IN_STOCK" && (item.imageUrl !== null || item.media.length > 0);
}
export function isMissingInventoryCertificate(item: Pick<Inventory, "status" | "imageUrl" | "media" | "certificateNo" | "certificateNumber">) {
 const missingIdentifier = (value: string | null) => value === null || value === "";
 return isInventoryCertificateEligible(item) && missingIdentifier(item.certificateNo) && missingIdentifier(item.certificateNumber);
}
export const inPeriod = (value: Date | null, start: Date, end: Date) => Boolean(value && +value >= +start && +value < +end);
export function publication(listing: Listing) {
 try { const raw = JSON.parse(listing.rawMetadata || "{}"); const p = raw.workPublication; if (raw.completeEbay?.state !== "PUBLISHED" || !p || p.listingId !== listing.externalId || typeof p.publishedAt !== "string") return null; const date = new Date(p.publishedAt); return Number.isFinite(+date) ? date : null; } catch { return null; }
}
export function inventoryIssues(item: Inventory, settings: ReportSettings) {
 const missing: string[] = [];
 const present = (v: unknown) => typeof v === "string" && v.trim().length > 0;
 if (!present(item.imageUrl) && !item.media.some(m => m.type.toUpperCase() === "IMAGE" && present(m.mediaUrl))) missing.push("Image");
 if (isMissingInventoryCertificate(item)) missing.push("Certificate number");
 const applies = !settings.requiredFieldCategories.length || settings.requiredFieldCategories.some(c => c.toLowerCase() === item.category.toLowerCase());
 if (applies) for (const field of settings.requiredFields) {
  const valid = field === "weight" ? Math.max(item.carats || 0, item.weightValue || 0) > 0 : field === "price" ? item.sellingPrice > 0 : field === "description" ? present(item.description) || present(item.productDescription) : present(item[field]);
  if (!valid) missing.push(field);
 }
 return missing;
}
function aggregateOrders(orders: Order[], start: Date, end: Date, timezone: string) {
 const grouped = new Map<string, Order[]>();
 for (const order of orders) if (inPeriod(order.orderDate, start, end)) {
  const key = JSON.stringify([order.marketplace, order.marketplaceOrderId]);
  grouped.set(key, [...grouped.get(key) || [], order]);
 }
 const uniqueOrders: Order[] = [];
 let conflicts = 0;
 for (const group of grouped.values()) {
  const assignedShops = new Set(group.flatMap(order => order.marketplaceShopId ? [order.marketplaceShopId] : []));
  const candidates = assignedShops.size === 1 ? group.filter(order => order.marketplaceShopId) : group;
  const latest = [...candidates].sort((a, b) => {
   const at = Math.max(a.lastSyncedAt ? +a.lastSyncedAt : 0, a.updatedAt ? +a.updatedAt : 0);
   const bt = Math.max(b.lastSyncedAt ? +b.lastSyncedAt : 0, b.updatedAt ? +b.updatedAt : 0);
   return bt - at || a.id.localeCompare(b.id);
  })[0];
  if (!latest) continue;
  if (assignedShops.size > 1) {
   conflicts++;
   // Keep the order in platform totals, but don't attribute it to an arbitrary shop.
   uniqueOrders.push({ ...latest, marketplaceShopId: null });
  } else uniqueOrders.push(latest);
 }
 const totals: CurrencyTotals = {}, amountOrderCounts: Record<string, number> = {}, daily: Record<string, CurrencyTotals> = {}, byShop: Record<string, { orders: number; units: number; value: CurrencyTotals; cancelled: number; refunded: number }> = {};
 let count = 0, units = 0, cancelled = 0, refunded = 0, excluded = 0, unknownAmounts = 0;
 for (const order of uniqueOrders) {
  const shopKey = order.marketplaceShopId || `${order.marketplace}:unassigned`;
  byShop[shopKey] ||= { orders: 0, units: 0, value: {}, cancelled: 0, refunded: 0 };
  const status = order.status.toUpperCase();
  count++; byShop[shopKey].orders++;
  if (/CANCEL/.test(status)) { cancelled++; byShop[shopKey].cancelled++; excluded++; continue; }
  if (/REFUND/.test(status)) { refunded++; byShop[shopKey].refunded++; excluded++; continue; }
  if (/FAIL|UNPAID|PAYMENT_PENDING/.test(status)) { excluded++; continue; }
  const quantity = order.items.reduce((n, i) => n + (Number.isInteger(i.quantity) && i.quantity > 0 ? i.quantity : 0), 0); units += quantity; byShop[shopKey].units += quantity;
  if (order.orderTotal === null || !Number.isFinite(order.orderTotal) || order.orderTotal < 0 || !/^[A-Z]{3}$/.test(order.currency)) { unknownAmounts++; continue; }
  const day = dayKey(+order.orderDate!, timezone); daily[day] ||= {};
  sum(totals, order.currency, order.orderTotal); sum(daily[day], order.currency, order.orderTotal); sum(byShop[shopKey].value, order.currency, order.orderTotal);
  amountOrderCounts[order.currency] = (amountOrderCounts[order.currency] || 0) + 1;
 }
 return { count, units, cancelled, refunded, excluded, unknownAmounts, totals, averageOrderValue: Object.fromEntries(Object.entries(totals).map(([c, n]) => [c, Number((n / amountOrderCounts[c]).toFixed(2))])), daily, byShop, conflicts };
}
export function buildMetrics(data: Data, settings: ReportSettings, scheduled: Date, generated = new Date()) {
 const period = reportingPeriod(settings, scheduled), coverage = [...data.coverage];
 const inventory = [...new Map(data.inventory.map(i => [i.sku, i])).values()];
 const byStatus: Record<string, number> = {}, byGemstone: Record<string, number> = {}, missingFields: Record<string, number> = {};
 let cost = 0, asking = 0, inconsistencies = 0;
 const listingByInventory = new Map<string, Listing[]>(); for (const listing of data.listings) if (listing.inventoryId) listingByInventory.set(listing.inventoryId, [...listingByInventory.get(listing.inventoryId) || [], listing]);
 const exceptions: Exception[] = [];
 for (const item of inventory) {
  byStatus[item.status] = (byStatus[item.status] || 0) + 1;
  if (item.status === "IN_STOCK") { cost += item.costPrice; asking += item.sellingPrice; }
  byGemstone[item.gemType || "Unspecified"] = (byGemstone[item.gemType || "Unspecified"] || 0) + 1;
  if (item.costPrice < 0 || item.sellingPrice < 0 || item.pieces < 1) inconsistencies++;
  const missing = inventoryIssues(item, settings);
  for (const field of missing) missingFields[field] = (missingFields[field] || 0) + 1;
  if (missing.length) exceptions.push({ sku: item.sku, name: item.itemName, status: item.status, listings: (listingByInventory.get(item.id) || []).map(l => `${l.platform}: ${l.status}`).join(", ") || "Not linked", missing, severity: "WARNING", action: `Add or verify ${missing.join(", ")}.` });
 }
 const current = aggregateOrders(data.orders, period.start, period.end, settings.timezone), previous = aggregateOrders(data.orders, period.previousStart, period.start, settings.timezone);
 // Listing IDs are shop-scoped in this database: legacy unassigned rows can mirror a shop-owned
 // listing and must not overwrite it. Deduplicate only within (platform, shop, listing ID), then
 // exclude truly unassigned IDs from named-shop counts and publication attribution.
 const shopListingGroups = new Map<string, Listing>();
 const preferListing = (candidate: Listing, prior: Listing | undefined) => {
  if (!prior) return true;
  if (Boolean(candidate.marketplaceShopId) !== Boolean(prior.marketplaceShopId)) return Boolean(candidate.marketplaceShopId);
  const candidateDate = publication(candidate), priorDate = publication(prior);
  return Boolean(candidateDate && (!priorDate || +candidateDate < +priorDate));
 };
 for (const listing of data.listings.filter(l => l.externalId)) {
  const shopKey = JSON.stringify([listing.platform, listing.marketplaceShopId || "UNASSIGNED", listing.externalId]);
  const shopPrior = shopListingGroups.get(shopKey);
  if (preferListing(listing, shopPrior)) shopListingGroups.set(shopKey, listing);
 }
 const shopScopedListings = [...shopListingGroups.values()];
 const newListings = shopScopedListings.flatMap(l => { const date = publication(l); return l.marketplaceShopId && date && inPeriod(date, period.start, period.end) ? [{ platform: l.platform, shopId: l.marketplaceShopId, externalId: l.externalId!, sku: l.listingSku || "Unavailable", name: l.marketplaceTitle || "Unavailable", publishedAt: date.toISOString(), status: l.status }] : []; });
 const previousPublished = shopScopedListings.filter(l => l.marketplaceShopId && inPeriod(publication(l), period.previousStart, period.start)).length;
 const shopRows = data.shops.map(shop => {
  const syncs = data.syncs.filter(s => s.marketplaceShopId === shop.id).sort((a, b) => +(b.endedAt || b.startedAt) - +(a.endedAt || a.startedAt));
  const listingSyncs = syncs.filter(s => s.syncType === "LISTINGS");
  const lastListingSync = listingSyncs.find(s => ["SUCCESS", "PARTIAL"].includes(s.status) && s.endedAt)?.endedAt || null;
  const listingHours = lastListingSync ? (+generated - +lastListingSync) / 3600000 : null;
  const orderJob = (data.syncJobs || []).filter(job => job.marketplaceShopId === shop.id && job.syncType === "ORDERS").sort((a, b) => +b.createdAt - +a.createdAt)[0] || null;
  const orderLog = syncs.find(s => s.syncType === "ORDERS" && s.endedAt) || null;
  const lastOrderSync = orderJob?.endedAt || orderLog?.endedAt || null;
  const orderSyncAgeHours = lastOrderSync ? (+generated - +lastOrderSync) / 3600000 : null;
  const connected = shop.status === "CONNECTED" && shop.connection.status === "CONNECTED";
  const orderSyncState = !connected ? "DISCONNECTED" : !orderJob ? "NO_SYNC" : ["QUEUED", "PROCESSING"].includes(orderJob.status) ? "IN_PROGRESS" : orderJob.status !== "SUCCESS" || orderJob.recordsFailed > 0 ? orderJob.status === "FAILED" ? "FAILED" : "PARTIAL" : orderJob.endedAt && +orderJob.endedAt >= +period.end ? "CURRENT" : "STALE";
  const orderDataAvailable = orderSyncState === "CURRENT";
  const listings = shopScopedListings.filter(l => l.marketplaceShopId === shop.id);
  const value = current.byShop[shop.id], prior = previous.byShop[shop.id];
  const valueCurrencies = new Set([...Object.keys(value?.value || {}), ...Object.keys(prior?.value || {})]);
  const revenueChange = Object.fromEntries([...valueCurrencies].map(currency => [currency, percentChange(value?.value[currency] || 0, prior?.value[currency] || 0)]));
  return { id: shop.id, name: shop.name, platform: shop.marketplace, connected, lastListingSyncAt: lastListingSync?.toISOString() || null, listingSyncAgeHours: listingHours, listingStale: !lastListingSync || listingHours! >= settings.rules.staleSyncHours.warning, stale: !lastListingSync || listingHours! >= settings.rules.staleSyncHours.warning, lastOrderSyncAt: lastOrderSync?.toISOString() || null, orderSyncState, orderSyncAgeHours, orderDataAvailable,
   activeListings: listings.filter(l => ["ACTIVE", "LISTED"].includes(l.status.toUpperCase())).length,
   newListings: shop.marketplace === "EBAY" ? newListings.filter(l => l.shopId === shop.id).length : null,
   failedListingRecords: data.listings.filter(l => l.marketplaceShopId === shop.id && (l.syncStatus === "FAILED" || l.syncError)).length,
   failedSyncs: syncs.filter(s => inPeriod(s.startedAt, period.start, period.end) && ["FAILED", "PARTIAL"].includes(s.status)).length,
   orders: value?.orders || 0, units: value?.units || 0, value: value?.value || {}, cancelled: value?.cancelled || 0, refunded: value?.refunded || 0,
   orderChange: settings.comparisons && orderDataAvailable ? percentChange(value?.orders || 0, prior?.orders || 0) : null,
   unitChange: settings.comparisons && orderDataAvailable ? percentChange(value?.units || 0, prior?.units || 0) : null,
   revenueChange: settings.comparisons && orderDataAvailable ? revenueChange : {},
  };
 });
 const orderCoverage = {
  complete: shopRows.length > 0 && shopRows.every(shop => shop.orderDataAvailable),
  coveredShops: shopRows.filter(shop => shop.orderDataAvailable).length,
  totalShops: shopRows.length,
  unavailableShops: shopRows.filter(shop => !shop.orderDataAvailable).map(shop => ({ name: shop.name, state: shop.orderSyncState, lastSyncAt: shop.lastOrderSyncAt })),
  requiredAfter: period.end.toISOString(),
 };
 const alerts: { rule: string; severity: "WARNING" | "CRITICAL"; message: string; action: string }[] = [];
 const alert = (key: keyof ReportSettings["rules"], value: number, message: string, action: string, zero = false) => { const rule = settings.rules[key]; if (rule.enabled && (zero ? value === 0 : value >= rule.warning)) alerts.push({ rule: key, severity: value >= rule.critical && rule.severity === "CRITICAL" ? "CRITICAL" : "WARNING", message, action }); };
 const incompletePercent = inventory.length ? exceptions.length / inventory.length * 100 : 0;
 alert("missingImages", missingFields.Image || 0, `${missingFields.Image || 0} products have no image URL or media reference.`, "Add clear product images.");
 if (inventory.some(isInventoryCertificateEligible)) alert("missingCertificates", missingFields["Certificate number"] || 0, `${missingFields["Certificate number"] || 0} in-stock products with an image/media reference are missing a certificate number.`, "Review Inventory > Missing Certification and add or verify certificate details.");
 alert("incompletePercent", incompletePercent, `${incompletePercent.toFixed(1)}% of the current inventory snapshot is incomplete.`, "Resolve the SKU exception register.");
 const staleShops = shopRows.filter(s => !s.connected || s.listingStale);
 for (const shop of staleShops) alert("staleSyncHours", shop.listingSyncAgeHours ?? settings.rules.staleSyncHours.critical, `${shop.name}: ${!shop.connected ? "marketplace connection is disconnected" : shop.lastListingSyncAt ? "listing synchronization is stale" : "no successful listing synchronization recorded"}.`, "Reconnect or synchronize listings before relying on active-listing snapshots.");
 for (const shop of shopRows.filter(s => !s.orderDataAvailable)) {
  const state = shop.orderSyncState === "NO_SYNC" ? "no completed order sync is recorded" : shop.orderSyncState === "IN_PROGRESS" ? "order sync is still in progress" : shop.orderSyncState === "FAILED" ? "the latest order sync failed" : shop.orderSyncState === "PARTIAL" ? "the latest order sync was partial or failed records" : shop.orderSyncState === "DISCONNECTED" ? "the shop is disconnected" : "the latest completed order sync predates the reporting-period end";
  alert("staleSyncHours", Math.max(shop.orderSyncAgeHours ?? settings.rules.staleSyncHours.critical, settings.rules.staleSyncHours.warning), `${shop.name}: ${state}; order metrics for this period are unavailable.`, "Run a successful complete order sync after the reporting period ends.");
 }
 if (orderCoverage.complete) alert("zeroOrders", current.count, "No marketplace orders were recorded in this period.", "Check scope and connections before concluding demand is zero.", true);
 alert("failedListings", shopRows.reduce((n, s) => n + s.failedListingRecords, 0), "Listing records currently contain synchronization errors.", "Review failed listing records; these are not dated publication attempts.");
 alert("inventoryInconsistencies", inconsistencies, `${inconsistencies} inventory records have invalid prices or piece counts.`, "Review these inventory values.");
 const revenueChanges = Object.fromEntries([...new Set([...Object.keys(current.totals), ...Object.keys(previous.totals)])].map(c => [c, percentChange(current.totals[c] || 0, previous.totals[c] || 0)]));
 if (settings.comparisons && orderCoverage.complete) for (const [currency, change] of Object.entries(revenueChanges)) if (change !== null && change < 0) alert("revenueDeclinePercent", -change, `${currency} recorded order value declined ${(-change).toFixed(1)}%.`, "Review shop-level demand and data freshness.");
 const sold = new Set(data.sales.filter(s => inPeriod(s.saleDate, period.start, period.end)).map(s => s.inventoryId));
 const returns = data.returns.filter(r => inPeriod(r.returnDate, period.start, period.end));
 if (current.conflicts) coverage.push(`${current.conflicts} external order IDs have conflicting shop assignment; each order counted once.`);
 const assignedListingIds = new Set(data.listings.filter(l => l.externalId && l.marketplaceShopId).map(l => JSON.stringify([l.platform, l.externalId])));
 const unattributedListingIds = new Set(data.listings.filter(l => l.externalId && !l.marketplaceShopId && !assignedListingIds.has(JSON.stringify([l.platform, l.externalId]))).map(l => JSON.stringify([l.platform, l.externalId])));
 if (unattributedListingIds.size) coverage.push(`${unattributedListingIds.size} marketplace listing IDs have no shop assignment and are excluded from named-shop active listing and publication counts.`);
 if (current.unknownAmounts) coverage.push(`${current.unknownAmounts} eligible orders lack a valid amount/currency; order totals are incomplete.`);
 if (staleShops.length) coverage.push(`${staleShops.length} shops are disconnected, have stale listing synchronization or have no successful listing synchronization. Active-listing snapshots may be out of date.`);
 if (!orderCoverage.complete) coverage.push(`Order data is incomplete: a complete successful order sync after the reporting period ended ${period.endDay} (${settings.timezone}) is missing for ${orderCoverage.unavailableShops.map(shop => `${shop.name} (${shop.state.toLowerCase().replaceAll("_", " ")}${shop.lastSyncAt ? `; last sync ${shop.lastSyncAt}` : ""})`).join(", ") || "the selected shop scope"}. Order counts, units, recorded value, zero-order alerts and order/revenue comparisons are unavailable; stored rows must not be read as zero demand.`);
 if (data.orders.some(o => !o.orderDate)) coverage.push("Some imported orders have no source order date and are excluded from dated metrics.");
 coverage.push("Inventory completeness, availability, valuation and active listings are generation-time snapshots. Historical week-end inventory and prior-week completeness are unavailable. Image completeness checks for a populated image URL/media reference; remote asset reachability is not probed.", "New listings cover confirmed ERP eBay publications only; imported creation dates and Etsy draft dates are not publication evidence. Historical failed publication-attempt counts are unavailable.", "Cancellation/refund/unpaid exclusions recognize recorded status strings only. Order-record counts include marketplace rows with recorded cancellation/refund statuses; eligible unit/value totals exclude known cancelled/refunded/failed/unpaid/payment-pending statuses. The eBay connector stores fulfillment status rather than a verified payment/refund ledger; comprehensive cancellation/refund counts and payment confirmation are unavailable. Marketplace amounts are recorded order totals, may include shipping/tax, and are not cash receipts, settlements or net profit. Refund, tax, discount and shipping amounts cannot be reliably separated. Net sales and consolidated historical INR are unavailable.", "Physical SKU counts, marketplace listing counts, order counts and item quantities are distinct measures. ERP sales/returns are separate ledgers and are not added to marketplace revenue.");
 if (inventory.some(isInventoryCertificateEligible)) coverage.push("Certificate completeness follows Inventory > Missing Certification: in-stock SKUs with an image URL or media record are checked for both certificateNo and certificateNumber. Null or empty-string identifier fields count as missing; certificate document availability is not assessed.");
 return { schemaVersion: 1, generatedAt: generated.toISOString(), period: { start: period.start.toISOString(), end: period.end.toISOString(), startDay: period.startDay, endDay: period.endDay, previousStart: period.previousStart.toISOString(), timezone: settings.timezone },
  inventory: { physicalSkus: inventory.length, inStock: byStatus.IN_STOCK || 0, byStatus, byGemstone, costValuation: settings.valuation ? Number(cost.toFixed(2)) : null, askingValuation: settings.valuation ? Number(asking.toFixed(2)) : null, valuationCurrency: "INR (existing inventory cost/selling-price convention)", incomplete: exceptions.length, incompletePercent, missingFields, certificateEligible: inventory.filter(isInventoryCertificateEligible).length, inconsistencies },
  current, previous: settings.comparisons ? previous : null, comparisons: settings.comparisons ? { orders: orderCoverage.complete ? percentChange(current.count, previous.count) : null, units: orderCoverage.complete ? percentChange(current.units, previous.units) : null, revenue: orderCoverage.complete ? revenueChanges : {}, newListings: percentChange(newListings.length, previousPublished) } : null,
  orderCoverage, shops: shopRows, newListings, previousPublished, newListingsCoverage: "PARTIAL", soldPhysicalSkus: sold.size, erpSaleRows: data.sales.filter(s => inPeriod(s.saleDate, period.start, period.end)).length,
  erpReturns: { records: data.returnsAvailable === false ? null : returns.length, units: data.returnsAvailable === false ? null : returns.reduce((n, r) => n + r.items.reduce((v, i) => v + i.quantity, 0), 0), amount: null },
  alerts: alerts.sort((a, b) => Number(b.severity === "CRITICAL") - Number(a.severity === "CRITICAL")), exceptions, coverage,
  dataQuality: alerts.some(a => a.severity === "CRITICAL") ? "CRITICAL" : coverage.length ? "PARTIAL" : "HEALTHY",
 };
}
export type Metrics = ReturnType<typeof buildMetrics>;
async function paged<T extends { id: string }>(query: (cursor?: string) => Promise<T[]>) { const all: T[] = []; let cursor: string | undefined; while (true) { const page = await query(cursor); all.push(...page); if (page.length < 500) return all; cursor = page[page.length - 1].id; } }
export async function collectMetrics(settings: ReportSettings, scheduled: Date, db: PrismaClient = prisma) {
 const period = reportingPeriod(settings, scheduled), coverage: string[] = [];
 const allShops = await db.marketplaceShop.findMany({ include: { connection: { select: { status: true } } }, orderBy: { id: "asc" } });
 const shops = allShops.filter(s => settings.scope === "SHOPS" ? settings.shopIds.includes(s.id) : settings.scope === "MARKETPLACES" ? settings.marketplaces.includes(s.marketplace) : true);
 const ids = shops.map(s => s.id);
 const cursorPage = (cursor?: string) => ({ take: 500, orderBy: { id: "asc" as const }, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
 const [inventory, orders, listings, syncs, sales, returns] = await Promise.all([
  paged(cursor => db.inventory.findMany({ ...cursorPage(cursor), select: inventorySelect })),
  paged(cursor => db.marketplaceOrder.findMany({ ...cursorPage(cursor), where: { ...(settings.scope === "ALL_CONNECTED" ? {} : { marketplaceShopId: { in: ids } }), OR: [{ orderDate: { gte: settings.comparisons ? period.previousStart : period.start, lt: period.end } }, { orderDate: null }] }, include: { items: { select: { quantity: true } } } })),
  paged(cursor => db.listing.findMany({ ...cursorPage(cursor), where: settings.scope === "ALL_CONNECTED" ? {} : { marketplaceShopId: { in: ids } }, select: { id: true, inventoryId: true, platform: true, marketplaceShopId: true, externalId: true, status: true, syncStatus: true, syncError: true, listingSku: true, marketplaceTitle: true, rawMetadata: true } })),
  paged(cursor => db.marketplaceSyncLog.findMany({ ...cursorPage(cursor), where: { marketplaceShopId: { in: ids } }, select: { id: true, marketplaceShopId: true, syncType: true, status: true, startedAt: true, endedAt: true, recordsFailed: true } })),
  paged(cursor => db.sale.findMany({ ...cursorPage(cursor), where: { saleDate: { gte: settings.comparisons ? period.previousStart : period.start, lt: period.end } }, select: { id: true, inventoryId: true, saleDate: true } })),
  paged(cursor => db.salesReturn.findMany({ ...cursorPage(cursor), where: { returnDate: { gte: period.start, lt: period.end } }, select: { id: true, returnDate: true, items: { select: { quantity: true } } } })).catch(() => { coverage.push("ERP returns data could not be read; return counts are unavailable."); return []; }),
 ]);
 const syncJobs = (await Promise.all(shops.flatMap(shop => ["LISTINGS", "ORDERS"].map(syncType => db.marketplaceSyncJob.findFirst({ where: { marketplaceShopId: shop.id, syncType }, orderBy: { createdAt: "desc" }, select: { marketplaceShopId: true, syncType: true, status: true, createdAt: true, endedAt: true, recordsFailed: true } }))))).filter((job): job is NonNullable<typeof job> => Boolean(job));
 if (!shops.length) coverage.push("No shops match the configured scope; marketplace metrics have no coverage.");
 if (orders.some(o => !o.marketplaceShopId || !ids.includes(o.marketplaceShopId))) coverage.push("Some orders have no recognized shop assignment. They are included in all-shop platform totals but cannot be assigned to a named shop row.");
 return buildMetrics({ inventory, orders, listings, syncs, syncJobs, shops, sales, returns, coverage, returnsAvailable: !coverage.some(c => c.startsWith("ERP returns data could not")) }, settings, scheduled);
}
