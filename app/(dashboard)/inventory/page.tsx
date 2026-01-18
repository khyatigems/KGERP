import { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ExportButton } from "@/components/ui/export-button";
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
  title: "Inventory | Khyati Gems",
};

export default async function InventoryPage() {
  const inventory = await prisma.inventory.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      media: {
        take: 1,
      },
    },
  });

  const exportData = inventory.map(item => ({
    sku: item.sku,
    itemName: item.itemName,
    gemType: item.gemType,
    weight: `${item.weightValue} ${item.weightUnit}`,
    price: formatCurrency(item.pricingMode === "PER_CARAT"
       ? (item.sellingRatePerCarat || 0) * item.weightValue
       : item.flatSellingPrice || 0),
    status: item.status,
    date: formatDate(item.createdAt)
  }));

  const columns = [
    { header: "SKU", key: "sku" },
    { header: "Name", key: "itemName" },
    { header: "Type", key: "gemType" },
    { header: "Weight", key: "weight" },
    { header: "Price", key: "price" },
    { header: "Status", key: "status" },
    { header: "Date", key: "date" }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
        <div className="flex items-center gap-2">
            <ExportButton 
                filename="inventory_report" 
                data={exportData} 
                columns={columns} 
                title="Inventory Report" 
            />
            <Button asChild>
              <Link href="/inventory/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Link>
            </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No inventory items found.
                </TableCell>
              </TableRow>
            ) : (
              inventory.map((item) => {
                const price =
                  item.pricingMode === "PER_CARAT"
                    ? (item.sellingRatePerCarat || 0) * item.weightValue
                    : item.flatSellingPrice || 0;

                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.sku}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{item.itemName}</span>
                        {item.internalName && (
                          <span className="text-xs text-muted-foreground">
                            {item.internalName}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{item.gemType}</TableCell>
                    <TableCell>
                      {item.weightValue} {item.weightUnit}
                    </TableCell>
                    <TableCell>{formatCurrency(price)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.status === "IN_STOCK"
                            ? "default"
                            : item.status === "SOLD"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {item.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(item.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/inventory/${item.id}/edit`}>Edit</Link>
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
