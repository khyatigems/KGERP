import { Metadata } from "next";
import Link from "next/link";
import { Plus, Pencil, Eye, FileText, FileDown, CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buildCustomerExport } from "@/lib/customer-export";
import { ensureCustomerSecondaryPhoneSchema } from "@/lib/customer-schema-ensure";
import { ensureReturnsSchema } from "@/lib/returns-schema-ensure";
import { Button } from "@/components/ui/button";
import { LoadingLink } from "@/components/ui/loading-link";
import { ExportButton } from "@/components/ui/export-button";
import { CustomerDeleteButton } from "@/components/customers/customer-delete-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Customers | KhyatiGems™",
};

export const dynamic = "force-dynamic";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, PERMISSIONS.CUSTOMER_VIEW)) redirect("/");

  await ensureCustomerSecondaryPhoneSchema();
  await ensureReturnsSchema();

  const sp = await searchParams;
  const q = (sp.q || "").trim();

  const where = q
    ? ({
        OR: [
          { name: { contains: q } },
          { email: { contains: q } },
          { phone: { contains: q } },
          { phoneSecondary: { contains: q } },
          { city: { contains: q } },
        ],
      } as unknown)
    : undefined;

  const customers = await prisma.customer.findMany({
    where: where as never,
    orderBy: { createdAt: "desc" },
  });

  const customerSettingsRow = await prisma.setting.findUnique({ where: { key: "customer_settings" } });
  const customerSettings = customerSettingsRow ? JSON.parse(customerSettingsRow.value) : { platinumThreshold: 100000, goldThreshold: 50000, highValueAov: 25000 };

  const rawCustomerStatsRows = await prisma.$queryRawUnsafe<Array<{
    customerId: string;
    totalRevenue: unknown;
    orderCount: unknown;
    highestOrder: unknown;
    lastOrderDate: string;
  }>>(`
    SELECT 
      s.customerId,
      SUM(s.netAmount) as totalRevenue,
      COUNT(DISTINCT s.invoiceId) as orderCount,
      MAX(i.totalAmount) as highestOrder,
      MAX(i.invoiceDate) as lastOrderDate
    FROM "Sale" s
    JOIN "Invoice" i ON s.invoiceId = i.id
    WHERE s.customerId IS NOT NULL AND s.platform != 'REPLACEMENT'
    GROUP BY s.customerId
  `).catch(() => []);

  const toNumber = (val: unknown): number => {
    if (typeof val === "bigint") return Number(val);
    if (typeof val === "number") return val;
    if (typeof val === "string") return Number(val) || 0;
    return 0;
  };

  const customerStatsRows = rawCustomerStatsRows.map(r => ({
    customerId: r.customerId,
    totalRevenue: toNumber(r.totalRevenue),
    orderCount: toNumber(r.orderCount),
    highestOrder: toNumber(r.highestOrder),
    lastOrderDate: r.lastOrderDate,
  }));

  const statsMap = new Map<string, { totalRevenue: number; orderCount: number; highestOrder: number; lastOrderDate: string }>();
  let globalRevenue = 0;
  let newCustomersThisMonth = 0;
  let repeatCustomers = 0;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  for (const r of customerStatsRows) {
    statsMap.set(r.customerId, {
      totalRevenue: r.totalRevenue || 0,
      orderCount: r.orderCount || 0,
      highestOrder: r.highestOrder || 0,
      lastOrderDate: r.lastOrderDate || "",
    });
    globalRevenue += r.totalRevenue || 0;
    if (r.orderCount > 1) repeatCustomers++;
  }

  for (const c of customers) {
    if (c.createdAt >= thirtyDaysAgo) {
      const stat = statsMap.get(c.id);
      if (stat && stat.orderCount > 0) {
        newCustomersThisMonth++;
      }
    }
  }

  const top5Revenue = customerStatsRows
    .sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0))
    .slice(0, 5)
    .reduce((sum, r) => sum + (r.totalRevenue || 0), 0);

  const top5Contribution = globalRevenue > 0 ? ((top5Revenue / globalRevenue) * 100).toFixed(1) : "0.0";
  const globalAov = customerStatsRows.reduce((sum, r) => sum + (r.orderCount || 0), 0) > 0 
    ? globalRevenue / customerStatsRows.reduce((sum, r) => sum + (r.orderCount || 0), 0)
    : 0;
  const globalHighest = customerStatsRows.reduce((max, r) => Math.max(max, r.highestOrder || 0), 0);

  const customerCodes = await (async () => {
    try {
      const ids = customers.map((c) => c.id).filter(Boolean);
      if (!ids.length) return new Map<string, string>();
      const placeholders = ids.map(() => "?").join(",");
      const rows = await prisma.$queryRawUnsafe<Array<{ customerId: string; code: string }>>(
        `SELECT customerId, code FROM CustomerCode WHERE customerId IN (${placeholders})`,
        ...ids
      );
      const map = new Map<string, string>();
      for (const r of rows || []) {
        if (r.customerId && r.code) map.set(r.customerId, r.code);
      }
      return map;
    } catch {
      return new Map<string, string>();
    }
  })();

  const loyaltyRows = await prisma.$queryRawUnsafe<Array<{ customerId: string; points: number }>>(
    `SELECT customerId, COALESCE(SUM(points),0) as points
     FROM "LoyaltyLedger"
     GROUP BY customerId`
  ).catch(() => []);
  const loyaltyMap = new Map<string, number>();
  for (const r of loyaltyRows || []) {
    loyaltyMap.set(r.customerId, Number(r.points || 0));
  }

  const canExport = hasPermission(session.user.role, PERMISSIONS.CUSTOMER_EXPORT);

  const exportCustomers = customers.map((c) => ({
    ...c,
    loyaltyPoints: Number(loyaltyMap.get(c.id) || 0),
  }));
  const { rows: exportData, columns: exportColumns } = buildCustomerExport(exportCustomers as any);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">Central customer profile repository for invoices and quotations.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <LoadingLink href="/customers/events">
              <CalendarDays className="mr-2 h-4 w-4" />
              Events
            </LoadingLink>
          </Button>
          {canExport && (
            <ExportButton filename="customers" data={exportData} columns={exportColumns} title="Customers" label="Export Customers" />
          )}
          <Button asChild>
            <LoadingLink href="/customers/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Customer
            </LoadingLink>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground font-medium">Total Customers</p>
            <p className="text-2xl font-bold">{customers.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{newCustomersThisMonth} new this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground font-medium">Total Revenue</p>
            <p className="text-2xl font-bold">{formatCurrency(globalRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-1">Top 5: {top5Contribution}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground font-medium">Average Order Value</p>
            <p className="text-2xl font-bold">{formatCurrency(globalAov)}</p>
            <p className="text-xs text-muted-foreground mt-1">Highest: {formatCurrency(globalHighest)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground font-medium">Repeat Customers</p>
            <p className="text-2xl font-bold">{repeatCustomers}</p>
            <p className="text-xs text-muted-foreground mt-1">{customers.length > 0 ? ((repeatCustomers / customers.length) * 100).toFixed(1) : 0}% of total</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Type & Tier</TableHead>
              <TableHead>Purchases</TableHead>
              <TableHead>Last Order</TableHead>
              <TableHead>Loyalty</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No customers found.
                </TableCell>
              </TableRow>
            ) : (
              customers.map((c) => {
                const stat = statsMap.get(c.id) || { totalRevenue: 0, orderCount: 0, highestOrder: 0, lastOrderDate: "" };
                const aov = stat.orderCount > 0 ? stat.totalRevenue / stat.orderCount : 0;
                
                let tier = "Silver";
                let tierColor = "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300";
                if (stat.totalRevenue >= customerSettings.platinumThreshold) {
                  tier = "Platinum";
                  tierColor = "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
                } else if (stat.totalRevenue >= customerSettings.goldThreshold) {
                  tier = "Gold";
                  tierColor = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
                }

                const tags: string[] = [];
                if (aov > customerSettings.highValueAov) tags.push("High Value");
                if (stat.orderCount >= 2) tags.push("Repeat");
                if (c.createdAt >= thirtyDaysAgo) tags.push("New");
                if (c.country && c.country.toLowerCase() !== "india") tags.push("Intl");

                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-base">{c.name}</span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{customerCodes.get(c.id) || "-"}</span>
                          <span>•</span>
                          <span>{c.phone || c.email || "-"}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {c.city || "-"} {c.state ? `, ${c.state}` : ""}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-2">
                        <span className="text-sm">{(c as Record<string, unknown>).customerType as string || "Retail"}</span>
                        <Badge variant="secondary" className={tierColor}>{tier}</Badge>
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {tags.map(t => <Badge key={t} variant="outline" className="text-[10px] h-4 px-1 py-0">{t}</Badge>)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-green-600">{formatCurrency(stat.totalRevenue)}</span>
                        <span className="text-xs text-muted-foreground">{stat.orderCount} Orders</span>
                        <span className="text-xs text-muted-foreground">AOV: {formatCurrency(aov)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm">{stat.lastOrderDate ? formatDate(new Date(stat.lastOrderDate)) : "-"}</span>
                        <span className="text-xs text-muted-foreground">Since: {formatDate(c.createdAt)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{Number(loyaltyMap.get(c.id) || 0).toFixed(2)} pts</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="icon" asChild title="Create Invoice">
                          <Link href={`/sales/new?customerId=${c.id}`}>
                            <FileText className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="outline" size="icon" asChild title="Create Quotation">
                          <Link href={`/quotes/new?customerId=${c.id}`}>
                            <FileDown className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/customers/${c.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/customers/${c.id}/edit`}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </Button>
                        <span className="inline-flex ml-2">
                          <CustomerDeleteButton customerId={c.id} />
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
