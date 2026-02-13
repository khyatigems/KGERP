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
import type { Inventory, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type InventoryWithExtras = Inventory & {
  weightRatti?: number | null;
};

type InventoryListItem = Inventory & {
  media: { id: string; createdAt: Date; type: string; inventoryId: string; mediaUrl: string; isPrimary: boolean }[];
  categoryCode?: { name: string; code: string } | null;
  gemstoneCode?: { name: string; code: string } | null;
  colorCode?: { name: string; code: string } | null;
  cutCode?: { name: string; code: string } | null;
  collectionCode?: { name: string } | null;
  rashis?: { name: string }[];
  certificates?: { name: string; remarks?: string | null }[];
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

  const buildWhere = (strict: boolean): Prisma.InventoryWhereInput => {
    const w: Prisma.InventoryWhereInput = {};

    if (query) {
      w.OR = [
        { sku: { contains: query } },
        { itemName: { contains: query } },
      ];
    }

    if (status && status !== "ALL") w.status = status;
    
    if (category && category !== "ALL") {
        if (strict) {
            w.OR = [
                { category: { equals: category } },
                { categoryCode: { is: { name: { equals: category } } } }
            ];
        } else {
            w.category = category;
        }
    }

    if (gemType && gemType !== "ALL") {
        if (strict) {
            w.OR = [
                { gemType: { equals: gemType } },
                { gemstoneCode: { is: { name: { equals: gemType } } } }
            ];
        } else {
            w.gemType = gemType;
        }
    }
    
    if (color && color !== "ALL") {
        if (strict) {
            w.OR = [
                { color: { equals: color } },
                { colorCode: { is: { name: { equals: color } } } }
            ];
        } else {
            w.color = color;
        }
    }

    if (vendorId && vendorId !== "ALL") w.vendorId = vendorId;
    
    // Only apply strict ID filters if we are in strict mode, as these columns/relations might be missing
    if (strict) {
        if (collectionId && collectionId !== "ALL") w.collectionCodeId = collectionId;
        
        if (rashiId && rashiId !== "ALL") {
            w.rashis = { some: { id: rashiId } };
        }
    }

    if (weightRange && weightRange !== "ALL") {
        const [min, max] = weightRange.split("-");
        if (max === "plus") {
            w.weightValue = { gte: parseFloat(min) };
        } else {
            w.weightValue = { gte: parseFloat(min), lte: parseFloat(max) };
        }
    }
    
    return w;
  };

  let rawInventory: InventoryListItem[] = [];
  let categories: { id: string; name: string }[] = [];
  let gemstones: { id: string; name: string }[] = [];
  let colors: { id: string; name: string }[] = [];
  let vendors: { id: string; name: string }[] = [];
  let collections: { id: string; name: string }[] = [];
  let rashis: { id: string; name: string }[] = [];
  let certificates: { id: string; name: string }[] = [];

  try {
    const where = buildWhere(true);
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
      prisma.categoryCode.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.gemstoneCode.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.colorCode.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.vendor.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.collectionCode.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.rashiCode.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.certificateCode.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    ]);
    rawInventory = results[0] as InventoryListItem[];
    categories = results[1] as { id: string; name: string }[];
    gemstones = results[2] as { id: string; name: string }[];
    colors = results[3] as { id: string; name: string }[];
    vendors = results[4] as { id: string; name: string }[];
    collections = results[5] as { id: string; name: string }[];
    rashis = results[6] as { id: string; name: string }[];
    certificates = results[7] as { id: string; name: string }[];
  } catch (error) {
    console.error("Inventory fetch failed (strict mode), falling back to safe mode:", error);
    try {
        const where = buildWhere(false);
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
              // Exclude all relation fields that might be missing
            },
          }),
          // Try to fetch master data individually, if they fail, return empty
          prisma.categoryCode.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }).catch(() => []),
          prisma.gemstoneCode.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }).catch(() => []),
          prisma.colorCode.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }).catch(() => []),
          prisma.vendor.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }).catch(() => []),
        ]);
        rawInventory = results[0] as InventoryListItem[];
        categories = results[1] as { id: string; name: string }[];
        gemstones = results[2] as { id: string; name: string }[];
        colors = results[3] as { id: string; name: string }[];
        vendors = results[4] as { id: string; name: string }[];
        // Leave others empty
    } catch (finalError) {
        console.error("Critical: Inventory fetch failed even in safe mode:", finalError);
        // Fallback to empty to prevent page crash
        rawInventory = [];
    }
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
      rashi: item.rashis?.map(r => r.name).join(", ") || "-",
      collection: item.collectionCode?.name || "-",
      sellingRate: item.sellingRatePerCarat || item.flatSellingPrice || 0,
      certification: item.certificates?.map(c => c.remarks ? `${c.name} (${c.remarks})` : c.name).join(", ") || item.certification || "-",
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
