import { prisma } from "@/lib/prisma";
import { ProfitAnalytics } from "@/components/reports/profit-analytics";
import { startOfMonth, subMonths, format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function ProfitReportPage() {
  const today = new Date();
  const sixMonthsAgo = startOfMonth(subMonths(today, 5));

  // 1. Fetch Sales (Last 6 Months)
  const sales = await prisma.sale.findMany({
    where: {
      saleDate: {
        gte: sixMonthsAgo,
      },
    },
    include: {
      inventory: {
        select: { category: true },
      },
    },
    orderBy: {
      saleDate: "asc",
    },
  });

  // 2. Aggregate Data
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.netAmount, 0);
  const totalProfit = sales.reduce((sum, sale) => sum + (sale.profit || 0), 0);
  const averageMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  // Monthly Trend
  const monthlyDataMap = new Map<string, { revenue: number; profit: number }>();
  
  // Initialize last 6 months
  for (let i = 0; i < 6; i++) {
    const monthDate = subMonths(today, 5 - i);
    const monthKey = format(monthDate, "MMM yyyy");
    monthlyDataMap.set(monthKey, { revenue: 0, profit: 0 });
  }

  sales.forEach((sale) => {
    const monthKey = format(sale.saleDate, "MMM yyyy");
    const current = monthlyDataMap.get(monthKey) || { revenue: 0, profit: 0 };
    monthlyDataMap.set(monthKey, {
      revenue: current.revenue + sale.netAmount,
      profit: current.profit + (sale.profit || 0),
    });
  });

  const monthlyTrend = Array.from(monthlyDataMap.entries()).map(([month, data]) => ({
    month,
    revenue: data.revenue,
    profit: data.profit,
    margin: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0,
  }));

  // Category Profit
  const categoryProfitMap = new Map<string, number>();
  sales.forEach((sale) => {
    const category = sale.inventory?.category || "Uncategorized";
    categoryProfitMap.set(category, (categoryProfitMap.get(category) || 0) + (sale.profit || 0));
  });

  const categoryProfit = Array.from(categoryProfitMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const analyticsData = {
    totalProfit,
    averageMargin,
    totalRevenue,
    monthlyTrend,
    categoryProfit,
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Profit & Margin Reports</h1>
      <ProfitAnalytics data={analyticsData} />
    </div>
  );
}
