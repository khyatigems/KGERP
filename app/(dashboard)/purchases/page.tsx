import { Metadata } from "next";
import { Eye, Plus, Upload, IndianRupee, Package, Clock, Download, MoreHorizontal, Pencil, WalletCards, Store, CalendarRange } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LoadingLink } from "@/components/ui/loading-link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { PurchaseSearch } from "@/components/purchases/purchase-search";
import { AnimatedPage } from "@/components/ui/animated-page";

export const metadata: Metadata = {
  title: "Purchases | KhyatiGems™",
};

// Define explicit type for purchase with includes to fix inference
type PurchaseWithDetails = Prisma.PurchaseGetPayload<{
  include: {
    purchaseItems: true;
    payments: true;
    vendor: {
      select: { name: true };
    };
  };
}>;

function formatCompactAmount(value: number) {
  const amount = Math.abs(value);
  if (amount >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(value / 100000).toFixed(2)} Lakh`;
  if (amount >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return formatCurrency(value);
}

async function getPurchases(search?: string): Promise<PurchaseWithDetails[]> {
  try {
    const where: Prisma.PurchaseWhereInput = search ? {
      OR: [
        { invoiceNo: { contains: search } },
        { vendor: { name: { contains: search } } },
        // Notes field removed temporarily if causing type issues
        // { notes: { contains: search } },
        { purchaseItems: { some: { itemName: { contains: search } } } },
        { purchaseItems: { some: { category: { contains: search } } } },
      ]
    } : {};

    return await prisma.purchase.findMany({
      where,
      orderBy: {
        purchaseDate: "desc",
      },
      include: {
        purchaseItems: true,
        payments: true,
        vendor: {
          select: { name: true }
        }
      },
    });
  } catch (error) {
    console.error("Error loading purchases:", error);
    throw error;
  }
}

async function getPurchaseStats(search?: string) {
    const where: Prisma.PurchaseWhereInput = search ? {
      OR: [
        { invoiceNo: { contains: search } },
        { vendor: { name: { contains: search } } },
        // { notes: { contains: search } },
        { purchaseItems: { some: { itemName: { contains: search } } } },
        { purchaseItems: { some: { category: { contains: search } } } },
      ]
    } : {};

    const purchases = await prisma.purchase.findMany({
      where,
      select: {
        totalAmount: true,
        purchaseDate: true,
        vendorId: true,
        purchaseItems: { select: { totalCost: true } },
        payments: { select: { amount: true } },
      },
    });
    const totalAmount = purchases.reduce((sum, purchase) => sum + purchase.totalAmount, 0);
    const paidAmount = purchases.reduce((sum, purchase) => sum + purchase.payments.reduce((paymentSum, payment) => paymentSum + payment.amount, 0), 0);
    const currentMonth = new Date();
    const monthAmount = purchases.reduce((sum, purchase) => {
      const date = new Date(purchase.purchaseDate);
      return date.getFullYear() === currentMonth.getFullYear() && date.getMonth() === currentMonth.getMonth()
        ? sum + purchase.totalAmount
        : sum;
    }, 0);
    return {
      count: purchases.length,
      totalAmount,
      paidAmount,
      pendingAmount: Math.max(0, Math.round((totalAmount - paidAmount) * 100) / 100),
      itemCount: purchases.reduce((sum, purchase) => sum + purchase.purchaseItems.length, 0),
      vendorCount: new Set(purchases.map((purchase) => purchase.vendorId).filter(Boolean)).size,
      monthAmount,
    };
}

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");
  if (!(await checkUserPermission(userId, PERMISSIONS.PURCHASES_VIEW))) {
    redirect("/");
  }

  const { query } = await searchParams;
  const search = query || "";
  
  let purchases: PurchaseWithDetails[] = [];
  let stats = null;
  let error = null;

  try {
    [purchases, stats] = await Promise.all([
      getPurchases(search),
      getPurchaseStats(search)
    ]);
  } catch (e) {
    error = e;
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <h3 className="text-lg font-medium text-destructive">Failed to load purchases</h3>
        <p className="text-sm text-muted-foreground mt-2">
          {error instanceof Error ? error.message : "An unexpected error occurred"}
        </p>
      </div>
    );
  }

  return (
    <AnimatedPage>
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
          <Card className="xl:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.count}</div>
              <p className="text-xs text-muted-foreground">
                {search ? "Matching results" : "All time purchases"}
              </p>
            </CardContent>
          </Card>
          <Card className="xl:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Purchase Value</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCompactAmount(stats.totalAmount)}</div>
              <p className="text-xs text-muted-foreground">
                Total stock acquired
              </p>
            </CardContent>
          </Card>
          <Card className="xl:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid to Vendors</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCompactAmount(stats.paidAmount)}</div>
              <p className="text-xs text-muted-foreground">
                Recorded vendor payments
              </p>
            </CardContent>
          </Card>
          <Card className="xl:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              <WalletCards className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCompactAmount(stats.pendingAmount)}</div>
              <p className="text-xs text-muted-foreground">Balance payable to vendors</p>
            </CardContent>
          </Card>
          <Card className="xl:col-span-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stock Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.itemCount}</div>
              <p className="text-xs text-muted-foreground">Line items recorded</p>
            </CardContent>
          </Card>
          <Card className="xl:col-span-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Vendors</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.vendorCount}</div>
              <p className="text-xs text-muted-foreground">Vendors in this view</p>
            </CardContent>
          </Card>
          <Card className="xl:col-span-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <CalendarRange className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCompactAmount(stats.monthAmount)}</div>
              <p className="text-xs text-muted-foreground">Current-month purchase value</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Purchase Register</h2>
          <p className="text-sm text-muted-foreground">Stock received from vendors</p>
        </div>
        <PurchaseSearch />
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem asChild>
                <a href={`/api/purchases/export?type=summary&search=${search}`} download>
                  Summary Report
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={`/api/purchases/export?type=detailed&search=${search}`} download>
                  Detailed Report
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" asChild>
            <LoadingLink href="/purchases/import">
              <Upload className="mr-2 h-4 w-4" />
              Import
            </LoadingLink>
          </Button>
          <Button asChild>
            <LoadingLink href="/purchases/new">
              <Plus className="mr-2 h-4 w-4" />
              New Purchase
            </LoadingLink>
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Purchase No.</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Purchase Value</TableHead>
              <TableHead>Paid / Due</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!purchases || purchases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No purchases found.
                </TableCell>
              </TableRow>
            ) : (
              purchases.map((purchase) => {
                const totalCost = purchase.totalAmount || (purchase.purchaseItems || []).reduce((sum, item) => sum + (item.totalCost || 0), 0);
                
                // Safe formatting helpers
                const displayDate = (() => {
                  try {
                    return purchase.purchaseDate ? formatDate(purchase.purchaseDate) : "-";
                  } catch {
                    return "-";
                  }
                })();

                const displayCost = (() => {
                  try {
                    return formatCurrency(totalCost || 0);
                  } catch {
                    return "₹0.00";
                  }
                })();
                const paidAmount = Math.round(purchase.payments.reduce((sum, payment) => sum + payment.amount, 0) * 100) / 100;
                const dueAmount = Math.max(0, Math.round((totalCost - paidAmount) * 100) / 100);

                return (
                  <TableRow key={purchase.id}>
                    <TableCell>{displayDate}</TableCell>
                    <TableCell className="font-semibold text-emerald-700 dark:text-emerald-400">{purchase.invoiceNo || "-"}</TableCell>
                    <TableCell>{purchase.vendor?.name || "-"}</TableCell>
                    <TableCell>{purchase.purchaseItems?.length || 0}</TableCell>
                    <TableCell>{displayCost}</TableCell>
                    <TableCell className="text-xs"><span className="font-medium text-emerald-600">{formatCurrency(paidAmount)}</span><br /><span className="text-muted-foreground">Due {formatCurrency(dueAmount)}</span></TableCell>
                    <TableCell>
                      <Badge variant="outline">{purchase.paymentStatus || "PENDING"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" asChild>
                          <LoadingLink href={`/purchases/${purchase.id}`}><Eye className="mr-1 h-4 w-4" />View</LoadingLink>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button size="icon" variant="outline" title="More actions"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild><LoadingLink href={`/purchases/${purchase.id}/edit`}><Pencil className="mr-2 h-4 w-4" />Edit purchase</LoadingLink></DropdownMenuItem>
                            <DropdownMenuItem asChild><a href={`/api/purchases/export?type=detailed&search=${purchase.invoiceNo || purchase.id}`}><Download className="mr-2 h-4 w-4" />Export record</a></DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
    </AnimatedPage>
  );
}
