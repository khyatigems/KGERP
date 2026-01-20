import { Metadata } from "next";
import Link from "next/link";
import { Eye, Plus, Upload } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Purchases | KhyatiGems™",
};

export default async function PurchasesPage() {
  const purchases = await prisma.purchase.findMany({
    orderBy: {
      purchaseDate: "desc",
    },
    include: {
      items: true,
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
            <Link href="/purchases/import">
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Link>
          </Button>
          <Button asChild>
            <Link href="/purchases/new">
              <Plus className="mr-2 h-4 w-4" />
              New Purchase
            </Link>
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
                const totalCost = purchase.items.reduce((sum, item) => sum + item.totalCost, 0);
                return (
                  <TableRow key={purchase.id}>
                    <TableCell>{formatDate(purchase.purchaseDate)}</TableCell>
                    <TableCell className="font-medium">{purchase.invoiceNo || "-"}</TableCell>
                    <TableCell>{purchase.vendor?.name}</TableCell>
                    <TableCell>{purchase.items.length}</TableCell>
                    <TableCell>{formatCurrency(totalCost)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{purchase.paymentStatus || "PENDING"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/purchases/${purchase.id}`}>
                          <Eye className="mr-1 h-4 w-4" />
                          View
                        </Link>
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
