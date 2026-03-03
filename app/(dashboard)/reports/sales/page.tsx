import { prisma } from "@/lib/prisma";
import { SalesAnalytics } from "@/components/reports/sales-analytics";
import { startOfMonth, subMonths, format, endOfDay, startOfDay, parseISO } from "date-fns";
import { ReportFilters } from "@/components/reports/report-filters";
import { ExportButton } from "@/components/ui/export-button";

export const dynamic = "force-dynamic";

interface SalesReportPageProps {
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function SalesReportPage({ searchParams }: SalesReportPageProps) {
  const params = await searchParams;
  // 1. Determine Date Range
  const today = new Date();
  const defaultFrom = startOfMonth(subMonths(today, 5)); // Last 6 months default
  
  const fromDate = params.from ? startOfDay(parseISO(params.from)) : defaultFrom;
  const toDate = params.to ? endOfDay(parseISO(params.to)) : endOfDay(today);

  // 2. Fetch Sales Data
  const sales = await prisma.sale.findMany({
    where: {
      saleDate: {
        gte: fromDate,
        lte: toDate,
      },
    },
    include: {
      inventory: {
        select: {
          category: true,
          sku: true,
          gemType: true,
          stoneType: true
        },
      },
    },
    orderBy: {
      saleDate: "asc",
    },
  });

  // 3. Aggregate Data for Analytics
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.netAmount, 0);
  const totalProfit = sales.reduce((sum, sale) => sum + (sale.profit || 0), 0);
  const totalSales = sales.length;
  const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

  // Monthly Trend (Dynamic based on range)
  const monthlyTrendMap = new Map<string, { revenue: number; profit: number; count: number }>();
  
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

  // 4. Prepare Export Data
  const exportData = sales.map(sale => ({
    Date: format(sale.saleDate, "yyyy-MM-dd"),
    SKU: sale.inventory.sku,
    Category: sale.inventory.category,
    Type: sale.inventory.gemType || sale.inventory.stoneType || "-",
    Customer: sale.customerName || "N/A",
    "Net Amount": sale.netAmount,
    Profit: sale.profit || 0,
    Status: sale.paymentStatus
  }));

  const exportColumns = [
    { header: "Date", key: "Date" },
    { header: "SKU", key: "SKU" },
    { header: "Category", key: "Category" },
    { header: "Type", key: "Type" },
    { header: "Customer", key: "Customer" },
    { header: "Net Amount", key: "Net Amount" },
    { header: "Profit", key: "Profit" },
    { header: "Status", key: "Status" }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-3xl font-bold tracking-tight">Sales Reports</h1>
           <p className="text-muted-foreground text-sm mt-1">
             Analyze sales performance, revenue trends, and category distribution.
           </p>
        </div>
        <div className="flex items-center gap-2">
            <ExportButton 
                filename={`Sales_Report_${format(fromDate, 'yyyyMMdd')}_${format(toDate, 'yyyyMMdd')}`} 
                data={exportData} 
                columns={exportColumns}
                title="Sales Report"
            />
        </div>
      </div>

      <ReportFilters />

      <SalesAnalytics data={analyticsData} />
    </div>
  );
}
