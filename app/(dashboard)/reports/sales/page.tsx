import { prisma } from "@/lib/prisma";
import { SalesAnalytics } from "@/components/reports/sales-analytics";
import { startOfMonth, subMonths, format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function SalesReportPage() {
  // 1. Fetch Sales Data (Last 6 Months)
  const today = new Date();
  const sixMonthsAgo = startOfMonth(subMonths(today, 5));

  const sales = await prisma.sale.findMany({
    where: {
      saleDate: {
        gte: sixMonthsAgo,
      },
    },
    include: {
      inventory: {
        select: {
          category: true,
        },
      },
    },
    orderBy: {
      saleDate: "asc",
    },
  });

  // 2. Aggregate Data
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.netAmount, 0);
  const totalProfit = sales.reduce((sum, sale) => sum + (sale.profit || 0), 0);
  const totalSales = sales.length;
  const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

  // Monthly Trend
  const monthlyTrendMap = new Map<string, { revenue: number; profit: number; count: number }>();
  
  // Initialize last 6 months
  for (let i = 0; i < 6; i++) {
    const monthDate = subMonths(today, 5 - i);
    const monthKey = format(monthDate, "MMM yyyy");
    monthlyTrendMap.set(monthKey, { revenue: 0, profit: 0, count: 0 });
  }

  sales.forEach((sale) => {
    const monthKey = format(sale.saleDate, "MMM yyyy");
    const current = monthlyTrendMap.get(monthKey) || { revenue: 0, profit: 0, count: 0 };
    monthlyTrendMap.set(monthKey, {
      revenue: current.revenue + sale.netAmount,
      profit: current.profit + (sale.profit || 0),
      count: current.count + 1,
    });
  });

  const monthlyTrend = Array.from(monthlyTrendMap.entries()).map(([month, data]) => ({
    month,
    ...data,
  }));

  // Category Distribution
  const categoryMap = new Map<string, number>();
  sales.forEach((sale) => {
    const category = sale.inventory?.category || "Uncategorized";
    categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
  });

  const categoryDistribution = Array.from(categoryMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5); // Top 5 categories

  const analyticsData = {
    totalRevenue,
    totalProfit,
    totalSales,
    averageOrderValue,
    monthlyTrend,
    categoryDistribution,
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Sales Reports</h1>
      <SalesAnalytics data={analyticsData} />
    </div>
  );
}
