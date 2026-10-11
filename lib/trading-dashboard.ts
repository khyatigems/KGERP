import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { checkUserPermissions, PERMISSIONS } from "@/lib/permissions";
import { isProtectedRole } from "@/lib/permission-display";
import { invalidateCache, withCache } from "@/lib/simple-cache";
import type { TradingDashboardData } from "./trading-dashboard-types";

// Core ERP preparation only. Channel-specific rules are checked by listing preparation.
export function buildPreparedUnlistedWhere(): Prisma.InventoryWhereInput {
  return {
    status: "IN_STOCK",
    itemName: { not: "" },
    AND: [
      { OR: [{ imageUrl: { not: "" } }, { media: { some: { type: "IMAGE" } } }] },
      { OR: [{ description: { not: "" } }, { productDescription: { not: "" } }, { etsyDescription: { not: "" } }] },
      { OR: [{ sellingPrice: { gt: 0 } }, { flatSellingPrice: { gt: 0 } }, { sellingRatePerCarat: { gt: 0 }, weightValue: { gt: 0 } }] },
    ],
    listings: { none: activeChannelListingWhere },
  };
}
export const activeChannelListingWhere: Prisma.ListingWhereInput = {
  marketplaceShopId: { not: null },
  platform: { in: ["EBAY", "ETSY", "eBay", "Etsy", "ebay", "etsy"] },
  status: { in: ["ACTIVE", "LISTED"] },
};

export function visibleActivityChanges(raw: string | null, canViewCost: boolean) {
  const allowed = new Set(["sku", "itemName", "status", "sellingPrice", "flatSellingPrice", "sellingRatePerCarat", "stockLocation", "quantity", "totalAmount", "invoiceNumber", "paymentStatus"]);
  if (canViewCost) ["costPrice", "flatPurchaseCost", "purchaseRatePerCarat"].forEach(key => allowed.add(key));
  try {
    const changes = (JSON.parse(raw || "{}") as { changes?: Record<string, { old?: unknown; new?: unknown }> }).changes;
    if (!changes || typeof changes !== "object") return [];
    const value = (v: unknown) => v == null ? "—" : ["string", "number", "boolean"].includes(typeof v) ? String(v).slice(0, 120) : "Updated";
    return Object.entries(changes).filter(([key]) => allowed.has(key)).slice(0, 8).map(([field, change]) => ({ field, before: value(change?.old), after: value(change?.new) }));
  } catch { return []; }
}

export async function getTradingDashboard(userId: string, force = false): Promise<TradingDashboardData> {
  // Re-evaluate access before consulting data caches; role changes take effect immediately.
  const permissions = await checkUserPermissions(userId, [PERMISSIONS.INVENTORY_VIEW, PERMISSIONS.INVENTORY_VIEW_COST, PERMISSIONS.LISTINGS_VIEW, PERMISSIONS.SALES_VIEW, PERMISSIONS.CUSTOMER_VIEW, PERMISSIONS.ACTIVITY_VIEW, PERMISSIONS.REPORTS_VIEW]);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  const teamActivity = isProtectedRole(user?.role);
  const access = {
    inventory: !!permissions.get(PERMISSIONS.INVENTORY_VIEW), listings: !!permissions.get(PERMISSIONS.LISTINGS_VIEW),
    sales: !!permissions.get(PERMISSIONS.SALES_VIEW), customers: !!permissions.get(PERMISSIONS.CUSTOMER_VIEW),
    activity: teamActivity || !!permissions.get(PERMISSIONS.ACTIVITY_VIEW) || !!permissions.get(PERMISSIONS.REPORTS_VIEW), teamActivity,
  };
  const canViewCost = !!permissions.get(PERMISSIONS.INVENTORY_VIEW_COST);
  const key = `trading-dashboard:${userId}:${Object.values(access).join(":")}:${canViewCost}`;
  const load = async (): Promise<TradingDashboardData> => {
    const now = new Date();
    const indiaDate = new Date(now.getTime() + 330 * 60_000);
    const month = new Date(Date.UTC(indiaDate.getUTCFullYear(), indiaDate.getUTCMonth(), 1) - 330 * 60_000);
    const unavailable: string[] = [];
    // A failed section is marked unavailable, never silently presented as zero.
    const section = async <T,>(name: string, fn: () => Promise<T>): Promise<T | null> => {
      try { return await fn(); } catch (error) { console.error(`Trading dashboard ${name} failed`, error); unavailable.push(name); return null; }
    };
    const invoiceWhere: Prisma.InvoiceWhereInput = { isActive: true, status: { notIn: ["DRAFT", "CANCELLED", "VOID"] }, OR: [{ invoiceDate: { gte: month } }, { invoiceDate: null, createdAt: { gte: month } }] };
    const [inventory, marketplace, invoices, customers, activity] = await Promise.all([
      access.inventory ? section("inventory", async () => {
        const [groups, listed, prepared] = await Promise.all([
          prisma.inventory.groupBy({ by: ["gemType"], where: { status: "IN_STOCK" }, _count: { id: true } }),
          access.listings ? prisma.inventory.count({ where: { status: "IN_STOCK", listings: { some: activeChannelListingWhere } } }) : null,
          access.listings ? prisma.inventory.count({ where: buildPreparedUnlistedWhere() }) : null,
        ]);
        const combined = new Map<string, number>();
        for (const row of groups) { const name = row.gemType?.trim() || "Unspecified gemstone"; combined.set(name, (combined.get(name) || 0) + row._count.id); }
        const gemstones = [...combined].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
        const total = gemstones.reduce((sum, row) => sum + row.count, 0);
        if (gemstones.length > 5) { const rest = gemstones.splice(4); gemstones.push({ name: "Other gemstones", count: rest.reduce((sum, row) => sum + row.count, 0) }); }
        return { total, listed, unlisted: listed === null ? null : Math.max(0, total - listed), preparedUnlisted: prepared, gemstones };
      }) : null,
      access.listings ? section("marketplace", async () => {
        const [shops, counts, syncs, errors] = await Promise.all([
          prisma.marketplaceShop.findMany({ where: { marketplace: { in: ["EBAY", "ETSY", "eBay", "Etsy", "ebay", "etsy"] } }, select: { id: true, name: true, marketplace: true, status: true, connection: { select: { status: true } } }, orderBy: [{ marketplace: "asc" }, { name: "asc" }] }),
          prisma.listing.groupBy({ by: ["marketplaceShopId", "status", "syncStatus"], where: { marketplaceShopId: { not: null } }, _count: { id: true }, _max: { lastSyncedAt: true } }),
          prisma.marketplaceSyncLog.groupBy({ by: ["marketplaceShopId"], where: { status: { in: ["COMPLETED", "SUCCESS", "PARTIAL"] } }, _max: { endedAt: true } }),
          prisma.listing.groupBy({ by: ["marketplaceShopId"], where: { marketplaceShopId: { not: null }, OR: [{ syncError: { not: "" } }, { syncStatus: { in: ["FAILED", "ERROR", "CONFLICT"] } }] }, _count: { id: true } }),
        ]);
        const errorMap = new Map(errors.map(row => [row.marketplaceShopId, row._count.id]));
        const summaries = new Map<string, { active: number; drafts: number; errors: number; lastSyncedAt: Date | null }>();
        for (const row of counts) {
          const id = row.marketplaceShopId!;
          const summary = summaries.get(id) || { active: 0, drafts: 0, errors: 0, lastSyncedAt: null };
          if (["ACTIVE", "LISTED"].includes(row.status)) summary.active += row._count.id;
          if (row.status === "DRAFT" || row.syncStatus === "DRAFT") summary.drafts += row._count.id;
          if (row._max.lastSyncedAt && (!summary.lastSyncedAt || row._max.lastSyncedAt > summary.lastSyncedAt)) summary.lastSyncedAt = row._max.lastSyncedAt;
          summaries.set(id, summary);
        }
        const result = shops.map(shop => {
          const data = summaries.get(shop.id) || { active: 0, drafts: 0, errors: 0, lastSyncedAt: null };
          const syncDate = syncs.find(row => row.marketplaceShopId === shop.id)?._max.endedAt;
          const lastSynced = syncDate && (!data.lastSyncedAt || syncDate > data.lastSyncedAt) ? syncDate : data.lastSyncedAt;
          return { id: shop.id, name: shop.name, platform: shop.marketplace.toUpperCase(), connected: shop.status === "CONNECTED" && shop.connection.status === "CONNECTED", active: data.active, drafts: data.drafts, errors: errorMap.get(shop.id) || 0, lastSyncedAt: lastSynced?.toISOString() || null };
        });
        return { total: result.reduce((sum, shop) => sum + shop.active, 0), shops: result };
      }) : null,
      access.sales ? section("invoices", async () => {
        const [counts, rows] = await Promise.all([
          prisma.invoice.groupBy({ by: ["invoiceType", "paymentStatus"], where: invoiceWhere, _count: { id: true } }),
          prisma.invoice.findMany({ where: { isActive: true, status: { notIn: ["DRAFT", "CANCELLED", "VOID"] } }, take: 6, orderBy: { createdAt: "desc" }, select: { id: true, invoiceNumber: true, invoiceType: true, invoiceCurrency: true, totalAmount: true, paymentStatus: true, countryOfDestination: true, sales: { take: 1, select: { customerName: true, customer: { select: { name: true, country: true } } } } } }),
        ]);
        const total = counts.reduce((sum, row) => sum + row._count.id, 0);
        const exportCount = counts.filter(row => ["EXPORT_INVOICE", "EXPORT"].includes(row.invoiceType)).reduce((sum, row) => sum + row._count.id, 0);
        const tax = counts.filter(row => ["TAX_INVOICE", "TAX"].includes(row.invoiceType)).reduce((sum, row) => sum + row._count.id, 0);
        return { total, export: exportCount, tax, other: total - exportCount - tax, unpaid: counts.filter(row => row.paymentStatus !== "PAID").reduce((sum, row) => sum + row._count.id, 0), recent: rows.map(row => ({ id: row.id, number: row.invoiceNumber, type: ["EXPORT_INVOICE", "EXPORT"].includes(row.invoiceType) ? "EXPORT" : ["TAX_INVOICE", "TAX"].includes(row.invoiceType) ? "TAX" : row.invoiceType, currency: row.invoiceCurrency || (["TAX_INVOICE", "TAX"].includes(row.invoiceType) ? "INR" : null), amount: row.totalAmount, paymentStatus: row.paymentStatus, customer: row.sales[0]?.customer?.name || row.sales[0]?.customerName || "Customer not linked", country: row.countryOfDestination || row.sales[0]?.customer?.country || null })) };
      }) : null,
      access.customers ? section("customers", async () => {
        const [newCount, returningBuyers] = await Promise.all([
          prisma.customer.count({ where: { createdAt: { gte: month } } }),
          prisma.customer.count({ where: { AND: [{ sales: { some: { saleDate: { gte: month } } } }, { sales: { some: { saleDate: { lt: month } } } }] } }),
        ]);
        return { new: newCount, returningBuyers };
      }) : null,
      access.activity ? section("activity", async () => {
        const logs = await prisma.activityLog.findMany({ where: { ...(teamActivity ? {} : { userId }), actionType: { notIn: ["PUBLIC_VIEW", "QR_SCAN"] } }, take: 12, orderBy: { createdAt: "desc" }, select: { id: true, userId: true, userName: true, action: true, actionType: true, entityType: true, entityIdentifier: true, referenceId: true, createdAt: true, fieldChanges: true } });
        const actors = await prisma.user.findMany({ where: { id: { in: [...new Set(logs.map(log => log.userId).filter((id): id is string => !!id))] } }, select: { id: true, name: true, role: true } });
        const actorMap = new Map(actors.map(actor => [actor.id, actor]));
        return logs.map(log => ({ id: log.id, actorId: log.userId, actor: actorMap.get(log.userId || "")?.name || log.userName || "System", role: actorMap.get(log.userId || "")?.role || null, action: log.action || log.actionType || "Activity", entity: log.entityType || "ERP", reference: log.entityIdentifier || log.referenceId || "", createdAt: log.createdAt.toISOString(), changes: visibleActivityChanges(log.fieldChanges, canViewCost) }));
      }) : null,
    ]);
    return { updatedAt: now.toISOString(), period: now.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", month: "long", year: "numeric" }), access, unavailable, inventory, marketplace, invoices, customers, activity: activity || [] };
  };
  // Refresh replaces cached data too, so switching views cannot restore stale counts.
  if (force) invalidateCache(key);
  return withCache(key, 30_000, load);
}
