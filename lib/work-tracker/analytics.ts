import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dayKey, weekKey, platforms } from "./core";
import type { ReportQuery } from "./reports";

type Order = { marketplace: string; marketplaceOrderId: string; marketplaceShopId: string | null; status: string; orderTotal: number | null; currency: string; orderDate: Date | null; lastSyncedAt?: Date | null };
export function orderValueReport(orders: Order[], q: ReportQuery) {
  const daily: Record<string, Record<string, number>> = {}, weekly: Record<string, Record<string, number>> = {};
  const totals: Record<string, number> = {}, byPlatform: Record<string, Record<string, number>> = {};
  let orderCount = 0, excluded = 0;
  const unique = new Map<string, Order>();
  for (const order of orders) {
    const key = JSON.stringify([order.marketplace.toUpperCase(), order.marketplaceOrderId]);
    const prior = unique.get(key);
    if (!prior || (!prior.marketplaceShopId && order.marketplaceShopId) || (Boolean(prior.marketplaceShopId) === Boolean(order.marketplaceShopId) && +(order.lastSyncedAt || 0) > +(prior.lastSyncedAt || 0))) unique.set(key, order);
  }
  for (const order of unique.values()) {
    const status = order.status.toUpperCase();
    if (!order.orderDate || +order.orderDate < +q.start || +order.orderDate >= +q.end || (q.platform && order.marketplace !== q.platform) || !platforms.includes(order.marketplace as typeof platforms[number])) continue;
    if (/CANCEL|REFUND|FAIL|UNPAID|PAYMENT_PENDING/.test(status) || order.orderTotal === null || !Number.isFinite(order.orderTotal) || order.orderTotal < 0 || !/^[A-Z]{3}$/.test(order.currency)) { excluded++; continue; }
    const day = dayKey(+order.orderDate, q.timeZone), week = weekKey(day), currency = order.currency;
    const add = (values: Record<string, number>) => { values[currency] = Number(((values[currency] || 0) + order.orderTotal!).toFixed(6)); };
    add(totals); daily[day] ||= {}; weekly[week] ||= {}; byPlatform[order.marketplace] ||= {};
    add(daily[day]); add(weekly[week]); add(byPlatform[order.marketplace]); orderCount++;
  }
  return { available: true, totals, byPlatform, daily, weekly, orderCount, excluded,
    definition: "Shop-wide imported order value by order date, in original currencies. Cancelled, refunded, failed and explicitly unpaid/pending-payment orders are excluded. Totals may include shipping/tax and are not net revenue, profit, payouts, or revenue attributable to your tracked time. Activity filters affect time only." };
}
export async function revenue(q: ReportQuery, db: PrismaClient = prisma) {
  if (q.platform === "ERP") return { available: false, reason: "ERP activity has no marketplace order ledger. Choose a marketplace to view business context." };
  const shops = await db.marketplaceShop.findMany({ where: q.platform ? { marketplace: q.platform } : {}, select: { id: true, name: true, status: true, connection: { select: { status: true } } } });
  // Completed pagination jobs validate coverage; individual page logs do not.
  // Live windows are snapshots with at most 15 minutes of synchronization lag.
  const requiredAfter = Math.min(+q.end, Date.now() - 15 * 60000);
  const jobs = await Promise.all(shops.map(shop => db.marketplaceSyncJob.findFirst({ where: { marketplaceShopId: shop.id, syncType: "ORDERS" }, orderBy: { createdAt: "desc" }, select: { status: true, recordsFailed: true, endedAt: true } })));
  const unavailable = shops.filter((shop, i) => shop.status !== "CONNECTED" || shop.connection.status !== "CONNECTED" || !["SUCCESS", "COMPLETED"].includes(jobs[i]?.status || "") || jobs[i]?.recordsFailed || !jobs[i]?.endedAt || +jobs[i]!.endedAt! < requiredAfter);
  if (!shops.length || unavailable.length) return { available: false, reason: shops.length ? `Order sync is incomplete or stale for ${unavailable.map(shop => shop.name).join(", ")}. Synchronize orders before reading totals; missing records do not mean zero sales.` : "No marketplace shops are configured in this scope." };
  const orders = await db.marketplaceOrder.findMany({ where: { orderDate: { gte: q.start, lt: q.end }, ...(q.platform ? { marketplace: q.platform } : {}) }, select: { marketplace: true, marketplaceOrderId: true, marketplaceShopId: true, status: true, orderTotal: true, currency: true, orderDate: true, lastSyncedAt: true } });
  if (orders.some(order => !/CANCEL|REFUND|FAIL|UNPAID|PAYMENT_PENDING/.test(order.status.toUpperCase()) && (order.orderTotal === null || !Number.isFinite(order.orderTotal) || order.orderTotal < 0 || !/^[A-Z]{3}$/.test(order.currency)))) return { available: false, reason: "Some eligible orders have missing amounts or currencies. Review order data before using financial totals." };
  return { ...orderValueReport(orders, q), asOf: new Date(Math.min(...jobs.map(job => +job!.endedAt!))).toISOString() };
}
