import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Plus, Upload } from "lucide-react";
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
import { InventorySearch } from "@/components/inventory/inventory-search";
import { InventoryActions } from "@/components/inventory/inventory-actions";
import type { Inventory } from "@prisma/client";

type InventoryWithExtras = Inventory & {
  weightRatti?: number | null;
};

export const metadata: Metadata = {
  title: "Inventory | Khyati Gems",
};

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string; status?: string }>;
}) {
  const { query, status } = await searchParams;

  const where: Record<string, unknown> = {};

  if (query) {
    where.OR = [
      { sku: { contains: query } },
      { itemName: { contains: query } },
    ];
  }

  if (status && status !== "ALL") {
    where.status = status;
  }

  const inventory = await prisma.inventory.findMany({
    where,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      media: {
        take: 1,
      },
    },
  });

  const exportData = inventory.map((item) => {
    const typedItem = item as InventoryWithExtras;
    return {
    sku: item.sku,
    itemName: item.itemName,
    gemType: item.gemType,
    weight: `${item.weightValue} ${item.weightUnit}`,
      ratti: typedItem.weightRatti || 0,
      price: formatCurrency(
        item.pricingMode === "PER_CARAT"
          ? (item.sellingRatePerCarat || 0) * item.weightValue
          : item.flatSellingPrice || 0
      ),
      status: item.status,
      date: formatDate(item.createdAt),
    };
  });

  const columns = [
    { header: "SKU", key: "sku" },
    { header: "Name", key: "itemName" },
    { header: "Type", key: "gemType" },
    { header: "Weight", key: "weight" },
    { header: "Ratti", key: "ratti" },
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
            <Button variant="outline" asChild>
                <Link href="/inventory/import">
                    <Upload className="mr-2 h-4 w-4" />
                    Import
                </Link>
            </Button>
            <Button asChild>
              <Link href="/inventory/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Link>
            </Button>
        </div>
      </div>

      <div className="bg-card p-4 rounded-md border">
        <InventorySearch />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead>Ratti</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center">
                  No inventory items found.
                </TableCell>
              </TableRow>
            ) : (
              inventory.map((item) => {
                const typedItem = item as InventoryWithExtras;
                const price =
                  item.pricingMode === "PER_CARAT"
                    ? (item.sellingRatePerCarat || 0) * item.weightValue
                    : item.flatSellingPrice || 0;

                return (
                    <TableRow key={item.id}>
                    <TableCell>
                      {item.media[0]?.url ? (
                        <Image
                          src={item.media[0].url}
                          alt={item.itemName}
                          width={48}
                          height={48}
                          className="h-12 w-12 rounded object-cover border"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded border flex items-center justify-center text-[10px] text-muted-foreground bg-muted">
                          No image
                        </div>
                      )}
                    </TableCell>
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
                    <TableCell>
                      {typedItem.weightRatti ? typedItem.weightRatti.toFixed(2) : "-"}
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
                      <InventoryActions item={item} />
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
