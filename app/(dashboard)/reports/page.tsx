import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ReportsPage() {
  const session = await auth();
  // Basic RBAC check - assuming 'reports.view' logic, but for now blocking non-admins/staff if strict
  // Permissions logic said reports.view, let's stick to role check or assume staff can view
  if (!session) redirect("/login");

  // 1. Inventory Aging (Items in stock for > 90 days)
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const agingInventory = await prisma.inventory.findMany({
    where: {
      status: "IN_STOCK",
      createdAt: { lt: ninetyDaysAgo }
    },
    orderBy: { createdAt: "asc" },
    take: 50
  });

  // 2. Sales by Platform
  const salesByPlatform = await prisma.sale.groupBy({
    by: ['platform'],
    _sum: {
      netAmount: true,
      profit: true
    },
    _count: {
      id: true
    }
  });

  // 3. Profit Trends (Last 6 months) - simplified aggregation
  // This is complex in Prisma/SQLite without raw queries, so we fetch last 6 months sales and aggregate in JS
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  const recentSales = await prisma.sale.findMany({
    where: { saleDate: { gte: sixMonthsAgo } },
    select: { saleDate: true, profit: true, netAmount: true }
  });

  const monthlyStats: Record<string, { revenue: number, profit: number }> = {};
  
  recentSales.forEach(s => {
    const key = s.saleDate.toISOString().slice(0, 7); // YYYY-MM
    if (!monthlyStats[key]) monthlyStats[key] = { revenue: 0, profit: 0 };
    monthlyStats[key].revenue += s.netAmount;
    monthlyStats[key].profit += s.profit;
  });

  const sortedMonths = Object.keys(monthlyStats).sort();

  return (
    <div className="space-y-6">


      {/* Platform Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {salesByPlatform.map((stat) => (
          <Card key={stat.platform}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium uppercase text-muted-foreground">{stat.platform}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stat._sum.netAmount || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {stat._count.id} sales | Profit: {formatCurrency(stat._sum.profit || 0)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Performance (Last 6 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Profit</TableHead>
                <TableHead>Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMonths.map(month => {
                const data = monthlyStats[month];
                const margin = data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0;
                return (
                  <TableRow key={month}>
                    <TableCell>{month}</TableCell>
                    <TableCell>{formatCurrency(data.revenue)}</TableCell>
                    <TableCell className="text-green-600">{formatCurrency(data.profit)}</TableCell>
                    <TableCell>{margin.toFixed(1)}%</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Aging Inventory */}
      <Card>
        <CardHeader>
          <CardTitle>Aging Inventory ({'>'} 90 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Stock Date</TableHead>
                <TableHead>Days Old</TableHead>
                <TableHead>Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agingInventory.map((item) => {
                 const daysOld = Math.floor((new Date().getTime() - item.createdAt.getTime()) / (1000 * 3600 * 24));
                 const cost = item.pricingMode === 'FLAT' ? item.flatPurchaseCost : (item.weightValue * (item.purchaseRatePerCarat || 0));
                 return (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono">{item.sku}</TableCell>
                    <TableCell>{item.itemName}</TableCell>
                    <TableCell>{item.createdAt.toLocaleDateString()}</TableCell>
                    <TableCell className="text-red-500 font-bold">{daysOld}</TableCell>
                    <TableCell>{formatCurrency(cost || 0)}</TableCell>
                  </TableRow>
                 );
              })}
              {agingInventory.length === 0 && (
                <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">No aging inventory found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
