import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ExportButton } from "@/components/ui/export-button";
import { ReportFilters } from "@/components/reports/report-filters";
import { formatCurrency } from "@/lib/utils";
import { endOfDay, parseISO, startOfDay, subDays, format } from "date-fns";

type SearchMap = { [key: string]: string | string[] | undefined };

export const dynamic = "force-dynamic";

export default async function InventoryReportsPage({ searchParams }: { searchParams: Promise<SearchMap> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, PERMISSIONS.REPORTS_VIEW)) redirect("/");

  const sp = await searchParams;
  const today = new Date();
  const fromDate = typeof sp.from === "string" ? startOfDay(parseISO(sp.from)) : startOfDay(subDays(today, 30));
  const toDate = typeof sp.to === "string" ? endOfDay(parseISO(sp.to)) : endOfDay(today);

  const where = {
    createdAt: { gte: fromDate, lte: toDate },
  } as const;

  const [totals, byCategory, byGemType] = await Promise.all([
    prisma.inventory.aggregate({ where, _count: { id: true }, _sum: { costPrice: true, sellingPrice: true } }),
    prisma.inventory.groupBy({
      by: ["category"],
      where,
      _count: { id: true },
      _sum: { costPrice: true, sellingPrice: true },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.inventory.groupBy({
      by: ["gemType"],
      where,
      _count: { id: true },
      _sum: { costPrice: true, sellingPrice: true },
      orderBy: { _count: { id: "desc" } },
    }),
  ]);

  const categoryExportRows = byCategory.map((r) => ({
    Category: r.category || "Uncategorized",
    Items: r._count.id || 0,
    "Cost Value": r._sum.costPrice || 0,
    "Sell Value": r._sum.sellingPrice || 0,
  }));
  const categoryExportCols = [
    { header: "Category", key: "Category" },
    { header: "Items", key: "Items" },
    { header: "Cost Value", key: "Cost Value" },
    { header: "Sell Value", key: "Sell Value" },
  ];

  const gemTypeExportRows = byGemType.map((r) => ({
    "Gem Type": r.gemType || "Unknown",
    Items: r._count.id || 0,
    "Cost Value": r._sum.costPrice || 0,
    "Sell Value": r._sum.sellingPrice || 0,
  }));
  const gemTypeExportCols = [
    { header: "Gem Type", key: "Gem Type" },
    { header: "Items", key: "Items" },
    { header: "Cost Value", key: "Cost Value" },
    { header: "Sell Value", key: "Sell Value" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Reports</h1>
          <p className="text-sm text-muted-foreground">Category-wise and Gem Type-wise summary with export.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/reports">Back to Reports</Link>
        </Button>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <ReportFilters />
        <div className="flex gap-2">
          <ExportButton
            filename={`Inventory_By_Category_${format(fromDate, "yyyyMMdd")}_${format(toDate, "yyyyMMdd")}`}
            data={categoryExportRows}
            columns={categoryExportCols}
            title="Inventory Summary (Category)"
            label="Export by Category"
          />
          <ExportButton
            filename={`Inventory_By_GemType_${format(fromDate, "yyyyMMdd")}_${format(toDate, "yyyyMMdd")}`}
            data={gemTypeExportRows}
            columns={gemTypeExportCols}
            title="Inventory Summary (Gem Type)"
            label="Export by Gem Type"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Items Added</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals._count.id || 0}</div>
            <div className="text-xs text-muted-foreground mt-1">Within selected date range</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Cost Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals._sum.costPrice || 0)}</div>
            <div className="text-xs text-muted-foreground mt-1">Sum of Cost Price</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Sell Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals._sum.sellingPrice || 0)}</div>
            <div className="text-xs text-muted-foreground mt-1">Sum of Selling Price</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Category Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Cost Value</TableHead>
                <TableHead className="text-right">Sell Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byCategory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">No data.</TableCell>
                </TableRow>
              ) : (
                byCategory.map((r) => (
                  <TableRow key={r.category || "Uncategorized"}>
                    <TableCell>{r.category || "Uncategorized"}</TableCell>
                    <TableCell className="text-right">{r._count.id || 0}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r._sum.costPrice || 0)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r._sum.sellingPrice || 0)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gem Type Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gem Type</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Cost Value</TableHead>
                <TableHead className="text-right">Sell Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byGemType.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">No data.</TableCell>
                </TableRow>
              ) : (
                byGemType.map((r) => (
                  <TableRow key={r.gemType || "Unknown"}>
                    <TableCell>{r.gemType || "Unknown"}</TableCell>
                    <TableCell className="text-right">{r._count.id || 0}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r._sum.costPrice || 0)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r._sum.sellingPrice || 0)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

