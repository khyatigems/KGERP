import { Metadata } from "next";
import { Plus, Upload } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { hasTable } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cachedMasters } from "@/lib/cache";
import { Button } from "@/components/ui/button";
import { ExportButton } from "@/components/ui/export-button";
import { InventorySummaryExport } from "@/components/reports/inventory-summary-export";
import { LoadingLink } from "@/components/ui/loading-link";
import Link from "next/link";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { InventorySearch } from "@/components/inventory/inventory-search";
import { InventoryCardList } from "@/components/inventory/inventory-card-list";
import { InventoryStats } from "@/components/inventory/inventory-stats";
import { InventorySavedToast } from "@/components/inventory/inventory-saved-toast";
import { InventoryInsightBar } from "@/components/inventory/inventory-insight-bar";
import type { Inventory, Prisma } from "@prisma/client";
import { removeDuplicates } from "@/lib/dedup";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";

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

const ITEMS_PER_PAGE = 50;

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
    page?: string;
  }>;
}) {
  const session = await auth();
  const userRole = session?.user?.role || "VIEWER";
  const userId = session?.user?.id;

  // Parallel permission checks
  const [canView, canCreate, canManageAttentionVisibility] = userId
    ? await Promise.all([
        checkUserPermission(userId, PERMISSIONS.INVENTORY_VIEW),
        checkUserPermission(userId, PERMISSIONS.INVENTORY_CREATE),
        checkUserPermission(userId, PERMISSIONS.INVENTORY_EDIT)
      ])
    : [false, false, false];

  if (!canView) {
    return (
      <div className="p-6">
        <div className="bg-destructive/15 text-destructive border-destructive/20 border px-4 py-3 rounded-md relative">
          <strong className="font-bold">Access Denied!</strong>
          <span className="block sm:inline"> You don't have permission to view inventory.</span>
        </div>
      </div>
    );
  }

  const { query, status, category, gemType, color, vendorId, collectionId, rashiId, weightRange, page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page || "1", 10) || 1);
  const filtersKey = JSON.stringify({ query, status, category, gemType, color, vendorId, collectionId, rashiId, weightRange, page: currentPage });

  const [
    canMedia,
    canCategoryCode,
    canGemstoneCode,
    canColorCode,
    canCutCode,
    canCollectionCode,
    canRashiCode,
    canInventoryToRashi,
    canCertificateCode,
    canCertificateToInventory,
    canVendor,
  ] = await Promise.all([
    hasTable("InventoryMedia"),
    hasTable("CategoryCode"),
    hasTable("GemstoneCode"),
    hasTable("ColorCode"),
    hasTable("CutCode"),
    hasTable("CollectionCode"),
    hasTable("RashiCode"),
    hasTable("_InventoryToRashiCode"),
    hasTable("CertificateCode"),
    hasTable("_CertificateCodeToInventory"),
    hasTable("Vendor"),
  ]);

  const canRashi = canRashiCode && canInventoryToRashi;
  const canCertificate = canCertificateCode && canCertificateToInventory;

  const buildWhere = (strict: boolean): Prisma.InventoryWhereInput => {
    const and: Prisma.InventoryWhereInput[] = [];
    const direct: Prisma.InventoryWhereInput = {};

    if (query) {
      and.push({
        OR: [
          { sku: { contains: query } },
          { itemName: { contains: query } },
        ],
      });
    }

    if (status && status !== "ALL") direct.status = status;

    if (category && category !== "ALL") {
      if (strict) {
        and.push({
          OR: [
            { category: { equals: category } },
            { categoryCode: { is: { name: { equals: category } } } },
          ],
        });
      } else {
        direct.category = category;
      }
    }

    if (gemType && gemType !== "ALL") {
      if (strict) {
        and.push({
          OR: [
            { gemType: { equals: gemType } },
            { gemstoneCode: { is: { name: { equals: gemType } } } },
          ],
        });
      } else {
        direct.gemType = gemType;
      }
    }

    if (color && color !== "ALL") {
      if (strict) {
        and.push({
          OR: [
            { color: { equals: color } },
            { colorCode: { is: { name: { equals: color } } } },
          ],
        });
      } else {
        direct.color = color;
      }
    }

    if (vendorId && vendorId !== "ALL") direct.vendorId = vendorId;

    // Only apply strict ID filters if we are in strict mode, as these columns/relations might be missing
    if (strict) {
      if (collectionId && collectionId !== "ALL") direct.collectionCodeId = collectionId;

      if (rashiId && rashiId !== "ALL") {
        direct.rashis = { some: { id: rashiId } };
      }
    }

    if (weightRange && weightRange !== "ALL") {
      const [min, max] = weightRange.split("-");
      if (max === "plus") {
        direct.weightValue = { gte: parseFloat(min) };
      } else {
        direct.weightValue = { gte: parseFloat(min), lte: parseFloat(max) };
      }
    }

    const hasDirect = Object.keys(direct).length > 0;
    if (hasDirect) and.push(direct);
    return and.length ? { AND: and } : {};
  };

  let rawInventory: InventoryListItem[] = [];
  let totalItems = 0;
  let categories: { id: string; name: string }[] = [];
  let gemstones: { id: string; name: string }[] = [];
  let colors: { id: string; name: string }[] = [];
  let vendors: { id: string; name: string }[] = [];
  let collections: { id: string; name: string }[] = [];
  let rashis: { id: string; name: string }[] = [];
  let certificates: { id: string; name: string }[] = [];

  try {
    const where = buildWhere(true);
    const select: Prisma.InventorySelect = {
      id: true,
      sku: true,
      itemName: true,
      internalName: true,
      category: true,
      gemType: true,
      color: true,
      shape: true,
      dimensionsMm: true,
      weightValue: true,
      weightUnit: true,
      weightRatti: true,
      pricingMode: true,
      sellingRatePerCarat: true,
      flatSellingPrice: true,
      purchaseRatePerCarat: true,
      flatPurchaseCost: true,
      certificateNo: true,
      certificateNumber: true,
      certification: true,
      lab: true,
      certificateLab: true,
      braceletType: true,
      standardSize: true,
      beadSizeMm: true,
      beadCount: true,
      innerCircumferenceMm: true,
      status: true,
      vendorId: true,
      location: true,
      stockLocation: true,
      createdAt: true,
      updatedAt: true,
    };

    if (canMedia) {
      select.media = {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        take: 1,
        select: { id: true, createdAt: true, type: true, inventoryId: true, mediaUrl: true, isPrimary: true },
      };
    }
    if (canCategoryCode) select.categoryCode = { select: { name: true, code: true } };
    if (canGemstoneCode) select.gemstoneCode = { select: { name: true, code: true } };
    if (canColorCode) select.colorCode = { select: { name: true, code: true } };
    if (canCutCode) select.cutCode = { select: { name: true, code: true } };
    if (canCollectionCode) select.collectionCode = { select: { name: true } };
    if (canRashi) select.rashis = { select: { name: true } };
    if (canCertificate) select.certificates = { select: { name: true, remarks: true } };
    // Use cached queries for master data (rarely changes)
    const masterDataPromises = [
      prisma.inventory.count({ where }),
      prisma.inventory.findMany({
        where,
        orderBy: { createdAt: "desc" },
        select,
        skip: (currentPage - 1) * ITEMS_PER_PAGE,
        take: ITEMS_PER_PAGE,
      }),
      canCategoryCode ? cachedMasters.getCategories(prisma)() : Promise.resolve([]),
      canGemstoneCode ? cachedMasters.getGemstones(prisma)() : Promise.resolve([]),
      canColorCode ? cachedMasters.getColors(prisma)() : Promise.resolve([]),
      canVendor ? cachedMasters.getVendors(prisma)() : Promise.resolve([]),
      canCollectionCode ? cachedMasters.getCollections(prisma)() : Promise.resolve([]),
      canRashi ? cachedMasters.getRashis(prisma)() : Promise.resolve([]),
      canCertificate ? cachedMasters.getCertificates(prisma)() : Promise.resolve([]),
    ];

    const results = await Promise.all(masterDataPromises);
    totalItems = results[0] as number;
    rawInventory = results[1] as unknown as InventoryListItem[];
    categories = results[2] as { id: string; name: string }[];
    gemstones = results[3] as { id: string; name: string }[];
    colors = results[4] as { id: string; name: string }[];
    vendors = results[5] as { id: string; name: string }[];
    collections = results[6] as { id: string; name: string }[];
    rashis = results[7] as { id: string; name: string }[];
    certificates = results[8] as { id: string; name: string }[];
  } catch (error) {
    console.error("Inventory fetch failed (strict mode), falling back to safe mode:", error);
    try {
        const where = buildWhere(false);
        type InventoryRow = Omit<InventoryListItem, "media"> & Partial<Pick<InventoryListItem, "media">>;
        const select: Prisma.InventorySelect = {
          id: true, sku: true, itemName: true, internalName: true, category: true, gemType: true, description: true, pieces: true,
          weightValue: true, weightUnit: true, carats: true, weightRatti: true, costPrice: true, sellingPrice: true, profit: true,
          status: true, location: true, certificateNo: true, certification: true, lab: true, shape: true, color: true, clarity: true,
          cut: true, polish: true, symmetry: true, fluorescence: true, measurements: true, dimensionsMm: true, tablePercent: true,
          depthPercent: true, ratio: true, origin: true, treatment: true, transparency: true, braceletType: true, standardSize: true,
          beadSizeMm: true, beadCount: true, holeSizeMm: true, innerCircumferenceMm: true, pricingMode: true, sellingRatePerCarat: true,
          flatSellingPrice: true, purchaseRatePerCarat: true, flatPurchaseCost: true, notes: true, stockLocation: true, purchaseId: true,
          hideFromAttention: true, vendorId: true, batchId: true, imageUrl: true, videoUrl: true, rapPrice: true, discountPercent: true, createdAt: true, updatedAt: true,
        };
        if (canMedia) {
          select.media = {
            orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
            take: 1,
          };
        }
        const results = await Promise.all([
          prisma.inventory.count({ where }),
          prisma.inventory.findMany({
            where,
            orderBy: { createdAt: "desc" },
            select,
            skip: (currentPage - 1) * ITEMS_PER_PAGE,
            take: ITEMS_PER_PAGE,
          }),
          // Try to fetch master data individually, if they fail, return empty
          canCategoryCode ? prisma.categoryCode.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }).catch(() => []) : Promise.resolve([]),
          canGemstoneCode ? prisma.gemstoneCode.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }).catch(() => []) : Promise.resolve([]),
          canColorCode ? prisma.colorCode.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }).catch(() => []) : Promise.resolve([]),
          canVendor ? prisma.vendor.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }).catch(() => []) : Promise.resolve([]),
        ]);
        totalItems = results[0] as number;
        const baseItems = results[1] as unknown as InventoryRow[];
        rawInventory = baseItems.map((item) => ({
          ...(item as Omit<InventoryListItem, "media">),
          media: canMedia ? (item.media || []) : [],
        }));
        categories = results[2] as { id: string; name: string }[];
        gemstones = results[3] as { id: string; name: string }[];
        colors = results[4] as { id: string; name: string }[];
        vendors = results[5] as { id: string; name: string }[];
        // Leave others empty
    } catch (finalError) {
        console.error("Critical: Inventory fetch failed even in safe mode:", finalError);
        // Fallback to empty to prevent page crash
        rawInventory = [];
        totalItems = 0;
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

  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const buildPageUrl = (p: number) => {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (status) params.set("status", status);
    if (category) params.set("category", category);
    if (gemType) params.set("gemType", gemType);
    if (color) params.set("color", color);
    if (vendorId) params.set("vendorId", vendorId);
    if (collectionId) params.set("collectionId", collectionId);
    if (rashiId) params.set("rashiId", rashiId);
    if (weightRange) params.set("weightRange", weightRange);
    if (p > 1) params.set("page", String(p));
    return `/inventory${params.toString() ? `?${params.toString()}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <InventorySavedToast />
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold tracking-tight">Inventory Management</h1>
        </div>
        <div className="flex items-center gap-2">
            <InventorySummaryExport />
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

      <InventoryStats />

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

      <InventoryInsightBar />

      <div key={filtersKey} className="animate-in fade-in duration-300">
        <InventoryCardList data={inventory} canManageAttentionVisibility={canManageAttentionVisibility} />

        <InventoryTable 
          data={inventory}
          vendors={vendors}
          categories={categories}
          gemstones={gemstones}
          colors={colors}
          rashis={rashis}
          certificates={certificates}
          collections={collections}
          canManageAttentionVisibility={canManageAttentionVisibility}
        />

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border rounded-md bg-gray-50/50 mt-4">
            <div className="text-sm text-gray-500">
              Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, totalItems)} - {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of {totalItems}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild disabled={currentPage <= 1}>
                <Link href={buildPageUrl(currentPage - 1)} className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}>
                  Prev
                </Link>
              </Button>
              <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
              <Button variant="outline" size="sm" asChild disabled={currentPage >= totalPages}>
                <Link href={buildPageUrl(currentPage + 1)} className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}>
                  Next
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
