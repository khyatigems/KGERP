import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ListingsView } from "@/components/listings/listings-view";
import { ensureInventoryBraceletSchema } from "@/lib/inventory-schema-ensure";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { AnimatedPage } from "@/components/ui/animated-page";
import { getCurrencyRates } from "@/lib/pricing/db";
import { toInr } from "@/lib/pricing/currency";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Listings Management | KhyatiGems™",
};

export default async function ListingsPage() {
  const perm = await checkPermission(PERMISSIONS.LISTINGS_VIEW);
  if (!perm.success) {
    return (
      <div className="p-6">
        <div className="bg-destructive/15 text-destructive border-destructive/20 border px-4 py-3 rounded-md relative">
          <strong className="font-bold">Access Denied!</strong>
          <span className="block sm:inline"> {perm.message}</span>
        </div>
      </div>
    );
  }

  await ensureInventoryBraceletSchema();
  const listings = await prisma.listing.findMany({
    orderBy: { listedDate: "desc" },
    include: {
      inventory: {
        select: {
          sku: true,
          itemName: true,
          costPrice: true,
          flatPurchaseCost: true,
          purchaseRatePerCarat: true,
          weightValue: true,
        },
      },
      priceHistory: {
        orderBy: { changedAt: "asc" },
        take: 1,
      },
    },
  });

  // Resolve currency rates for live profit computation
  const rates = await getCurrencyRates().catch(() => ({}));

  // Load marketplace orders (synced receipts) for the Orders tab
  const orders = await prisma.marketplaceOrder.findMany({
    orderBy: { orderDate: "desc" },
    take: 200,
    include: { items: true },
  });

  // Fetch latest engagement metrics for listings that have inventoryId (from listingOpportunity table)
  const inventoryIds = Array.from(new Set(listings.map((l) => l.inventoryId).filter(Boolean) as string[]));
  const latestMetrics = inventoryIds.length
    ? await prisma.listingOpportunity.findMany({
        where: { inventoryId: { in: inventoryIds } }
      })
    : [];
  const metricsByKey = new Map(
    latestMetrics.map((m) => [`${m.inventoryId}|${m.marketplace}`, m])
  );

  // Attach metrics + live profit margin to each listing
  const enrichedListings = listings.map((l) => {
    let profitMargin: number | null = null;
    let profitAmount: number | null = null;
    if (l.inventory) {
      const cost = Number(
        l.inventory.flatPurchaseCost ||
        (l.inventory.purchaseRatePerCarat ? l.inventory.purchaseRatePerCarat * (l.inventory.weightValue || 0) : 0) ||
        l.inventory.costPrice ||
        0
      );
      let listedInr = toInr(l.listedPrice, l.currency || "USD", rates);
      if (!Number.isFinite(listedInr)) listedInr = l.listedPrice;
      if (cost > 0 && Number.isFinite(listedInr)) {
        profitAmount = listedInr - cost;
        profitMargin = (profitAmount / cost) * 100;
      }
    }

    // For metrics: use listingOpportunity if inventoryId exists, otherwise use Listing model's marketplace fields
    let latestMetric = metricsByKey.get(`${l.inventoryId}|${l.platform}`) || null;
    if (!latestMetric && (l.marketplaceViews != null || l.marketplaceFavorites != null || l.marketplaceOrders != null)) {
      latestMetric = {
        id: l.id,
        inventoryId: l.inventoryId || "",
        marketplace: l.platform,
        externalId: l.externalId,
        currentViews: l.marketplaceViews || 0,
        currentWatches: 0, // eBay watches not stored separately on Listing
        currentFavourites: l.marketplaceFavorites || 0,
        currentOrders: l.marketplaceOrders || 0,
        currentRevenue: 0,
        currency: l.currency || "USD",
        lastSyncedAt: l.lastSyncedAt,
        updatedAt: l.updatedAt,
      };
    }

    return {
      ...l,
      latestMetric,
      profitMargin,
      profitAmount,
    };
  });

  return (
    <AnimatedPage>
    <div className="space-y-6">
      <ListingsView listings={enrichedListings} orders={orders} />
    </div>
    </AnimatedPage>
  );
}
