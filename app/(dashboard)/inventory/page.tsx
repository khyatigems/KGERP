import { Metadata } from "next";
import { Plus, Upload } from "lucide-react";
import Link from "next/link";
import { prisma, hasTable } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cachedMasters } from "@/lib/cache";
import { Button } from "@/components/ui/button";
import { ExportButton } from "@/components/ui/export-button";
import { InventorySummaryExport } from "@/components/reports/inventory-summary-export";
import { LoadingLink } from "@/components/ui/loading-link";
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

type SearchParams = {
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
};

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
  title: "Inventory | KhyatiGems",
};

const ITEMS_PER_PAGE = 50;

function buildInventoryWhere(
  params: SearchParams,
  options: { strictRelations: boolean }
): Prisma.InventoryWhereInput {
  const and: Prisma.InventoryWhereInput[] = [];
  const direct: Prisma.InventoryWhereInput = {};
  const query = params.query?.trim();

  if (query) {
    and.push({
      OR: [
        { sku: { contains: query } },
        { itemName: { contains: query } },
        { category: { contains: query } },
        { gemType: { contains: query } },
      ],
    });
  }

  if (params.status && params.status !== "ALL") direct.status = params.status;
  if (params.vendorId && params.vendorId !== "ALL") direct.vendorId = params.vendorId;

  if (params.category && params.category !== "ALL") {
    if (options.strictRelations) {
      and.push({
        OR: [
          { category: params.category },
          { categoryCode: { is: { name: params.category } } },
        ],
      });
    } else {
      direct.category = params.category;
    }
  }

  if (params.gemType && params.gemType !== "ALL") {
    if (options.strictRelations) {
      and.push({
        OR: [
          { gemType: params.gemType },
          { gemstoneCode: { is: { name: params.gemType } } },
        ],
      });
    } else {
      direct.gemType = params.gemType;
    }
  }

  if (params.color && params.color !== "ALL") {
    if (options.strictRelations) {
      and.push({
        OR: [
          { color: params.color },
          { colorCodeId: params.color },
          { colorCode: { is: { name: params.color } } },
        ],
      });
    } else {
      direct.OR = [{ color: params.color }, { colorCodeId: params.color }];
    }
  }

  if (options.strictRelations) {
    if (params.collectionId && params.collectionId !== "ALL") {
      direct.collectionCodeId = params.collectionId;
    }
    if (params.rashiId && params.rashiId !== "ALL") {
      direct.rashis = { some: { id: params.rashiId } };
    }
  }

  if (params.weightRange && params.weightRange !== "ALL") {
    const [minRaw, maxRaw] = params.weightRange.split("-");
    const min = Number(minRaw);
    const max = Number(maxRaw);
    if (Number.isFinite(min) && maxRaw === "plus") {
      direct.weightValue = { gte: min };
    } else if (Number.isFinite(min) && Number.isFinite(max)) {
      direct.weightValue = { gte: min, lte: max };
    }
  }

  if (Object.keys(direct).length > 0) and.push(direct);
  return and.length ? { AND: and } : {};
}

async function getInventoryData(params: SearchParams) {
  const session = await auth();
  const userId = session?.user?.id;
  const [canView, canCreate, canManageAttentionVisibility] = userId
    ? await Promise.all([
        checkUserPermission(userId, PERMISSIONS.INVENTORY_VIEW),
        checkUserPermission(userId, PERMISSIONS.INVENTORY_CREATE),
        checkUserPermission(userId, PERMISSIONS.INVENTORY_EDIT),
      ])
    : [false, false, false];

  if (!canView) {
    return {
      canView,
      canCreate,
      canManageAttentionVisibility,
      inventory: [] as InventoryListItem[],
      totalItems: 0,
      categories: [],
      gemstones: [],
      colors: [],
      vendors: [],
      collections: [],
      rashis: [],
      certificates: [],
      exportData: [],
      totalPages: 1,
      currentPage: 1,
      filtersKey: "",
    };
  }

  const currentPage = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const filtersKey = JSON.stringify({ ...params, page: currentPage });

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
    treatment: true,
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

  let where = buildInventoryWhere(params, { strictRelations: true });
  let rows: InventoryListItem[] = [];
  let totalItems = 0;

  try {
    const [count, items] = await Promise.all([
      prisma.inventory.count({ where }),
      prisma.inventory.findMany({
        where,
        orderBy: { createdAt: "desc" },
        select,
        skip: (currentPage - 1) * ITEMS_PER_PAGE,
        take: ITEMS_PER_PAGE,
      }),
    ]);
    totalItems = count;
    rows = items as unknown as InventoryListItem[];
  } catch (error) {
    console.error("Inventory fetch failed in strict mode, retrying with direct fields:", error);
    where = buildInventoryWhere(params, { strictRelations: false });
    const safeSelect = { ...select };
    delete safeSelect.categoryCode;
    delete safeSelect.gemstoneCode;
    delete safeSelect.colorCode;
    delete safeSelect.cutCode;
    delete safeSelect.collectionCode;
    delete safeSelect.rashis;
    delete safeSelect.certificates;

    const [count, items] = await Promise.all([
      prisma.inventory.count({ where }),
      prisma.inventory.findMany({
        where,
        orderBy: { createdAt: "desc" },
        select: safeSelect,
        skip: (currentPage - 1) * ITEMS_PER_PAGE,
        take: ITEMS_PER_PAGE,
      }),
    ]);
    totalItems = count;
    rows = (items as unknown as InventoryListItem[]).map((item) => ({
      ...item,
      media: item.media || [],
    }));
  }

  const [
    categories,
    gemstones,
    colors,
    vendors,
    collections,
    rashis,
    certificates,
  ] = await Promise.all([
    canCategoryCode ? cachedMasters.getCategories(prisma)() : Promise.resolve([]),
    canGemstoneCode ? cachedMasters.getGemstones(prisma)() : Promise.resolve([]),
    canColorCode ? cachedMasters.getColors(prisma)() : Promise.resolve([]),
    canVendor ? cachedMasters.getVendors(prisma)() : Promise.resolve([]),
    canCollectionCode ? cachedMasters.getCollections(prisma)() : Promise.resolve([]),
    canRashi ? cachedMasters.getRashis(prisma)() : Promise.resolve([]),
    canCertificate ? cachedMasters.getCertificates(prisma)() : Promise.resolve([]),
  ]);

  const inventory = removeDuplicates(rows, "id");
  const vendorMap = new Map<string, string>(vendors.map((v: { id: string; name: string }) => [v.id, v.name]));
  const exportData = inventory.map((item) => {
    const typedItem = item as InventoryWithExtras;
    return {
      sku: item.sku,
      itemName: item.itemName,
      category: item.category,
      gemType: item.gemType,
      color: item.colorCode?.name || item.color || "-",
      weight: `${item.weightValue} ${item.weightUnit}`,
      ratti: typedItem.weightRatti || 0,
      cut: item.cutCode?.name || "-",
      shape: item.shape || "-",
      dimensions: item.dimensionsMm || "-",
      rashi: item.rashis?.map((r) => r.name).join(", ") || "-",
      collection: item.collectionCode?.name || "-",
      sellingRate: item.sellingRatePerCarat || item.flatSellingPrice || 0,
      certification: item.certificates?.map((c) => (c.remarks ? `${c.name} (${c.remarks})` : c.name)).join(", ") || item.certification || "-",
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

  return {
    canView,
    canCreate,
    canManageAttentionVisibility,
    inventory,
    totalItems,
    categories,
    gemstones,
    colors,
    vendors,
    collections,
    rashis,
    certificates,
    exportData,
    totalPages: Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE)),
    currentPage,
    filtersKey,
  };
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const data = await getInventoryData(params);

  if (!data.canView) {
    return (
      <div className="p-6">
        <div className="bg-destructive/15 text-destructive border-destructive/20 border px-4 py-3 rounded-md relative">
          <strong className="font-bold">Access Denied!</strong>
          <span className="block sm:inline"> You do not have permission to view inventory.</span>
        </div>
      </div>
    );
  }

  const buildPageUrl = (p: number) => {
    const nextParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value && key !== "page") nextParams.set(key, value);
    }
    if (p > 1) nextParams.set("page", String(p));
    return `/inventory${nextParams.toString() ? `?${nextParams.toString()}` : ""}`;
  };

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
      <InventorySavedToast />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">Manage your inventory items</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {data.canCreate && (
            <>
              <Button asChild variant="outline">
                <LoadingLink href="/inventory/import">
                  <Upload className="mr-2 h-4 w-4" /> Import
                </LoadingLink>
              </Button>
              <Button asChild>
                <LoadingLink href="/inventory/new">
                  <Plus className="mr-2 h-4 w-4" /> Add Item
                </LoadingLink>
              </Button>
            </>
          )}
          <InventorySummaryExport />
          <ExportButton filename="inventory_report" data={data.exportData} columns={columns} title="Inventory Report" />
        </div>
      </div>

      <InventoryStats />

      <div className="bg-card p-4 rounded-md border">
        <InventorySearch
          vendors={data.vendors}
          categories={data.categories}
          gemstones={data.gemstones}
          colors={data.colors}
          collections={data.collections}
          rashis={data.rashis}
        />
      </div>

      <InventoryInsightBar />

      <div key={data.filtersKey} className="animate-in fade-in duration-200">
        <InventoryCardList data={data.inventory} canManageAttentionVisibility={data.canManageAttentionVisibility} />

        <InventoryTable
          data={data.inventory}
          vendors={data.vendors}
          categories={data.categories}
          gemstones={data.gemstones}
          colors={data.colors}
          rashis={data.rashis}
          certificates={data.certificates}
          collections={data.collections}
          canManageAttentionVisibility={data.canManageAttentionVisibility}
        />

        {data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border rounded-md bg-gray-50/50 mt-4">
            <div className="text-sm text-gray-500">
              Showing {Math.min((data.currentPage - 1) * ITEMS_PER_PAGE + 1, data.totalItems)} - {Math.min(data.currentPage * ITEMS_PER_PAGE, data.totalItems)} of {data.totalItems}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild disabled={data.currentPage <= 1}>
                <Link href={buildPageUrl(data.currentPage - 1)} className={data.currentPage <= 1 ? "pointer-events-none opacity-50" : ""}>
                  Prev
                </Link>
              </Button>
              <span className="text-sm text-gray-600">Page {data.currentPage} of {data.totalPages}</span>
              <Button variant="outline" size="sm" asChild disabled={data.currentPage >= data.totalPages}>
                <Link href={buildPageUrl(data.currentPage + 1)} className={data.currentPage >= data.totalPages ? "pointer-events-none opacity-50" : ""}>
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
