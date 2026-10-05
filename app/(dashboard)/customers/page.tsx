import { Metadata } from "next";
import Link from "next/link";
import {
  Plus,
  FileText,
  FileDown,
  CalendarDays,
  Search,
  Users,
  Wallet,
  ShoppingBag,
  Repeat2,
  MoreHorizontal,
  Eye,
  Pencil,
  X,
} from "lucide-react";
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
import { AnimatedPage } from "@/components/ui/animated-page";
import { redirect } from "next/navigation";
import { getCustomerPurchaseStats } from "@/lib/customer-purchase-stats";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const metadata: Metadata = {
  title: "Customers | KhyatiGems™",
};

export const dynamic = "force-dynamic";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string; tier?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, PERMISSIONS.CUSTOMER_VIEW)) redirect("/");

  await ensureCustomerSecondaryPhoneSchema();
  await ensureReturnsSchema();

  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const selectedType = (sp.type || "").trim();
  const selectedTier = ["Silver", "Gold", "Platinum"].includes(sp.tier || "") ? sp.tier! : "";

  const allCustomers = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
  });

  const customerSettingsRow = await prisma.setting.findUnique({ where: { key: "customer_settings" } });
  const customerSettings = customerSettingsRow ? JSON.parse(customerSettingsRow.value) : { platinumThreshold: 100000, goldThreshold: 50000, highValueAov: 25000 };

  const customerStatsRows = await getCustomerPurchaseStats();
  const tierForRevenue = (revenue: number) => {
    if (revenue >= customerSettings.platinumThreshold) return "Platinum";
    if (revenue >= customerSettings.goldThreshold) return "Gold";
    return "Silver";
  };

  const customerTypes = Array.from(new Set(
    allCustomers.map((customer) => customer.customerType?.trim() || "Retail")
  )).sort((a, b) => a.localeCompare(b));

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

  for (const c of allCustomers) {
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
  const normalizedQuery = q.toLocaleLowerCase();
  const customers = allCustomers.filter((customer) => {
    const matchesQuery = !normalizedQuery || [
      customer.name,
      customer.email,
      customer.phone,
      customer.phoneSecondary,
      customer.city,
    ].some((value) => value?.toLocaleLowerCase().includes(normalizedQuery));
    const matchesType = !selectedType || (customer.customerType?.trim() || "Retail") === selectedType;
    const matchesTier = !selectedTier || tierForRevenue(statsMap.get(customer.id)?.totalRevenue || 0) === selectedTier;
    return matchesQuery && matchesType && matchesTier;
  });

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
    `SELECT customerId, ROUND(COALESCE(SUM(points),0)) as points
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
    <AnimatedPage><div className="space-y-6">
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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Card className="overflow-hidden border-l-4 border-l-violet-500 bg-linear-to-br from-violet-500/[0.07] to-card">
          <CardContent className="flex items-start justify-between gap-3 p-4 md:p-5">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Customers</p>
              <p className="mt-1 text-2xl font-bold tracking-tight">{allCustomers.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">{newCustomersThisMonth} new this month</p>
            </div>
            <span className="rounded-xl bg-violet-500/10 p-2.5 text-violet-600 dark:text-violet-300"><Users className="h-5 w-5" /></span>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-l-4 border-l-emerald-500 bg-linear-to-br from-emerald-500/[0.07] to-card">
          <CardContent className="flex items-start justify-between gap-3 p-4 md:p-5">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
              <p className="mt-1 text-2xl font-bold tracking-tight">{formatCurrency(globalRevenue)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Top 5 customers: {top5Contribution}%</p>
            </div>
            <span className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-300"><Wallet className="h-5 w-5" /></span>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-l-4 border-l-sky-500 bg-linear-to-br from-sky-500/[0.07] to-card">
          <CardContent className="flex items-start justify-between gap-3 p-4 md:p-5">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Average Order Value</p>
              <p className="mt-1 text-2xl font-bold tracking-tight">{formatCurrency(globalAov)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Highest: {formatCurrency(globalHighest)}</p>
            </div>
            <span className="rounded-xl bg-sky-500/10 p-2.5 text-sky-600 dark:text-sky-300"><ShoppingBag className="h-5 w-5" /></span>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-l-4 border-l-amber-500 bg-linear-to-br from-amber-500/[0.07] to-card">
          <CardContent className="flex items-start justify-between gap-3 p-4 md:p-5">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Repeat Customers</p>
              <p className="mt-1 text-2xl font-bold tracking-tight">{repeatCustomers}</p>
              <p className="mt-1 text-xs text-muted-foreground">{allCustomers.length > 0 ? ((repeatCustomers / allCustomers.length) * 100).toFixed(1) : 0}% of total</p>
            </div>
            <span className="rounded-xl bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-300"><Repeat2 className="h-5 w-5" /></span>
          </CardContent>
        </Card>
      </div>

      <form action="/customers" method="GET" className="grid gap-3 rounded-xl border bg-card p-3 shadow-sm sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_200px_180px_auto_auto] lg:items-center">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name, email, phone or city"
            aria-label="Search customers"
            className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <select
          name="type"
          defaultValue={selectedType}
          aria-label="Filter by customer type"
          className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">All customer types</option>
          {customerTypes.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
        <select
          name="tier"
          defaultValue={selectedTier}
          aria-label="Filter by customer tier"
          className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">All tiers</option>
          <option value="Silver">Silver</option>
          <option value="Gold">Gold</option>
          <option value="Platinum">Platinum</option>
        </select>
        <Button type="submit" className="h-10"><Search className="mr-2 h-4 w-4" />Search</Button>
        {(q || selectedType || selectedTier) && (
          <Button asChild type="button" variant="ghost" className="h-10">
            <Link href="/customers"><X className="mr-2 h-4 w-4" />Clear</Link>
          </Button>
        )}
      </form>

      <div className="flex items-center justify-between gap-3 px-1">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{customers.length}</span> of {allCustomers.length} customers
        </p>
        {(selectedType || selectedTier) && (
          <div className="flex flex-wrap gap-1.5">
            {selectedType && <Badge variant="secondary">Type: {selectedType}</Badge>}
            {selectedTier && <Badge variant="secondary">Tier: {selectedTier}</Badge>}
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
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
                  No customers match these filters. Try a different search or clear the filters.
                </TableCell>
              </TableRow>
            ) : (
              customers.map((c) => {
                const stat = statsMap.get(c.id) || { totalRevenue: 0, orderCount: 0, highestOrder: 0, lastOrderDate: "" };
                const aov = stat.orderCount > 0 ? stat.totalRevenue / stat.orderCount : 0;
                
                const tier = tierForRevenue(stat.totalRevenue);
                let tierColor = "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300";
                if (tier === "Platinum") {
                  tierColor = "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
                } else if (tier === "Gold") {
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
                        <span className="text-sm">{c.customerType || "Retail"}</span>
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon" title={`Actions for ${c.name}`} aria-label={`Actions for ${c.name}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem asChild>
                            <Link href={`/sales/new?customerId=${c.id}`}><FileText className="mr-2 h-4 w-4" />Create invoice</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/quotes/new?customerId=${c.id}`}><FileDown className="mr-2 h-4 w-4" />Create quotation</Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href={`/customers/${c.id}`}><Eye className="mr-2 h-4 w-4" />View customer</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/customers/${c.id}/edit`}><Pencil className="mr-2 h-4 w-4" />Edit customer</Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <CustomerDeleteButton customerId={c.id} compact />
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div></AnimatedPage>
  );
}
