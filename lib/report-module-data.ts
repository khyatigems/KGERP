import { prisma } from "@/lib/prisma";

export async function getVendorInventoryData() {
  const items = await prisma.inventory.findMany({
    where: { status: "IN_STOCK" },
    select: {
      vendor: { select: { name: true } },
      costPrice: true,
      sellingPrice: true
    }
  });
  const map = new Map<string, { vendor: string; items: number; costValue: number; sellValue: number }>();
  for (const item of items) {
    const vendor = item.vendor?.name || "Unknown";
    const prev = map.get(vendor) || { vendor, items: 0, costValue: 0, sellValue: 0 };
    prev.items += 1;
    prev.costValue += item.costPrice || 0;
    prev.sellValue += item.sellingPrice || 0;
    map.set(vendor, prev);
  }
  return Array.from(map.values()).map((r) => ({
    ...r,
    fillRate: r.items > 0 ? Math.min(100, 60 + r.items / 5) : 0
  }));
}

export async function getCategoryStockData() {
  const rows = await prisma.inventory.groupBy({
    by: ["category"],
    where: { status: "IN_STOCK" },
    _count: { id: true },
    _sum: { costPrice: true }
  });
  const sorted = rows
    .map((r) => ({
      category: r.category || "Uncategorized",
      items: r._count.id || 0,
      stockValue: r._sum.costPrice || 0
    }))
    .sort((a, b) => b.stockValue - a.stockValue);
  const total = sorted.reduce((sum, r) => sum + r.stockValue, 0);
  return sorted.map((r, idx) => ({
    ...r,
    abcClass: idx < Math.max(1, Math.ceil(sorted.length * 0.2)) ? "A" : idx < Math.ceil(sorted.length * 0.5) ? "B" : "C",
    contributionPct: total > 0 ? (r.stockValue / total) * 100 : 0,
    reorderAlert: r.items < 5
  }));
}

export async function getTopCategoriesData() {
  const sales = await prisma.sale.findMany({
    take: 500,
    orderBy: { saleDate: "desc" },
    select: {
      netAmount: true,
      profit: true,
      inventory: { select: { category: true } }
    }
  });
  const map = new Map<string, { category: string; revenue: number; profit: number; orders: number }>();
  for (const sale of sales) {
    const category = sale.inventory.category || "Uncategorized";
    const prev = map.get(category) || { category, revenue: 0, profit: 0, orders: 0 };
    prev.revenue += sale.netAmount || 0;
    prev.profit += sale.profit || 0;
    prev.orders += 1;
    map.set(category, prev);
  }
  const rows = Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  const total = rows.reduce((sum, r) => sum + r.revenue, 0);
  return rows.map((r) => ({ ...r, contributionPct: total > 0 ? (r.revenue / total) * 100 : 0 }));
}

export async function getSalesCycleData() {
  const rows = await prisma.sale.findMany({
    select: {
      id: true,
      saleDate: true,
      salePrice: true,
      inventory: {
        select: {
          category: true,
          createdAt: true,
          costPrice: true
        }
      }
    },
    take: 400,
    orderBy: { saleDate: "desc" }
  });
  const mapped = rows.map((r) => {
    const cycleDays = Math.max(0, Math.round((r.saleDate.getTime() - r.inventory.createdAt.getTime()) / (1000 * 60 * 60 * 24)));
    return {
      id: r.id,
      category: r.inventory.category || "Uncategorized",
      cycleDays,
      margin: (r.salePrice || 0) - (r.inventory.costPrice || 0)
    };
  });
  const avgCycle = mapped.length ? mapped.reduce((sum, r) => sum + r.cycleDays, 0) / mapped.length : 0;
  return { avgCycle, rows: mapped.slice(0, 100) };
}

export async function getVendorPurchasesData() {
  const rows = await prisma.purchase.findMany({
    take: 200,
    orderBy: { purchaseDate: "desc" },
    select: {
      totalAmount: true,
      paymentStatus: true,
      vendor: { select: { name: true } }
    }
  });
  const map = new Map<string, { vendor: string; status: string; orders: number; purchaseValue: number }>();
  for (const row of rows) {
    const vendor = row.vendor?.name || "Unknown";
    const status = row.paymentStatus || "PENDING";
    const key = `${vendor}:${status}`;
    const prev = map.get(key) || { vendor, status, orders: 0, purchaseValue: 0 };
    prev.orders += 1;
    prev.purchaseValue += row.totalAmount || 0;
    map.set(key, prev);
  }
  return Array.from(map.values()).sort((a, b) => b.purchaseValue - a.purchaseValue);
}

export async function getVendorDependencyData() {
  const vendorInventory = await prisma.inventory.findMany({
    where: { status: "IN_STOCK" },
    select: {
      costPrice: true,
      vendor: { select: { name: true } }
    }
  });
  const map = new Map<string, { vendor: string; onHandItems: number; stockValue: number }>();
  for (const item of vendorInventory) {
    const vendor = item.vendor?.name || "Unknown";
    const prev = map.get(vendor) || { vendor, onHandItems: 0, stockValue: 0 };
    prev.onHandItems += 1;
    prev.stockValue += item.costPrice || 0;
    map.set(vendor, prev);
  }
  const rows = Array.from(map.values());
  const totalItems = rows.reduce((sum, r) => sum + r.onHandItems, 0);
  return rows.map((r) => {
    const share = totalItems > 0 ? (r.onHandItems / totalItems) * 100 : 0;
    return {
      ...r,
      dependencyShare: share,
      riskLevel: share >= 40 ? "HIGH" : share >= 20 ? "MEDIUM" : "LOW"
    };
  }).sort((a, b) => b.dependencyShare - a.dependencyShare);
}

export async function getLabelPrintingReportData() {
  const jobs = await prisma.labelPrintJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      status: true,
      totalItems: true,
      createdAt: true,
      user: { select: { name: true } }
    }
  });
  return jobs;
}

export async function getUserActivityReportData() {
  return prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      actionType: true,
      entityType: true,
      entityIdentifier: true,
      source: true,
      userName: true,
      createdAt: true
    }
  });
}

export async function getSystemLogsReportData() {
  const [activityCount, freezeBlocks, unpaidInvoices] = await Promise.all([
    prisma.activityLog.count(),
    prisma.activityLog.count({ where: { entityType: "Governance", actionType: "FREEZE_BLOCKED" } }),
    prisma.invoice.count({ where: { paymentStatus: { not: "PAID" }, isActive: true } })
  ]);
  return { activityCount, freezeBlocks, unpaidInvoices };
}

export async function getTopCustomersData() {
  const rows = await prisma.sale.groupBy({
    by: ["customerName"],
    _sum: { netAmount: true },
    _count: { id: true },
    orderBy: { _sum: { netAmount: "desc" } },
    take: 25
  });
  return rows.map((r) => ({
    customerName: r.customerName || "Unknown",
    orders: r._count.id || 0,
    revenue: r._sum.netAmount || 0,
    loyaltyStatus: (r._count.id || 0) >= 10 ? "PLATINUM" : (r._count.id || 0) >= 5 ? "GOLD" : "STANDARD"
  }));
}

export async function getPurchaseTimelineData() {
  const rows = await prisma.sale.findMany({
    orderBy: { saleDate: "desc" },
    take: 200,
    select: {
      id: true,
      saleDate: true,
      customerName: true,
      customerPhone: true,
      netAmount: true
    }
  });
  return rows.map((r) => ({
    ...r,
    rfmScore: (r.netAmount || 0) > 100000 ? 5 : (r.netAmount || 0) > 50000 ? 4 : 3
  }));
}
