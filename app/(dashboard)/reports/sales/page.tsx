import { prisma } from "@/lib/prisma";
import { SalesAnalytics } from "@/components/reports/sales-analytics";
import { startOfMonth, subMonths, format, endOfDay, startOfDay, parseISO } from "date-fns";
import { ReportFilters } from "@/components/reports/report-filters";
import { ExportButton } from "@/components/ui/export-button";
import { AnimatedPage } from "@/components/ui/animated-page";

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

  // 2. Fetch export rows and pre-aggregated analytics together. The export
  // remains capped to keep a very large report from exhausting server memory.
  const [sales, summaryRows, monthlyRows, categoryRows] = await Promise.all([
    prisma.sale.findMany({
      where: { saleDate: { gte: fromDate, lte: toDate } },
      include: {
        inventory: {
          select: { category: true, sku: true, gemType: true, stoneType: true },
        },
      },
      orderBy: { saleDate: "asc" },
      take: 5000,
    }),
    prisma.$queryRaw<Array<{ revenue: number | bigint; profit: number | bigint; count: number | bigint }>>`
      SELECT COALESCE(SUM("netAmount"), 0) AS revenue,
             COALESCE(SUM("profit"), 0) AS profit,
             COUNT(*) AS count
      FROM "Sale"
      WHERE "saleDate" >= ${fromDate} AND "saleDate" <= ${toDate}
    `.catch(() => [{ revenue: 0, profit: 0, count: 0 }]),
    prisma.$queryRaw<Array<{ month: string; revenue: number | bigint; profit: number | bigint; count: number | bigint }>>`
      SELECT strftime('%Y-%m', "saleDate") AS month,
             COALESCE(SUM("netAmount"), 0) AS revenue,
             COALESCE(SUM("profit"), 0) AS profit,
             COUNT(*) AS count
      FROM "Sale"
      WHERE "saleDate" >= ${fromDate} AND "saleDate" <= ${toDate}
      GROUP BY month
      ORDER BY month ASC
    `.catch(() => []),
    prisma.$queryRaw<Array<{ name: string; value: number | bigint }>>`
      SELECT COALESCE(NULLIF(i."category", ''), 'Uncategorized') AS name,
             COUNT(*) AS value
      FROM "Sale" s
      LEFT JOIN "Inventory" i ON s."inventoryId" = i."id"
      WHERE s."saleDate" >= ${fromDate} AND s."saleDate" <= ${toDate}
      GROUP BY name
      ORDER BY value DESC
      LIMIT 5
    `.catch(() => []),
  ]);

  // 3. Aggregate Data for Analytics
  const summary = summaryRows[0] || { revenue: 0, profit: 0, count: 0 };
  const totalRevenue = Number(summary.revenue) || 0;
  const totalProfit = Number(summary.profit) || 0;
  const totalSales = Number(summary.count) || 0;
  const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

  // The database performs the large aggregations; only the small result sets
  // are converted for the chart components.
  const monthlyTrend = monthlyRows.map((row) => ({
    month: format(parseISO(`${row.month}-01`), "MMM yyyy"),
    revenue: Number(row.revenue) || 0,
    profit: Number(row.profit) || 0,
    count: Number(row.count) || 0,
  }));

  const categoryDistribution = categoryRows.map((row) => ({
    name: row.name,
    value: Number(row.value) || 0,
  }));

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
    <AnimatedPage>
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
    </AnimatedPage>
  );
}
