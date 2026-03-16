import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { getCapitalRotationAnalytics } from "@/lib/reports-analytics";
import type { BucketStat, CapitalRotationCategoryRow } from "@/lib/reports-analytics";
import { CapitalRotationCharts } from "@/components/reports/capital-rotation-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ExportButton } from "@/components/ui/export-button";

type SearchMap = { [key: string]: string | string[] | undefined };

export default async function CapitalRotationReportPage({ searchParams }: { searchParams: Promise<SearchMap> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, PERMISSIONS.REPORTS_VIEW)) redirect("/");

  const sp = await searchParams;
  const selectedCategory = typeof sp.category === "string" ? sp.category : "";
  const data = await getCapitalRotationAnalytics();
  const categoryRows: CapitalRotationCategoryRow[] = selectedCategory
    ? data.byCategory.filter((row) => row.category === selectedCategory)
    : data.byCategory;
  const categoryExportColumns = [
    { header: "Category", key: "category" },
    { header: "Avg Sell Days", key: "avgSellDays" },
    { header: "Rotation Rate", key: "rotationRate" },
    { header: "Avg Profit", key: "avgProfit" },
    { header: "Sold Items", key: "soldItems" },
    { header: "Capital Used", key: "purchaseValue" },
    { header: "Sell Value", key: "sellValue" },
  ];
  const categoryExportData = categoryRows.map((row: CapitalRotationCategoryRow) => ({
    category: row.category,
    avgSellDays: row.avgSellDays.toFixed(2),
    rotationRate: row.rotationRate.toFixed(2),
    avgProfit: row.avgProfit.toFixed(2),
    soldItems: row.soldItems,
    purchaseValue: row.purchaseValue.toFixed(2),
    sellValue: row.sellValue.toFixed(2),
  }));
  const riskExportColumns = [
    { header: "Bucket", key: "bucket" },
    { header: "Items", key: "items" },
    { header: "Cost Value", key: "costValue" },
    { header: "Sell Value", key: "sellValue" },
  ];
  const riskExportData = data.ageValueByBucket.map((row: BucketStat) => ({
    bucket: row.bucket,
    items: row.items,
    costValue: row.costValue.toFixed(2),
    sellValue: row.sellValue.toFixed(2),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Capital Rotation Report</h1>
          <p className="text-sm text-muted-foreground">Track how efficiently capital rotates across sold categories.</p>
        </div>
        <div className="flex gap-2">
          <ExportButton
            filename={`Capital_Rotation_${selectedCategory || "ALL"}`}
            data={categoryExportData}
            columns={categoryExportColumns}
            title={`Capital Rotation Report (${selectedCategory || "ALL Categories"})`}
          />
          <ExportButton
            filename="Capital_At_Risk_Buckets"
            data={riskExportData}
            columns={riskExportColumns}
            title="Capital at Risk by Inventory Aging Bucket"
          />
          <Button asChild variant="outline">
            <Link href="/reports">Back to Reports</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Avg Sell Days</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{data.overall.avgSellDays.toFixed(1)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Annual Rotation</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{data.overall.annualRotation.toFixed(2)}x</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Capital Used</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(data.overall.purchaseValue)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Sold Items</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{data.overall.soldItems}</div></CardContent>
        </Card>
      </div>

      <CapitalRotationCharts byCategory={data.byCategory} ageValueByBucket={data.ageValueByBucket} />

      <Card>
        <CardHeader><CardTitle>Category Rotation</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Avg Sell Days</TableHead>
                <TableHead className="text-right">Rotation Rate</TableHead>
                <TableHead className="text-right">Avg Profit</TableHead>
                <TableHead className="text-right">Sold Items</TableHead>
                <TableHead className="text-right">Capital Used</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categoryRows.map((row: CapitalRotationCategoryRow) => (
                <TableRow key={row.category} className={selectedCategory === row.category ? "bg-muted/40" : ""}>
                  <TableCell>{row.category}</TableCell>
                  <TableCell className="text-right">{row.avgSellDays.toFixed(1)}</TableCell>
                  <TableCell className="text-right">{row.rotationRate.toFixed(2)}x</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.avgProfit)}</TableCell>
                  <TableCell className="text-right">{row.soldItems}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.purchaseValue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {selectedCategory && (
            <div className="mt-3">
              <Button asChild variant="outline" size="sm">
                <Link href="/reports/capital-rotation">Clear Category Focus</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Capital at Risk by Inventory Aging Bucket</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bucket</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Cost Value</TableHead>
                <TableHead className="text-right">Sell Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.ageValueByBucket.map((row: BucketStat) => (
                <TableRow key={row.bucket}>
                  <TableCell>{row.bucket}</TableCell>
                  <TableCell className="text-right">{row.items}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.costValue)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.sellValue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
