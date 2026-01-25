import { Metadata } from "next";
import { Eye, Plus, Upload } from "lucide-react";
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
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Purchases | KhyatiGems™",
};

export default async function PurchasesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Purchases reveal cost, so restrict to those who can view cost
  if (!hasPermission(session.user.role, PERMISSIONS.INVENTORY_VIEW_COST)) {
     redirect("/");
  }

  const purchases = await prisma.purchase.findMany({
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
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
            {purchases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No purchases found.
                </TableCell>
              </TableRow>
            ) : (
              purchases.map((purchase) => {
                const totalCost = purchase.totalAmount || purchase.purchaseItems.reduce((sum, item) => sum + item.totalCost, 0);
                return (
                  <TableRow key={purchase.id}>
                    <TableCell>{formatDate(purchase.purchaseDate)}</TableCell>
                    <TableCell className="font-medium">{purchase.invoiceNo || "-"}</TableCell>
                    <TableCell>{purchase.vendor?.name}</TableCell>
                    <TableCell>{purchase.purchaseItems.length}</TableCell>
                    <TableCell>{formatCurrency(totalCost)}</TableCell>
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
