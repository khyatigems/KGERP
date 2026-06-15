import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { withCache } from "@/lib/simple-cache";

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const cacheKey = `dashboard:${userId ?? "anon"}`;

    const payload = await withCache(cacheKey, 30_000, async () => {
      let dbConnection = 'Local SQLite';
      try {
          const sourceSetting = await prisma.setting.findUnique({
              where: { key: 'DATABASE_SOURCE' },
              select: { value: true }
          });
          if (sourceSetting?.value === 'TURSO_CLOUD_DB') {
              dbConnection = 'Turso Cloud';
          } else if (process.env.DATABASE_URL?.startsWith('libsql') || process.env.DATABASE_URL?.startsWith('https')) {
              dbConnection = 'Turso Cloud';
          }
      } catch {}

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfNextWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

      // Single batch — all 39+ queries in one Promise.all
      const [
        totalInventory, activeListingsRaw, activeQuotations, invoicesGenerated,
        labelCartCount, lastLabelCartItem, recentSales,
        expiringQuotations, overdueInvoices, overdueMemoItems, pendingVendors,
        unsoldInventory, missingCertifications, missingImages, pendingExpenses, highValueUnsold,
        todayInventory, todayQuotations, todayLabels, todayInvoices,
        pendingPaymentsCount,
        inventoryAddedLast30, inventoryAddedPrev30,
        salesLast30, salesPrev30,
        listingsCreatedLast30, listingsCreatedPrev30,
        quotationsCreatedLast30, quotationsCreatedPrev30,
        invoicesCreatedLast30, invoicesCreatedPrev30,
        pendingPaymentsLast30, pendingPaymentsPrev30,
        labelsAddedLast30, labelsAddedPrev30,
        categoryAgg, typeAgg,
        todaySalesCount, todaySalesRevenue, dailyRevenueTrend,
      ] = await Promise.all([
        prisma.inventory.count({ where: { status: "IN_STOCK" } }).catch(() => 0),
        prisma.listing.groupBy({ by: ['platform'], where: { status: { in: ["LISTED", "ACTIVE"] } }, _count: { id: true } }).catch(() => []),
        prisma.quotation.count({ where: { status: "ACTIVE", OR: [{ expiryDate: null }, { expiryDate: { gte: now } }] } }).catch(() => 0),
        prisma.invoice.count().catch(() => 0),
        prisma.labelCartItem.count({ where: { userId: userId ?? "00000000-0000-0000-0000-000000000000", inventory: { id: { not: "" } } } }).catch(() => 0),
        prisma.labelCartItem.findFirst({ where: { userId: userId ?? "00000000-0000-0000-0000-000000000000", inventory: { id: { not: "" } } }, orderBy: { addedAt: 'desc' }, include: { inventory: { select: { sku: true, itemName: true } } } }).catch(() => null),
        prisma.sale.findMany({ take: 5, orderBy: { saleDate: 'desc' }, select: { id: true, customerName: true, netAmount: true, saleDate: true, paymentStatus: true } }).catch(() => []),
        prisma.quotation.findMany({ where: { status: "PENDING_APPROVAL", validUntil: { lt: endOfNextWeek } }, select: { id: true, quotationNumber: true, customerName: true, expiryDate: true }, take: 5 }).catch(() => []),
        prisma.invoice.findMany({ where: { status: "ISSUED", paymentStatus: "UNPAID", dueDate: { lt: now } }, select: { id: true, invoiceNumber: true, totalAmount: true, createdAt: true }, take: 5 }).catch(() => []),
        prisma.memo.findMany({ where: { status: "OPEN", expiryDate: { lt: now }, items: { some: { inventory: { hideFromAttention: false } } } }, select: { id: true, customerName: true, issueDate: true, items: { take: 1, where: { inventory: { hideFromAttention: false } }, include: { inventory: { select: { sku: true } } } } }, take: 5 }).catch(() => []),
        prisma.vendor.count({ where: { status: "PENDING" } }).catch(() => 0),
        prisma.inventory.findMany({ where: { status: "IN_STOCK", hideFromAttention: false, updatedAt: { lt: sixtyDaysAgo } }, select: { id: true, sku: true, createdAt: true }, take: 5 }).catch(() => []),
        prisma.inventory.findMany({ where: { status: "IN_STOCK", hideFromAttention: false, certification: null, certificateNo: null, certificateNumber: null, lab: null, imageUrl: { not: null } }, select: { id: true, sku: true, itemName: true }, take: 5 }).catch(() => []),
        prisma.inventory.findMany({ where: { status: "IN_STOCK", hideFromAttention: false, imageUrl: null }, select: { id: true, sku: true, itemName: true }, take: 5 }).catch(() => []),
        prisma.expense.findMany({ where: { paymentStatus: "PENDING" }, select: { id: true, description: true, totalAmount: true, expenseDate: true }, take: 5 }).catch(() => []),
        prisma.inventory.findMany({ where: { status: "IN_STOCK", hideFromAttention: false, sellingPrice: { gt: 100000 }, updatedAt: { lt: ninetyDaysAgo } }, select: { id: true, sku: true, sellingPrice: true }, take: 5 }).catch(() => []),
        prisma.inventory.count({ where: { createdAt: { gte: startOfDay } } }).catch(() => 0),
        prisma.quotation.count({ where: { createdAt: { gte: startOfDay } } }).catch(() => 0),
        prisma.labelPrintJob.count({ where: { createdAt: { gte: startOfDay } } }).catch(() => 0),
        prisma.invoice.count({ where: { createdAt: { gte: startOfDay } } }).catch(() => 0),
        prisma.sale.count({ where: { paymentStatus: { not: "PAID" } } }).catch(() => 0),
        prisma.inventory.count({ where: { createdAt: { gte: thirtyDaysAgo } } }).catch(() => 0),
        prisma.inventory.count({ where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }).catch(() => 0),
        prisma.sale.count({ where: { saleDate: { gte: thirtyDaysAgo } } }).catch(() => 0),
        prisma.sale.count({ where: { saleDate: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }).catch(() => 0),
        prisma.listing.count({ where: { createdAt: { gte: thirtyDaysAgo } } }).catch(() => 0),
        prisma.listing.count({ where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }).catch(() => 0),
        prisma.quotation.count({ where: { createdAt: { gte: thirtyDaysAgo } } }).catch(() => 0),
        prisma.quotation.count({ where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }).catch(() => 0),
        prisma.invoice.count({ where: { createdAt: { gte: thirtyDaysAgo } } }).catch(() => 0),
        prisma.invoice.count({ where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }).catch(() => 0),
        prisma.sale.count({ where: { paymentStatus: { not: "PAID" }, saleDate: { gte: thirtyDaysAgo } } }).catch(() => 0),
        prisma.sale.count({ where: { paymentStatus: { not: "PAID" }, saleDate: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }).catch(() => 0),
        prisma.labelCartItem.count({ where: { userId: userId ?? "00000000-0000-0000-0000-000000000000", addedAt: { gte: thirtyDaysAgo } } }).catch(() => 0),
        prisma.labelCartItem.count({ where: { userId: userId ?? "00000000-0000-0000-0000-000000000000", addedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }).catch(() => 0),
        prisma.$queryRaw<Array<{ name: string; count: bigint; value: number }>>`
          SELECT i."category" AS name, COUNT(*) AS count, COALESCE(SUM(s."netAmount"), 0) AS value
          FROM "Sale" s
          JOIN "Inventory" i ON s."inventoryId" = i."id"
          WHERE i."category" IS NOT NULL AND i."category" != ''
          GROUP BY i."category"
          ORDER BY value DESC
          LIMIT 5
        `.catch(() => []),
        prisma.$queryRaw<Array<{ name: string; count: bigint; value: number }>>`
          SELECT COALESCE(NULLIF(i."gemType", ''), NULLIF(i."stoneType", ''), 'Unknown') AS name,
                 COUNT(*) AS count, COALESCE(SUM(s."netAmount"), 0) AS value
          FROM "Sale" s
          JOIN "Inventory" i ON s."inventoryId" = i."id"
          GROUP BY name
          ORDER BY value DESC
          LIMIT 5
        `.catch(() => []),
        prisma.sale.count({ where: { saleDate: { gte: startOfToday, lt: endOfToday } } }).catch(() => 0),
        prisma.sale.aggregate({ where: { saleDate: { gte: startOfToday, lt: endOfToday } }, _sum: { netAmount: true } }).catch(() => ({ _sum: { netAmount: null } })),
        prisma.sale.findMany({
          where: { saleDate: { gte: oneYearAgo } },
          select: { saleDate: true, netAmount: true },
          orderBy: { saleDate: "asc" },
        }).then((sales) => {
          const grouped: Record<string, number> = {};
          for (const sale of sales) {
            const d = sale.saleDate;
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            grouped[dateStr] = (grouped[dateStr] || 0) + sale.netAmount;
          }
          return Object.entries(grouped).map(([date, revenue]) => ({ date, revenue }));
        }).catch(() => []),
      ]);

      const percentChange = (current: number, previous: number) => {
        if (previous <= 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      const platformMapping: Record<string, string> = {
        WEBSITE: 'Website', AMAZON: 'Amazon', EBAY: 'eBay', ETSY: 'Etsy', WHATSAPP: 'WhatsApp'
      };
      const activeListings = activeListingsRaw.reduce((acc: Record<string, number>, curr: { platform: string; _count: { id: number } }) => {
        const key = platformMapping[curr.platform.toUpperCase()] || curr.platform;
        acc[key] = (acc[key] || 0) + curr._count.id;
        acc.total = (acc.total || 0) + curr._count.id;
        return acc;
      }, { total: 0 } as Record<string, number>);

      const prevInStockApprox = Math.max(0, totalInventory - inventoryAddedLast30 + salesLast30);
      const netInventoryChange = inventoryAddedLast30 - salesLast30;

      const trends = {
        inventory: percentChange(totalInventory, prevInStockApprox),
        listings: percentChange(listingsCreatedLast30, listingsCreatedPrev30),
        quotations: percentChange(quotationsCreatedLast30, quotationsCreatedPrev30),
        invoices: percentChange(invoicesCreatedLast30, invoicesCreatedPrev30),
        pendingPayments: percentChange(pendingPaymentsLast30, pendingPaymentsPrev30),
        labels: percentChange(labelsAddedLast30, labelsAddedPrev30),
      };

      const normalizedMemo = (overdueMemoItems as Array<{ id: string; customerName: string; issueDate: Date; items: Array<{ inventory: { sku: string } | null }> }>).map((memo) => ({
        id: memo.id,
        inventory: { sku: memo.items?.[0]?.inventory?.sku || "N/A" },
        memo: { customerName: memo.customerName, issueDate: memo.issueDate }
      }));

      return {
        kpis: {
          inventory: { total: totalInventory, trend: trends.inventory, breakdown: { currentTotal: totalInventory, approxPrevTotal: prevInStockApprox, addedLast30: inventoryAddedLast30, addedPrev30: inventoryAddedPrev30, soldLast30: salesLast30, soldPrev30: salesPrev30, netChangeLast30: netInventoryChange } },
          listings: { ...activeListings, trend: trends.listings, breakdown: { createdLast30: listingsCreatedLast30, createdPrev30: listingsCreatedPrev30 } },
          quotations: { total: activeQuotations, trend: trends.quotations, breakdown: { createdLast30: quotationsCreatedLast30, createdPrev30: quotationsCreatedPrev30 } },
          invoices: { total: invoicesGenerated, trend: trends.invoices, breakdown: { createdLast30: invoicesCreatedLast30, createdPrev30: invoicesCreatedPrev30 } },
          pendingPayments: { count: pendingPaymentsCount, trend: trends.pendingPayments, breakdown: { openLast30: pendingPaymentsLast30, openPrev30: pendingPaymentsPrev30 } },
          printLabels: { count: labelCartCount, trend: trends.labels, breakdown: { addedLast30: labelsAddedLast30, addedPrev30: labelsAddedPrev30 }, lastItem: lastLabelCartItem ? `${lastLabelCartItem.inventory.sku} - ${lastLabelCartItem.inventory.itemName}` : null },
          attention: { quotations: expiringQuotations, invoices: overdueInvoices, memo: normalizedMemo, vendors: pendingVendors, unsold: unsoldInventory, missingCertifications, missingImages, pendingExpenses, highValueUnsold },
          today: { inventory: todayInventory, quotations: todayQuotations, labels: todayLabels, invoices: todayInvoices },
          todayRevenue: todaySalesRevenue?._sum?.netAmount ?? 0,
          todayOrders: todaySalesCount,
          revenueTrend: (dailyRevenueTrend as Array<{ date: string; revenue: number }>).map(r => ({ date: r.date, revenue: Number(r.revenue) || 0 })),
        },
        recentSales,
        analytics: {
          bestSellingCategories: (categoryAgg as Array<{ name: string; count: bigint; value: number }>).map(r => ({ name: r.name, count: Number(r.count), value: r.value })),
          bestSellingTypes: (typeAgg as Array<{ name: string; count: bigint; value: number }>).map(r => ({ name: r.name, count: Number(r.count), value: r.value })),
        },
        dbConnection
      };
    });

    const safe = JSON.parse(JSON.stringify(payload, (_key, value) =>
      typeof value === "bigint" ? Number(value) : value
    ));
    return NextResponse.json(safe);

  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
