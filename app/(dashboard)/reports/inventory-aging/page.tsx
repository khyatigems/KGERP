import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { getInventoryAgingAnalytics } from "@/lib/reports-analytics";
import type { BucketStat, InventoryAgingRow } from "@/lib/reports-analytics";
import { InventoryAgingChart } from "@/components/reports/inventory-aging-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExportButton } from "@/components/ui/export-button";

type SearchMap = { [key: string]: string | string[] | undefined };

export default async function InventoryAgingReportPage({ searchParams }: { searchParams: Promise<SearchMap> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, PERMISSIONS.REPORTS_VIEW)) redirect("/");

  const sp = await searchParams;
  const bucket = typeof sp.bucket === "string" ? sp.bucket : undefined;
  const category = typeof sp.category === "string" ? sp.category : undefined;
  const vendor = typeof sp.vendor === "string" ? sp.vendor : undefined;
  const status = typeof sp.status === "string" ? sp.status : "IN_STOCK";
  const page = typeof sp.page === "string" ? Number(sp.page) : 1;
  const pageSize = typeof sp.pageSize === "string" ? Number(sp.pageSize) : 50;

  const data = await getInventoryAgingAnalytics({ bucket, category, vendor, status, page, pageSize });
  const exportColumns = [
    { header: "SKU", key: "sku" },
    { header: "Item", key: "itemName" },
    { header: "Category", key: "category" },
    { header: "Vendor", key: "vendorName" },
    { header: "Days In Stock", key: "daysInStock" },
    { header: "Age Bucket", key: "ageBucket" },
    { header: "Status", key: "status" },
    { header: "Cost Value", key: "purchaseCost" },
    { header: "Sell Value", key: "sellingPrice" },
  ];
  const exportData = data.rows.map((row: InventoryAgingRow) => ({
    sku: row.sku,
    itemName: row.itemName,
    category: row.category,
    vendorName: row.vendorName,
    daysInStock: row.daysInStock,
    ageBucket: row.ageBucket,
    status: row.status,
    purchaseCost: Number(row.purchaseCost || 0).toFixed(2),
    sellingPrice: Number(row.sellingPrice || 0).toFixed(2),
  }));
  const filterLabel = [
    `Status:${status || "ALL"}`,
    `Bucket:${bucket || "ALL"}`,
    `Category:${category || "ALL"}`,
    `Vendor:${vendor || "ALL"}`,
  ].join(" | ");

  const queryFor = (next: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams();
    const entries = {
      bucket,
      category,
      vendor,
      status,
      page: data.page,
      pageSize: data.pageSize,
      ...next,
    };
    Object.entries(entries).forEach(([k, v]) => {
      if (v === undefined || v === "") return;
      q.set(k, String(v));
    });
    return `?${q.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Aging Report</h1>
          <p className="text-sm text-muted-foreground">Snapshot-backed aging analysis with bucket and value visibility.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/reports">Back to Reports</Link>
        </Button>
      </div>
      <div className="flex justify-end">
        <ExportButton
          filename={`Inventory_Aging_${status || "ALL"}_${bucket || "ALL"}`}
          data={exportData}
          columns={exportColumns}
          title={`Inventory Aging Report (${filterLabel})`}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant={status === "IN_STOCK" ? "default" : "outline"}><Link href={queryFor({ status: "IN_STOCK", page: 1 })}>IN_STOCK</Link></Badge>
        <Badge variant={status === "SOLD" ? "default" : "outline"}><Link href={queryFor({ status: "SOLD", page: 1 })}>SOLD</Link></Badge>
        <Badge variant={bucket === "0-30" ? "default" : "outline"}><Link href={queryFor({ bucket: "0-30", page: 1 })}>0-30</Link></Badge>
        <Badge variant={bucket === "31-60" ? "default" : "outline"}><Link href={queryFor({ bucket: "31-60", page: 1 })}>31-60</Link></Badge>
        <Badge variant={bucket === "61-90" ? "default" : "outline"}><Link href={queryFor({ bucket: "61-90", page: 1 })}>61-90</Link></Badge>
        <Badge variant={bucket === "91-180" ? "default" : "outline"}><Link href={queryFor({ bucket: "91-180", page: 1 })}>91-180</Link></Badge>
        <Badge variant={bucket === "180+" ? "default" : "outline"}><Link href={queryFor({ bucket: "180+", page: 1 })}>180+</Link></Badge>
        <Badge variant={!bucket ? "default" : "outline"}><Link href={queryFor({ bucket: undefined, page: 1 })}>All Buckets</Link></Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {data.bucketStats.map((row: BucketStat) => (
          <Card key={row.bucket}>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{row.bucket} Days</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div>Items: <span className="font-semibold">{row.items}</span></div>
              <div>Cost Value: <span className="font-semibold">{formatCurrency(row.costValue)}</span></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <InventoryAgingChart data={data.bucketStats} />

      <Card>
        <CardHeader>
          <CardTitle>Inventory Aging Rows</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">Days</TableHead>
                <TableHead>Bucket</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Sell</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row: InventoryAgingRow) => (
                <TableRow key={row.id}>
                  <TableCell>{row.sku}</TableCell>
                  <TableCell>{row.itemName}</TableCell>
                  <TableCell>{row.category}</TableCell>
                  <TableCell>{row.vendorName}</TableCell>
                  <TableCell className="text-right">{row.daysInStock}</TableCell>
                  <TableCell>{row.ageBucket}</TableCell>
                  <TableCell>{row.status}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.purchaseCost)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.sellingPrice)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing page {data.page} of {data.totalPages} ({data.total} rows)
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm" disabled={data.page <= 1}>
                <Link href={queryFor({ page: Math.max(1, data.page - 1) })}>Previous</Link>
              </Button>
              <Button asChild variant="outline" size="sm" disabled={data.page >= data.totalPages}>
                <Link href={queryFor({ page: Math.min(data.totalPages, data.page + 1) })}>Next</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
