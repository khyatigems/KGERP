import { Metadata } from "next";
import { Eye, Plus, Upload, IndianRupee, Package, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LoadingLink } from "@/components/ui/loading-link";
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
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client-custom-v2";
import { PurchaseSearch } from "@/components/purchases/purchase-search";

export const metadata: Metadata = {
  title: "Purchases | KhyatiGems™",
};

// Define explicit type for purchase with includes to fix inference
type PurchaseWithDetails = Prisma.PurchaseGetPayload<{
  include: {
    purchaseItems: true;
    vendor: {
      select: { name: true };
    };
  };
}>;

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

    const [totalStats, pendingStats] = await Promise.all([
        prisma.purchase.aggregate({
            where,
            _count: { id: true },
            _sum: { totalAmount: true }
        }),
        prisma.purchase.aggregate({
            where: {
                ...where,
                paymentStatus: { not: "PAID" }
            },
            _sum: { totalAmount: true }
        })
    ]);

    return {
        count: totalStats._count?.id ?? 0,
        totalAmount: totalStats._sum?.totalAmount ?? 0,
        pendingAmount: pendingStats._sum?.totalAmount ?? 0
    };
}

export default async function PurchasesPage(props: { searchParams: Promise<{ q?: string }> }) {
  const searchParams = await props.searchParams;
  const search = searchParams?.q || "";

  const session = await auth();
  if (!session?.user) redirect("/login");

  // Purchases reveal cost, so restrict to those who can view cost
  if (!hasPermission(session.user.role, PERMISSIONS.INVENTORY_VIEW_COST)) {
     redirect("/");
  }

  let purchases: PurchaseWithDetails[] = [];
  let stats;
  let error;

  try {
    const [p, s] = await Promise.all([
        getPurchases(search),
        getPurchaseStats(search)
    ]);
    purchases = p;
    stats = s;
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
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</div>
              <p className="text-xs text-muted-foreground">
                Total value of purchases
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding Payments</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.pendingAmount)}</div>
              <p className="text-xs text-muted-foreground">
                Unpaid or pending amount
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <PurchaseSearch />
        <div className="flex gap-2">
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
              <TableHead>Invoice #</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total Cost</TableHead>
              <TableHead>Status</TableHead>
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

                return (
                  <TableRow key={purchase.id}>
                    <TableCell>{displayDate}</TableCell>
                    <TableCell className="font-medium">{purchase.invoiceNo || "-"}</TableCell>
                    <TableCell>{purchase.vendor?.name || "-"}</TableCell>
                    <TableCell>{purchase.purchaseItems?.length || 0}</TableCell>
                    <TableCell>{displayCost}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{purchase.paymentStatus || "PENDING"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" asChild>
                        <LoadingLink href={`/purchases/${purchase.id}`}>
                          <Eye className="mr-1 h-4 w-4" />
                          View
                        </LoadingLink>
                      </Button>
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
