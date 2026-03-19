import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

type InventoryAgingFilters = {
  bucket?: string;
  category?: string;
  vendor?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};

export type BucketStat = {
  bucket: string;
  items: number;
  costValue: number;
  sellValue: number;
};

export type InventoryAgingRow = {
  id: string;
  inventoryId: string;
  sku: string;
  itemName: string;
  category: string;
  vendorName: string;
  purchaseCost: number;
  sellingPrice: number;
  daysInStock: number;
  status: string;
  ageBucket: string;
  createdAt: Date;
};

export type InventoryAgingAnalytics = {
  rows: InventoryAgingRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  categories: string[];
  vendors: string[];
  bucketStats: BucketStat[];
};

export type CapitalRotationCategoryRow = {
  category: string;
  avgSellDays: number;
  rotationRate: number;
  avgProfit: number;
  soldItems: number;
  purchaseValue: number;
  sellValue: number;
};

export type CapitalRotationAnalytics = {
  overall: {
    avgSellDays: number;
    annualRotation: number;
    soldItems: number;
    purchaseValue: number;
    sellValue: number;
  };
  byCategory: CapitalRotationCategoryRow[];
  ageValueByBucket: BucketStat[];
};

function daysBetween(a: Date, b: Date) {
  const ms = a.getTime() - b.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function toAgeBucket(days: number) {
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  if (days <= 180) return "91-180";
  return "180+";
}

function getInventoryCost(inv: { flatPurchaseCost: number | null; costPrice: number }) {
  const value = inv.flatPurchaseCost ?? inv.costPrice ?? 0;
  return Number.isFinite(value) ? value : 0;
}

function getInventorySell(inv: {
  pricingMode: string;
  weightValue: number | null;
  sellingRatePerCarat: number | null;
  flatSellingPrice: number | null;
  sellingPrice: number;
}) {
  if (inv.pricingMode === "PER_CARAT" && inv.weightValue && inv.sellingRatePerCarat) {
    return inv.weightValue * inv.sellingRatePerCarat;
  }
  if (inv.pricingMode === "FLAT" && inv.flatSellingPrice) return inv.flatSellingPrice;
  return inv.sellingPrice ?? 0;
}

async function buildReportsAnalyticsSummary() {
  const [latest, snapshotInventoryCount, snapshotSalesCount] = await Promise.all([
    prisma.analyticsDailySnapshot.findFirst({ orderBy: { snapshotDate: "desc" } }).catch(() => null),
    prisma.analyticsInventorySnapshot.count({ where: { status: "IN_STOCK" } }).catch(() => 0),
    prisma.analyticsSalesSnapshot.count().catch(() => 0)
  ]);

  const snapshotsReady = !!latest && snapshotInventoryCount > 0;
  if (snapshotsReady) {
    const [agingBuckets, avgCycle, capitalAtRisk] = await Promise.all([
      prisma.analyticsInventorySnapshot.groupBy({
        by: ["ageBucket"],
        where: { status: "IN_STOCK" },
        _count: { id: true },
        _sum: { purchaseCost: true, sellingPrice: true }
      }),
      prisma.analyticsSalesSnapshot.aggregate({
        _avg: { saleCycleDays: true, profitAmount: true },
        _count: { id: true }
      }),
      prisma.analyticsInventorySnapshot.aggregate({
        where: { status: "IN_STOCK", daysInStock: { gt: 90 } },
        _sum: { purchaseCost: true, sellingPrice: true },
        _count: { id: true }
      })
    ]);

    return {
      latestSnapshot: latest,
      agingBuckets,
      salesCycle: {
        avgDays: avgCycle._avg.saleCycleDays || 0,
        avgProfit: avgCycle._avg.profitAmount || 0,
        soldItems: avgCycle._count.id || 0
      },
      capitalAtRisk: {
        items: capitalAtRisk._count.id || 0,
        costValue: capitalAtRisk._sum.purchaseCost || 0,
        sellValue: capitalAtRisk._sum.sellingPrice || 0
      }
    };
  }

  const today = new Date();
  const inventoryRows = await prisma.inventory.findMany({
    where: { status: "IN_STOCK" },
    select: {
      id: true,
      category: true,
      createdAt: true,
      pricingMode: true,
      weightValue: true,
      sellingRatePerCarat: true,
      flatSellingPrice: true,
      sellingPrice: true,
      flatPurchaseCost: true,
      costPrice: true,
    }
  });

  const bucketAgg = new Map<string, { items: number; costValue: number; sellValue: number }>();
  let totalSell = 0;
  let totalCost = 0;
  let riskyItems = 0;
  let riskyCost = 0;
  let riskySell = 0;
  for (const inv of inventoryRows) {
    const days = daysBetween(today, inv.createdAt);
    const bucket = toAgeBucket(days);
    const cost = getInventoryCost(inv);
    const sell = getInventorySell(inv);
    totalSell += sell;
    totalCost += cost;
    const row = bucketAgg.get(bucket) || { items: 0, costValue: 0, sellValue: 0 };
    row.items += 1;
    row.costValue += cost;
    row.sellValue += sell;
    bucketAgg.set(bucket, row);

    if (days > 90) {
      riskyItems += 1;
      riskyCost += cost;
      riskySell += sell;
    }
  }

  const liveLatestSnapshot = {
    snapshotDate: today,
    inventoryCount: inventoryRows.length,
    inventoryValueCost: totalCost,
    inventoryValueSell: totalSell,
    salesCount: 0,
    salesRevenue: 0,
    profitAmount: 0,
    invoiceCount: 0,
    pendingInvoices: 0,
    paymentReceived: 0
  };

  return {
    latestSnapshot: latest || (liveLatestSnapshot as unknown as typeof latest),
    agingBuckets: Array.from(bucketAgg.entries()).map(([ageBucket, row]) => ({
      ageBucket,
      _count: { id: row.items },
      _sum: { purchaseCost: row.costValue, sellingPrice: row.sellValue }
    })),
    salesCycle: {
      avgDays: 0,
      avgProfit: 0,
      soldItems: snapshotSalesCount
    },
    capitalAtRisk: {
      items: riskyItems,
      costValue: riskyCost,
      sellValue: riskySell
    }
  };
}

const getSummaryCached = unstable_cache(
  async () => buildReportsAnalyticsSummary(),
  ["reports-analytics-summary-v1"],
  { revalidate: 60 }
);

async function buildCapitalRotationAnalytics(): Promise<CapitalRotationAnalytics> {
  const [snapshotSalesCount, snapshotInventoryCount] = await Promise.all([
    prisma.analyticsSalesSnapshot.count().catch(() => 0),
    prisma.analyticsInventorySnapshot.count({ where: { status: "IN_STOCK" } }).catch(() => 0)
  ]);

  if (snapshotSalesCount > 0 && snapshotInventoryCount > 0) {
    const byCategory = await prisma.analyticsSalesSnapshot.groupBy({
      by: ["category"],
      _avg: { saleCycleDays: true, profitAmount: true },
      _sum: { purchaseCost: true, sellingPrice: true },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } }
    });

    const ageValueByBucket = await prisma.analyticsInventorySnapshot.groupBy({
      by: ["ageBucket"],
      where: { status: "IN_STOCK" },
      _count: { id: true },
      _sum: { purchaseCost: true, sellingPrice: true }
    });

    const overall = await prisma.analyticsSalesSnapshot.aggregate({
      _avg: { saleCycleDays: true },
      _sum: { purchaseCost: true, sellingPrice: true },
      _count: { id: true }
    });

    const avgDays = overall._avg.saleCycleDays || 0;
    const annualRotation = avgDays > 0 ? 365 / avgDays : 0;

    return {
      overall: {
        avgSellDays: avgDays,
        annualRotation,
        soldItems: overall._count.id || 0,
        purchaseValue: overall._sum.purchaseCost || 0,
        sellValue: overall._sum.sellingPrice || 0
      },
      byCategory: byCategory.map((row: {
        category: string;
        _avg: { saleCycleDays: number | null; profitAmount: number | null };
        _sum: { purchaseCost: number | null; sellingPrice: number | null };
        _count: { id: number };
      }) => {
        const categoryAvg = row._avg.saleCycleDays || 0;
        return {
          category: row.category,
          avgSellDays: categoryAvg,
          rotationRate: categoryAvg > 0 ? 365 / categoryAvg : 0,
          avgProfit: row._avg.profitAmount || 0,
          soldItems: row._count.id || 0,
          purchaseValue: row._sum.purchaseCost || 0,
          sellValue: row._sum.sellingPrice || 0
        };
      }),
      ageValueByBucket: ageValueByBucket.map((row: {
        ageBucket: string;
        _count: { id: number };
        _sum: { purchaseCost: number | null; sellingPrice: number | null };
      }) => ({
        bucket: row.ageBucket,
        items: row._count.id || 0,
        costValue: row._sum.purchaseCost || 0,
        sellValue: row._sum.sellingPrice || 0
      }))
    };
  }

  const today = new Date();
  const sales = await prisma.sale.findMany({
    select: {
      saleDate: true,
      netAmount: true,
      profit: true,
      costPriceSnapshot: true,
      inventory: {
        select: {
          createdAt: true,
          category: true,
          flatPurchaseCost: true,
          costPrice: true
        }
      }
    }
  });

  const byCategoryAgg = new Map<string, { soldItems: number; sumDays: number; sumProfit: number; sumCost: number; sumSell: number }>();
  let overallSold = 0;
  let overallSumDays = 0;
  let overallSumCost = 0;
  let overallSumSell = 0;
  for (const s of sales) {
    const cat = s.inventory.category || "UNKNOWN";
    const days = daysBetween(s.saleDate, s.inventory.createdAt);
    const cost = Number.isFinite(s.costPriceSnapshot ?? NaN)
      ? (s.costPriceSnapshot as number)
      : getInventoryCost(s.inventory);
    const sell = s.netAmount || 0;
    const profit = Number.isFinite(s.profit ?? NaN) ? (s.profit as number) : sell - cost;
    const row = byCategoryAgg.get(cat) || { soldItems: 0, sumDays: 0, sumProfit: 0, sumCost: 0, sumSell: 0 };
    row.soldItems += 1;
    row.sumDays += days;
    row.sumProfit += profit;
    row.sumCost += cost;
    row.sumSell += sell;
    byCategoryAgg.set(cat, row);

    overallSold += 1;
    overallSumDays += days;
    overallSumCost += cost;
    overallSumSell += sell;
  }

  const inventoryRows = await prisma.inventory.findMany({
    where: { status: "IN_STOCK" },
    select: {
      createdAt: true,
      pricingMode: true,
      weightValue: true,
      sellingRatePerCarat: true,
      flatSellingPrice: true,
      sellingPrice: true,
      flatPurchaseCost: true,
      costPrice: true,
    }
  });

  const bucketAgg = new Map<string, { items: number; costValue: number; sellValue: number }>();
  for (const inv of inventoryRows) {
    const days = daysBetween(today, inv.createdAt);
    const bucket = toAgeBucket(days);
    const cost = getInventoryCost(inv);
    const sell = getInventorySell(inv);
    const row = bucketAgg.get(bucket) || { items: 0, costValue: 0, sellValue: 0 };
    row.items += 1;
    row.costValue += cost;
    row.sellValue += sell;
    bucketAgg.set(bucket, row);
  }

  const avgDays = overallSold > 0 ? overallSumDays / overallSold : 0;
  const annualRotation = avgDays > 0 ? 365 / avgDays : 0;

  return {
    overall: {
      avgSellDays: avgDays,
      annualRotation,
      soldItems: overallSold,
      purchaseValue: overallSumCost,
      sellValue: overallSumSell
    },
    byCategory: Array.from(byCategoryAgg.entries())
      .map(([category, row]) => {
        const catAvgDays = row.soldItems > 0 ? row.sumDays / row.soldItems : 0;
        return {
          category,
          avgSellDays: catAvgDays,
          rotationRate: catAvgDays > 0 ? 365 / catAvgDays : 0,
          avgProfit: row.soldItems > 0 ? row.sumProfit / row.soldItems : 0,
          soldItems: row.soldItems,
          purchaseValue: row.sumCost,
          sellValue: row.sumSell
        };
      })
      .sort((a, b) => b.soldItems - a.soldItems),
    ageValueByBucket: Array.from(bucketAgg.entries()).map(([bucket, row]) => ({
      bucket,
      items: row.items,
      costValue: row.costValue,
      sellValue: row.sellValue
    }))
  };
}

const getCapitalRotationCached = unstable_cache(
  async () => buildCapitalRotationAnalytics(),
  ["reports-capital-rotation-v1"],
  { revalidate: 300 }
);

export async function getReportsAnalyticsSummary() {
  return getSummaryCached();
}

export async function getCapitalRotationAnalytics(): Promise<CapitalRotationAnalytics> {
  return getCapitalRotationCached();
}

export async function getReportsAnalyticsSummaryUncached() {
  return buildReportsAnalyticsSummary();
}

export async function getCapitalRotationAnalyticsUncached(): Promise<CapitalRotationAnalytics> {
  return buildCapitalRotationAnalytics();
}

export async function getInventoryAgingAnalytics(filters: InventoryAgingFilters): Promise<InventoryAgingAnalytics> {
  const page = Math.max(1, Number(filters.page || 1));
  const pageSize = Math.min(100, Math.max(10, Number(filters.pageSize || 50)));
  const where = {
    ...(filters.bucket ? { ageBucket: filters.bucket } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.vendor ? { vendorName: filters.vendor } : {}),
    ...(filters.status ? { status: filters.status } : {})
  };

  const snapshotCount = await prisma.analyticsInventorySnapshot.count().catch(() => 0);
  if (snapshotCount > 0) {
    const [rows, total, categories, vendors] = await Promise.all([
      prisma.analyticsInventorySnapshot.findMany({
        where,
        orderBy: [{ daysInStock: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.analyticsInventorySnapshot.count({ where }),
      prisma.analyticsInventorySnapshot.findMany({
        select: { category: true },
        distinct: ["category"],
        orderBy: { category: "asc" }
      }),
      prisma.analyticsInventorySnapshot.findMany({
        select: { vendorName: true },
        distinct: ["vendorName"],
        orderBy: { vendorName: "asc" }
      }),
    ]);

    const bucketStats = await prisma.analyticsInventorySnapshot.groupBy({
      by: ["ageBucket"],
      where: { status: "IN_STOCK" },
      _count: { id: true },
      _sum: { purchaseCost: true }
    });

    return {
      rows,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      categories: categories.map((c: { category: string }) => c.category).filter(Boolean),
      vendors: vendors.map((v: { vendorName: string }) => v.vendorName).filter(Boolean),
      bucketStats: bucketStats.map((b: {
        ageBucket: string;
        _count: { id: number };
        _sum: { purchaseCost: number | null };
      }) => ({
        bucket: b.ageBucket,
        items: b._count.id || 0,
        costValue: b._sum.purchaseCost || 0,
        sellValue: 0
      }))
    };
  }

  const today = new Date();
  const status = filters.status || "IN_STOCK";
  const invRows = await prisma.inventory.findMany({
    where: { status },
    select: {
      id: true,
      sku: true,
      itemName: true,
      category: true,
      vendor: { select: { name: true } },
      createdAt: true,
      pricingMode: true,
      weightValue: true,
      sellingRatePerCarat: true,
      flatSellingPrice: true,
      sellingPrice: true,
      flatPurchaseCost: true,
      costPrice: true
    }
  });

  const normalized = invRows.map((inv) => {
    const days = daysBetween(today, inv.createdAt);
    const bucket = toAgeBucket(days);
    return {
      id: inv.id,
      inventoryId: inv.id,
      sku: inv.sku,
      itemName: inv.itemName,
      category: inv.category || "UNKNOWN",
      vendorName: inv.vendor?.name || "Unknown",
      purchaseCost: getInventoryCost(inv),
      sellingPrice: getInventorySell(inv),
      daysInStock: days,
      status: invRows.length ? status : "IN_STOCK",
      ageBucket: bucket,
      createdAt: inv.createdAt
    };
  });

  const filtered = normalized.filter((row) => {
    if (filters.bucket && row.ageBucket !== filters.bucket) return false;
    if (filters.category && row.category !== filters.category) return false;
    if (filters.vendor && row.vendorName !== filters.vendor) return false;
    return true;
  });

  filtered.sort((a, b) => (b.daysInStock - a.daysInStock) || (b.createdAt.getTime() - a.createdAt.getTime()));
  const total = filtered.length;
  const paged = filtered.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

  const categories = Array.from(new Set(filtered.map((r) => r.category))).sort();
  const vendors = Array.from(new Set(filtered.map((r) => r.vendorName))).sort();
  const bucketAgg = new Map<string, { items: number; costValue: number; sellValue: number }>();
  for (const row of filtered.filter((r) => r.status === "IN_STOCK")) {
    const agg = bucketAgg.get(row.ageBucket) || { items: 0, costValue: 0, sellValue: 0 };
    agg.items += 1;
    agg.costValue += row.purchaseCost;
    agg.sellValue += row.sellingPrice;
    bucketAgg.set(row.ageBucket, agg);
  }

  return {
    rows: paged,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    categories,
    vendors,
    bucketStats: Array.from(bucketAgg.entries()).map(([bucket, agg]) => ({
      bucket,
      items: agg.items,
      costValue: agg.costValue,
      sellValue: agg.sellValue
    }))
  };
}
