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

async function buildReportsAnalyticsSummary() {
  const latest = await prisma.analyticsDailySnapshot.findFirst({ orderBy: { snapshotDate: "desc" } });
  const agingBuckets = await prisma.analyticsInventorySnapshot.groupBy({
    by: ["ageBucket"],
    where: { status: "IN_STOCK" },
    _count: { id: true },
    _sum: { purchaseCost: true, sellingPrice: true }
  });
  const avgCycle = await prisma.analyticsSalesSnapshot.aggregate({
    _avg: { saleCycleDays: true, profitAmount: true },
    _count: { id: true }
  });
  const capitalAtRisk = await prisma.analyticsInventorySnapshot.aggregate({
    where: { status: "IN_STOCK", daysInStock: { gt: 90 } },
    _sum: { purchaseCost: true, sellingPrice: true },
    _count: { id: true }
  });

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

const getSummaryCached = unstable_cache(
  async () => buildReportsAnalyticsSummary(),
  ["reports-analytics-summary-v1"],
  { revalidate: 60 }
);

async function buildCapitalRotationAnalytics(): Promise<CapitalRotationAnalytics> {
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
