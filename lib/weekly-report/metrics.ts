import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dayKey } from "@/lib/work-tracker/core";
import { reportingPeriod, percentChange, type ReportSettings } from "./config";

const inventorySelect = { id: true, sku: true, itemName: true, status: true, category: true, gemType: true, costPrice: true, sellingPrice: true, pieces: true, imageUrl: true, certificateNo: true, certificateNumber: true, description: true, productDescription: true, carats: true, weightValue: true, shape: true, color: true, media: { select: { type: true, mediaUrl: true } } } satisfies Prisma.InventorySelect;
type Inventory = Prisma.InventoryGetPayload<{ select: typeof inventorySelect }>;
type Order = { id: string; marketplace: string; marketplaceOrderId: string; marketplaceShopId: string | null; status: string; currency: string; orderTotal: number | null; orderDate: Date | null; items: { quantity: number }[] };
type Listing = { id: string; inventoryId: string | null; platform: string; marketplaceShopId: string | null; externalId: string | null; status: string; syncStatus: string | null; syncError: string | null; listingSku: string | null; marketplaceTitle: string | null; rawMetadata: string | null };
type Shop = { id: string; name: string; marketplace: string; status: string; connection: { status: string } };
type Sync = { marketplaceShopId: string | null; status: string; startedAt: Date; endedAt: Date | null; recordsFailed: number };
export type Data = { inventory: Inventory[]; orders: Order[]; listings: Listing[]; shops: Shop[]; syncs: Sync[]; sales: { inventoryId: string; saleDate: Date }[]; returns: { returnDate: Date; items: { quantity: number }[] }[]; coverage: string[]; returnsAvailable?: boolean };
export type Exception = { sku: string; name: string; status: string; listings: string; missing: string[]; severity: "WARNING" | "CRITICAL"; action: string };
type CurrencyTotals = Record<string, number>;
const sum = (totals: CurrencyTotals, currency: string, amount: number) => { totals[currency] = Number(((totals[currency] || 0) + amount).toFixed(6)); };
export const inPeriod = (value: Date | null, start: Date, end: Date) => Boolean(value && +value >= +start && +value < +end);
export function publication(listing: Listing) {
 try { const raw = JSON.parse(listing.rawMetadata || "{}"); const p = raw.workPublication; if (raw.completeEbay?.state !== "PUBLISHED" || !p || p.listingId !== listing.externalId || typeof p.publishedAt !== "string") return null; const date = new Date(p.publishedAt); return Number.isFinite(+date) ? date : null; } catch { return null; }
}
export function inventoryIssues(item: Inventory, settings: ReportSettings) {
 const missing: string[] = [];
 const present = (v: unknown) => typeof v === "string" && v.trim().length > 0;
 if (!present(item.imageUrl) && !item.media.some(m => m.type.toUpperCase() === "IMAGE" && present(m.mediaUrl))) missing.push("Image");
 if (settings.certificateCategories.some(c => c.toLowerCase() === item.category.toLowerCase()) && !present(item.certificateNo) && !present(item.certificateNumber)) missing.push("Certificate number");
 const applies = !settings.requiredFieldCategories.length || settings.requiredFieldCategories.some(c => c.toLowerCase() === item.category.toLowerCase());
 if (applies) for (const field of settings.requiredFields) {
  const valid = field === "weight" ? Math.max(item.carats || 0, item.weightValue || 0) > 0 : field === "price" ? item.sellingPrice > 0 : field === "description" ? present(item.description) || present(item.productDescription) : present(item[field]);
  if (!valid) missing.push(field);
 }
 return missing;
}
function aggregateOrders(orders: Order[], start: Date, end: Date, timezone: string) {
 const seen = new Set<string>(), conflicts: string[] = [], shopByOrder = new Map<string, string | null>();
 const totals: CurrencyTotals = {}, amountOrderCounts: Record<string, number> = {}, daily: Record<string, CurrencyTotals> = {}, byShop: Record<string, { orders: number; units: number; value: CurrencyTotals; cancelled: number; refunded: number }> = {};
 let count = 0, units = 0, cancelled = 0, refunded = 0, excluded = 0, unknownAmounts = 0;
 for (const order of orders) {
  if (!inPeriod(order.orderDate, start, end)) continue;
  const key = JSON.stringify([order.marketplace, order.marketplaceOrderId]);
  if (seen.has(key)) { if (shopByOrder.get(key) !== order.marketplaceShopId) conflicts.push(key); continue; }
  seen.add(key); shopByOrder.set(key, order.marketplaceShopId);
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
 return { count, units, cancelled, refunded, excluded, unknownAmounts, totals, averageOrderValue: Object.fromEntries(Object.entries(totals).map(([c, n]) => [c, Number((n / amountOrderCounts[c]).toFixed(2))])), daily, byShop, conflicts: conflicts.length };
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
 const groupedListings = new Map<string, Listing>();
 for (const listing of data.listings.filter(l => l.externalId)) {
  const key = JSON.stringify([listing.platform, listing.externalId]), prior = groupedListings.get(key), date = publication(listing), priorDate = prior ? publication(prior) : null;
  if (!prior || (date && (!priorDate || +date < +priorDate))) groupedListings.set(key, listing);
 }
 const distinctListings = [...groupedListings.values()];
 const newListings = distinctListings.flatMap(l => { const date = publication(l); return date && inPeriod(date, period.start, period.end) ? [{ platform: l.platform, shopId: l.marketplaceShopId, externalId: l.externalId!, sku: l.listingSku || "Unavailable", name: l.marketplaceTitle || "Unavailable", publishedAt: date.toISOString(), status: l.status }] : []; });
 const previousPublished = distinctListings.filter(l => inPeriod(publication(l), period.previousStart, period.start)).length;
 const shopRows = data.shops.map(shop => {
  const syncs = data.syncs.filter(s => s.marketplaceShopId === shop.id).sort((a, b) => +(b.endedAt || b.startedAt) - +(a.endedAt || a.startedAt));
  const lastSuccess = syncs.find(s => ["SUCCESS", "PARTIAL"].includes(s.status) && s.endedAt)?.endedAt || null;
  const hours = lastSuccess ? (+generated - +lastSuccess) / 3600000 : null;
  const connected = shop.status === "CONNECTED" && shop.connection.status === "CONNECTED";
  const listings = distinctListings.filter(l => l.marketplaceShopId === shop.id);
  const value = current.byShop[shop.id], prior = previous.byShop[shop.id];
  const valueCurrencies = new Set([...Object.keys(value?.value || {}), ...Object.keys(prior?.value || {})]);
  const revenueChange = Object.fromEntries([...valueCurrencies].map(currency => [currency, percentChange(value?.value[currency] || 0, prior?.value[currency] || 0)]));
  return { id: shop.id, name: shop.name, platform: shop.marketplace, connected, lastSuccess: lastSuccess?.toISOString() || null, syncAgeHours: hours, stale: !lastSuccess || hours! >= settings.rules.staleSyncHours.warning,
   activeListings: listings.filter(l => ["ACTIVE", "LISTED"].includes(l.status.toUpperCase())).length,
   newListings: shop.marketplace === "EBAY" ? newListings.filter(l => l.shopId === shop.id).length : null,
   failedListingRecords: data.listings.filter(l => l.marketplaceShopId === shop.id && (l.syncStatus === "FAILED" || l.syncError)).length,
   failedSyncs: syncs.filter(s => inPeriod(s.startedAt, period.start, period.end) && ["FAILED", "PARTIAL"].includes(s.status)).length,
   orders: value?.orders || 0, units: value?.units || 0, value: value?.value || {}, cancelled: value?.cancelled || 0, refunded: value?.refunded || 0,
   orderChange: settings.comparisons ? percentChange(value?.orders || 0, prior?.orders || 0) : null,
   unitChange: settings.comparisons ? percentChange(value?.units || 0, prior?.units || 0) : null,
   revenueChange: settings.comparisons ? revenueChange : {},
  };
 });
 const alerts: { rule: string; severity: "WARNING" | "CRITICAL"; message: string; action: string }[] = [];
 const alert = (key: keyof ReportSettings["rules"], value: number, message: string, action: string, zero = false) => { const rule = settings.rules[key]; if (rule.enabled && (zero ? value === 0 : value >= rule.warning)) alerts.push({ rule: key, severity: value >= rule.critical && rule.severity === "CRITICAL" ? "CRITICAL" : "WARNING", message, action }); };
 const incompletePercent = inventory.length ? exceptions.length / inventory.length * 100 : 0;
 alert("missingImages", missingFields.Image || 0, `${missingFields.Image || 0} products have no image.`, "Add clear product images.");
 if (settings.certificateCategories.length) alert("missingCertificates", missingFields["Certificate number"] || 0, `${missingFields["Certificate number"] || 0} certificate-required products need a certificate number.`, "Verify certification for the configured categories.");
 alert("incompletePercent", incompletePercent, `${incompletePercent.toFixed(1)}% of the current inventory snapshot is incomplete.`, "Resolve the SKU exception register.");
 const staleShops = shopRows.filter(s => !s.connected || s.stale);
 for (const shop of staleShops) alert("staleSyncHours", shop.syncAgeHours ?? settings.rules.staleSyncHours.critical, `${shop.name}: ${!shop.connected ? "disconnected" : shop.lastSuccess ? "stale synchronization" : "no successful synchronization recorded"}.`, "Reconnect or synchronize this shop before relying on comparisons.");
 alert("zeroOrders", current.count, "No marketplace orders were recorded in this period.", "Check scope, connections and synchronization before concluding demand is zero.", true);
 alert("failedListings", shopRows.reduce((n, s) => n + s.failedListingRecords, 0), "Listing records currently contain synchronization errors.", "Review failed listing records; these are not dated publication attempts.");
 alert("inventoryInconsistencies", inconsistencies, `${inconsistencies} inventory records have invalid prices or piece counts.`, "Review these inventory values.");
 const revenueChanges = Object.fromEntries([...new Set([...Object.keys(current.totals), ...Object.keys(previous.totals)])].map(c => [c, percentChange(current.totals[c] || 0, previous.totals[c] || 0)]));
 if (settings.comparisons) for (const [currency, change] of Object.entries(revenueChanges)) if (change !== null && change < 0) alert("revenueDeclinePercent", -change, `${currency} recorded order value declined ${(-change).toFixed(1)}%.`, "Review shop-level demand and data freshness.");
 const sold = new Set(data.sales.filter(s => inPeriod(s.saleDate, period.start, period.end)).map(s => s.inventoryId));
 const returns = data.returns.filter(r => inPeriod(r.returnDate, period.start, period.end));
 if (current.conflicts) coverage.push(`${current.conflicts} external order IDs have conflicting shop assignment; each order counted once.`);
 if (current.unknownAmounts) coverage.push(`${current.unknownAmounts} eligible orders lack a valid amount/currency; order totals are incomplete.`);
 if (staleShops.length) coverage.push(`${staleShops.length} shops are disconnected, stale or have no recorded successful synchronization. Comparisons can be misleading.`);
 if (data.orders.some(o => !o.orderDate)) coverage.push("Some imported orders have no source order date and are excluded from dated metrics.");
 coverage.push("Inventory completeness, availability, valuation and active listings are generation-time snapshots. Historical week-end inventory and prior-week completeness are unavailable.", "New listings cover confirmed ERP eBay publications only; imported creation dates and Etsy draft dates are not publication evidence. Historical failed publication-attempt counts are unavailable.", "Cancellation/refund/unpaid exclusions recognize recorded status strings only. The eBay connector stores fulfillment status rather than a verified payment/refund ledger; comprehensive cancellation/refund counts and payment confirmation are unavailable. Marketplace amounts are recorded order totals, may include shipping/tax, and are not cash receipts, settlements or net profit. Refund, tax, discount and shipping amounts cannot be reliably separated. Net sales and consolidated historical INR are unavailable.", "Physical SKU counts, marketplace listing counts, order counts and item quantities are distinct measures. ERP sales/returns are separate ledgers and are not added to marketplace revenue.");
 if (!settings.certificateCategories.length) coverage.push("Certificate-required categories are not configured; certificate completeness is not assessed. Certificate document availability cannot be verified from CertificateCode reference data.");
 return { schemaVersion: 1, generatedAt: generated.toISOString(), period: { start: period.start.toISOString(), end: period.end.toISOString(), startDay: period.startDay, endDay: period.endDay, previousStart: period.previousStart.toISOString(), timezone: settings.timezone },
  inventory: { physicalSkus: inventory.length, inStock: byStatus.IN_STOCK || 0, byStatus, byGemstone, costValuation: settings.valuation ? Number(cost.toFixed(2)) : null, askingValuation: settings.valuation ? Number(asking.toFixed(2)) : null, valuationCurrency: "INR (existing inventory cost/selling-price convention)", incomplete: exceptions.length, incompletePercent, missingFields, certificateEligible: settings.certificateCategories.length ? inventory.filter(i => settings.certificateCategories.includes(i.category)).length : null, inconsistencies },
  current, previous: settings.comparisons ? previous : null, comparisons: settings.comparisons ? { orders: percentChange(current.count, previous.count), units: percentChange(current.units, previous.units), revenue: revenueChanges, newListings: percentChange(newListings.length, previousPublished) } : null,
  shops: shopRows, newListings, previousPublished, newListingsCoverage: "PARTIAL", soldPhysicalSkus: sold.size, erpSaleRows: data.sales.filter(s => inPeriod(s.saleDate, period.start, period.end)).length,
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
  paged(cursor => db.marketplaceSyncLog.findMany({ ...cursorPage(cursor), where: { marketplaceShopId: { in: ids } }, select: { id: true, marketplaceShopId: true, status: true, startedAt: true, endedAt: true, recordsFailed: true } })),
  paged(cursor => db.sale.findMany({ ...cursorPage(cursor), where: { saleDate: { gte: settings.comparisons ? period.previousStart : period.start, lt: period.end } }, select: { id: true, inventoryId: true, saleDate: true } })),
  paged(cursor => db.salesReturn.findMany({ ...cursorPage(cursor), where: { returnDate: { gte: period.start, lt: period.end } }, select: { id: true, returnDate: true, items: { select: { quantity: true } } } })).catch(() => { coverage.push("ERP returns data could not be read; return counts are unavailable."); return []; }),
 ]);
 if (!shops.length) coverage.push("No shops match the configured scope; marketplace metrics have no coverage.");
 if (orders.some(o => !o.marketplaceShopId || !ids.includes(o.marketplaceShopId))) coverage.push("Some orders have no recognized shop assignment. They are included in all-shop platform totals but cannot be assigned to a named shop row.");
 return buildMetrics({ inventory, orders, listings, syncs, shops, sales, returns, coverage, returnsAvailable: !coverage.some(c => c.startsWith("ERP returns data could not")) }, settings, scheduled);
}
