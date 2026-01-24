import { Metadata } from "next";
import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ExportButton } from "@/components/ui/export-button";
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
import { InventorySearch } from "@/components/inventory/inventory-search";
import { InventoryActions } from "@/components/inventory/inventory-actions";
import { InventoryCardList } from "@/components/inventory/inventory-card-list";
import { InventoryCardMedia } from "@/components/inventory/inventory-card-media";
import type { Inventory } from "@prisma/client-custom-v2";

type InventoryWithExtras = Inventory & {
  weightRatti?: number | null;
};

export const metadata: Metadata = {
  title: "Inventory | KhyatiGems™",
};

import { removeDuplicates } from "@/lib/dedup";

import { auth } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ 
    query?: string; 
    status?: string;
    category?: string;
    gemType?: string;
    color?: string;
    vendorId?: string;
    collectionId?: string;
    rashiId?: string;
    weightRange?: string;
  }>;
}) {
  const session = await auth();
  const userRole = session?.user?.role || "VIEWER";
  const canCreate = hasPermission(userRole, PERMISSIONS.INVENTORY_CREATE);

  const { query, status, category, gemType, color, vendorId, collectionId, rashiId, weightRange } = await searchParams;

  const where: Record<string, unknown> = {};

  if (query) {
    where.OR = [
      { sku: { contains: query } },
      { itemName: { contains: query } },
    ];
  }

  if (status && status !== "ALL") where.status = status;
  if (category && category !== "ALL") where.category = category;
  if (gemType && gemType !== "ALL") where.gemType = gemType;
  
  if (color && color !== "ALL") {
      where.colorCode = { name: color };
  }

  if (vendorId && vendorId !== "ALL") where.vendorId = vendorId;
  
  if (collectionId && collectionId !== "ALL") where.collectionCodeId = collectionId;
  
  if (rashiId && rashiId !== "ALL") {
      where.rashis = { some: { id: rashiId } };
  }

  if (weightRange && weightRange !== "ALL") {
      const [min, max] = weightRange.split("-");
      if (max === "plus") {
          where.weightValue = { gte: parseFloat(min) };
      } else {
          where.weightValue = { gte: parseFloat(min), lte: parseFloat(max) };
      }
  }

  const [rawInventory, categories, gemstones, colors, vendors, collections, rashis] = await Promise.all([
    prisma.inventory.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        media: {
          orderBy: [
            { isPrimary: 'desc' },
            { createdAt: 'asc' }
          ],
          take: 1
        },
        categoryCode: { select: { name: true, code: true } },
        gemstoneCode: { select: { name: true, code: true } },
        colorCode: { select: { name: true, code: true } },
        cutCode: { select: { name: true, code: true } },
        collectionCode: { select: { name: true } },
        // Fixed relation name
        rashis: { select: { name: true } },
      },
    }),
    prisma.categoryCode.findMany({ orderBy: { name: "asc" } }),
    prisma.gemstoneCode.findMany({ orderBy: { name: "asc" } }),
    prisma.colorCode.findMany({ orderBy: { name: "asc" } }),
    prisma.vendor.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.collectionCode.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
    prisma.rashiCode.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
  ]);

  // Deduplicate inventory items by ID to ensure data integrity
  const inventory = removeDuplicates(rawInventory, 'id');

  const vendorMap = new Map<string, string>(vendors.map(v => [v.id, v.name]));

  const exportData = inventory.map((item) => {
    const typedItem = item as InventoryWithExtras;
    return {
      sku: item.sku,
      itemName: item.itemName,
      category: item.category,
      gemType: item.gemType,
      color: item.colorCode?.name || "-",
      weight: `${item.weightValue} ${item.weightUnit}`,
      ratti: typedItem.weightRatti || 0,
      cut: item.cutCode?.name || "-",
      shape: item.shape || "-",
      dimensions: item.dimensionsMm || "-",
      rashi: item.rashis?.map(r => r.name).join(", ") || "-",
      collection: item.collectionCode?.name || "-",
      sellingRate: item.sellingRatePerCarat || item.flatSellingPrice || 0,
      certification: item.certification || "-",
      treatment: item.treatment || "-",
      braceletType: item.braceletType || "-",
      beadSize: item.beadSizeMm ? `${item.beadSizeMm}mm` : "-",
      standardSize: item.standardSize || "-",
      beadCount: item.beadCount || "-",
      innerCircumference: item.innerCircumferenceMm ? `${item.innerCircumferenceMm}mm` : "-",
      price: formatCurrency(
        item.pricingMode === "PER_CARAT"
          ? (item.sellingRatePerCarat || 0) * (item.weightValue || 0)
          : item.flatSellingPrice || 0
      ),
      status: item.status,
      vendor: (item.vendorId && vendorMap.get(item.vendorId)) || "-",
      date: formatDate(item.createdAt),
    };
  });

  const columns = [
    { header: "Name", key: "itemName" },
    { header: "Category", key: "category" },
    { header: "Color", key: "color" },
    { header: "Weight", key: "weight" },
    { header: "Cut", key: "cut" },
    { header: "Shape", key: "shape" },
    { header: "Dimensions", key: "dimensions" },
    { header: "SKU", key: "sku" },
    { header: "Rashi", key: "rashi" },
    { header: "Collection", key: "collection" },
    { header: "Selling Rate", key: "sellingRate" },
    { header: "Certification", key: "certification" },
    { header: "Treatment", key: "treatment" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2">
            <ExportButton 
                filename="inventory_report" 
                data={exportData} 
                columns={columns} 
                title="Inventory Report" 
            />
            {canCreate && (
              <>
                <Button variant="outline" asChild className="transition-all duration-200 hover:scale-105 active:scale-95">
                    <LoadingLink href="/inventory/import">
                        <Upload className="mr-2 h-4 w-4" />
                        Import
                    </LoadingLink>
                </Button>
                <Button asChild className="transition-all duration-200 hover:scale-105 active:scale-95">
                    <LoadingLink href="/inventory/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Item
                    </LoadingLink>
                </Button>
              </>
            )}
        </div>
      </div>

      <div className="bg-card p-4 rounded-md border">
        <InventorySearch 
            vendors={vendors}
            categories={categories}
            gemstones={gemstones}
            colors={colors}
            collections={collections}
            rashis={rashis}
        />
      </div>

      <InventoryCardList data={inventory} />

      <div className="rounded-md border hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Image</TableHead>
              <TableHead className="w-[100px]">SKU</TableHead>
              <TableHead className="min-w-[200px]">Item Name</TableHead>
              <TableHead className="w-[100px]">Category</TableHead>
              <TableHead className="w-[100px]">Type</TableHead>
              <TableHead className="w-[80px]">Color</TableHead>
              <TableHead className="w-[80px]">Cut</TableHead>
              <TableHead className="w-[100px]">Weight</TableHead>
              <TableHead className="w-[80px]">Ratti</TableHead>
              <TableHead className="w-[100px]">Price</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[100px]">Vendor</TableHead>
              <TableHead className="w-[100px]">Date Added</TableHead>
              <TableHead className="w-[60px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={14} className="h-24 text-center">
                  No inventory items found.
                </TableCell>
              </TableRow>
            ) : (
              inventory.map((item) => {
                const price =
                  item.pricingMode === "PER_CARAT"
                    ? (item.sellingRatePerCarat || 0) * (item.weightValue || 0)
                    : item.flatSellingPrice || 0;
                
                return (
                    <TableRow key={item.id}>
                    <TableCell>
                      <InventoryCardMedia item={item} className="h-12 w-12" />
                    </TableCell>
                    <TableCell className="font-medium font-mono text-xs">{item.sku}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <Link href={`/inventory/${item.id}`} className="hover:underline font-medium">
                            {item.itemName}
                        </Link>
                        {item.internalName && (
                          <span className="text-xs text-muted-foreground">
                            {item.internalName}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{item.gemType}</span>
                        {(item.category === "Bracelets" || item.category === "Bracelet") && (
                          <span className="text-[10px] text-muted-foreground">
                            {[
                                item.braceletType,
                                item.standardSize,
                                item.beadSizeMm ? `${item.beadSizeMm}mm` : null
                            ].filter(Boolean).join(" • ")}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{item.colorCode?.name || "-"}</TableCell>
                    <TableCell>{item.cutCode?.name || "-"}</TableCell>
                    <TableCell>
                      {item.weightValue} {item.weightUnit}
                    </TableCell>
                    <TableCell>
                      {item.weightRatti ? item.weightRatti.toFixed(2) : "-"}
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
                    <TableCell className="text-xs text-muted-foreground">{(item.vendorId && vendorMap.get(item.vendorId)) || "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</TableCell>
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
