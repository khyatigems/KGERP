import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { getSalesCycleData } from "@/lib/report-module-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { ReportFilters } from "@/components/reports/report-filters";
import { ExportButton } from "@/components/ui/export-button";
import { endOfDay, parseISO, startOfDay, subDays, format } from "date-fns";

export const dynamic = "force-dynamic";

interface SalesCycleReportPageProps {
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function SalesCycleReportPage({ searchParams }: SalesCycleReportPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, PERMISSIONS.REPORTS_VIEW)) redirect("/");
  const params = await searchParams;
  const today = new Date();
  const fromDate = params.from ? startOfDay(parseISO(params.from)) : startOfDay(subDays(today, 30));
  const toDate = params.to ? endOfDay(parseISO(params.to)) : endOfDay(today);

  const data = await getSalesCycleData({ from: fromDate, to: toDate });

  const exportData = data.rows.map((row) => ({
    "Sold Date": format(row.soldAt, "yyyy-MM-dd"),
    SKU: row.sku,
    Category: row.category,
    "Gem Type": row.gemType,
    "Cycle Days": row.cycleDays,
    Margin: row.margin,
  }));

  const exportColumns = [
    { header: "Sold Date", key: "Sold Date" },
    { header: "SKU", key: "SKU" },
    { header: "Category", key: "Category" },
    { header: "Gem Type", key: "Gem Type" },
    { header: "Cycle Days", key: "Cycle Days" },
    { header: "Margin", key: "Margin" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold">Sales Cycle</h1>
        <ExportButton
          filename={`Sales_Cycle_${format(fromDate, "yyyyMMdd")}_${format(toDate, "yyyyMMdd")}`}
          data={exportData}
          columns={exportColumns}
          title="Sales Cycle"
        />
      </div>

      <ReportFilters />
      <Card><CardHeader><CardTitle>Average Sales Cycle</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{data.avgCycle.toFixed(1)} days</div></CardContent></Card>
      <Card>
        <CardHeader><CardTitle>Cycle by Sold SKU</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Gem Type</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Cycle Days</TableHead>
                <TableHead className="text-right">Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.category}</TableCell>
                  <TableCell>{row.gemType}</TableCell>
                  <TableCell className="font-mono text-xs">{row.sku}</TableCell>
                  <TableCell className="text-right">{row.cycleDays}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.margin)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
