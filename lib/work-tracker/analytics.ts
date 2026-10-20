import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dayKey, weekKey, platforms } from "./core";
import type { ReportQuery } from "./reports";

type Order = { marketplace: string; marketplaceOrderId: string; marketplaceShopId: string | null; status: string; orderTotal: number | null; currency: string; orderDate: Date | null };
export function orderValueReport(orders: Order[], q: ReportQuery) {
  const daily: Record<string, Record<string, number>> = {}, weekly: Record<string, Record<string, number>> = {};
  const totals: Record<string, number> = {}, byPlatform: Record<string, Record<string, number>> = {};
  let orderCount = 0, excluded = 0; const seen = new Set<string>();
  for (const order of orders) {
    const key = JSON.stringify([order.marketplaceShopId, order.marketplace, order.marketplaceOrderId]);
    if (seen.has(key)) continue; seen.add(key);
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
  const orders = await db.marketplaceOrder.findMany({ where: { orderDate: { gte: q.start, lt: q.end }, ...(q.platform ? { marketplace: q.platform } : {}) }, select: { marketplace: true, marketplaceOrderId: true, marketplaceShopId: true, status: true, orderTotal: true, currency: true, orderDate: true } });
  return orderValueReport(orders, q);
}
