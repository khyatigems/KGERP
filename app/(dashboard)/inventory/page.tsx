import { Metadata } from "next";
import { Plus, Upload } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ExportButton } from "@/components/ui/export-button";
import { LoadingLink } from "@/components/ui/loading-link";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { InventorySearch } from "@/components/inventory/inventory-search";
import { InventoryCardList } from "@/components/inventory/inventory-card-list";
import type { Inventory } from "@prisma/client";

export const dynamic = "force-dynamic";

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
  if (category && category !== "ALL") {
      where.OR = [
          { category: category },
          { categoryCode: { name: category } }
      ];
  }

  if (gemType && gemType !== "ALL") {
      if (where.OR) {
          // If OR already exists (from query or category), we need to be careful.
          // For simplicity, we'll just use the relation if it's from the dropdown.
          where.gemstoneCode = { name: gemType };
      } else {
          where.OR = [
              { gemType: gemType },
              { gemstoneCode: { name: gemType } }
          ];
      }
  }
  
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

  let rawInventory: any[] = [];
  let categories: any[] = [];
  let gemstones: any[] = [];
  let colors: any[] = [];
  let vendors: { id: string; name: string }[] = [];
  let collections: any[] = [];
  let rashis: any[] = [];
  let certificates: any[] = [];
  
  try {
    const results = await Promise.all([
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
          rashis: { select: { name: true } },
          certificates: { select: { name: true, remarks: true } },
        },
      }),
      prisma.categoryCode.findMany({ orderBy: { name: "asc" } }),
      prisma.gemstoneCode.findMany({ orderBy: { name: "asc" } }),
      prisma.colorCode.findMany({ orderBy: { name: "asc" } }),
      prisma.vendor.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.collectionCode.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
      prisma.rashiCode.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
      prisma.certificateCode.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
    ]);
    
    rawInventory = results[0] as any[];
    categories = results[1] as any[];
    gemstones = results[2] as any[];
    colors = results[3] as any[];
    vendors = results[4] as { id: string; name: string }[];
    collections = results[5] as any[];
    rashis = results[6] as any[];
    certificates = results[7] as any[];
  } catch (e) {
    console.error("Inventory page data fetch failed:", e);
    rawInventory = [];
    categories = [];
    gemstones = [];
    colors = [];
    vendors = [];
    collections = [];
    rashis = [];
    certificates = [];
  }

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
      rashi: item.rashis?.map((r: { name: string }) => r.name).join(", ") || "-",
      collection: item.collectionCode?.name || "-",
      sellingRate: item.sellingRatePerCarat || item.flatSellingPrice || 0,
      certification: item.certificates?.map((c: { name: string; remarks?: string | null }) => c.remarks ? `${c.name} (${c.remarks})` : c.name).join(", ") || item.certification || "-",
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

      <InventoryTable 
        data={inventory}
        vendors={vendors}
        categories={categories}
        gemstones={gemstones}
        colors={colors}
        rashis={rashis}
        certificates={certificates}
        collections={collections}
      />
    </div>
  );
}
