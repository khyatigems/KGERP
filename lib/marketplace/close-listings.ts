import { prisma } from "@/lib/prisma";
import { ACTIVE_MARKETPLACE_LISTING_STATUSES } from "@/lib/marketplace/listing-status";

type ListingDb = {
  listing: {
    updateMany: (args: any) => Promise<{ count: number }>;
  };
  inventory: {
    findMany: (args: any) => Promise<Array<{ sku: string }>>;
  };
};

const SOLD_UPDATE = {
  status: "SOLD",
  marketplaceQuantity: 0,
};

/**
 * Close ERP marketplace listings that are no longer live. Used when an item is
 * billed in ERP, when a marketplace order is imported, and when a full active
 * listing sync no longer returns the listing.
 */
export async function markMarketplaceListingsSold(
  params: {
    inventoryIds?: string[];
    marketplace?: string;
    marketplaceShopId?: string;
    externalIds?: string[];
  },
  db: ListingDb = prisma
): Promise<number> {
  const inventoryIds = [...new Set((params.inventoryIds || []).filter(Boolean))];
  const externalIds = [...new Set((params.externalIds || []).filter(Boolean))];
  let closed = 0;

  if (inventoryIds.length) {
    const byInventory = await db.listing.updateMany({
      where: {
        inventoryId: { in: inventoryIds },
        status: { in: [...ACTIVE_MARKETPLACE_LISTING_STATUSES] },
        ...(params.marketplace ? { platform: params.marketplace } : {}),
        ...(params.marketplaceShopId ? { marketplaceShopId: params.marketplaceShopId } : {}),
      },
      data: SOLD_UPDATE,
    });
    closed += byInventory.count;

    const inventories = await db.inventory.findMany({
      where: { id: { in: inventoryIds } },
      select: { sku: true },
    });
    const skus = [...new Set(inventories.map((row) => row.sku).filter(Boolean))];
    if (skus.length) {
      const bySku = await db.listing.updateMany({
        where: {
          listingSku: { in: skus },
          inventoryId: null,
          status: { in: [...ACTIVE_MARKETPLACE_LISTING_STATUSES] },
          ...(params.marketplace ? { platform: params.marketplace } : {}),
          ...(params.marketplaceShopId ? { marketplaceShopId: params.marketplaceShopId } : {}),
        },
        data: SOLD_UPDATE,
      });
      closed += bySku.count;
    }
  }

  if (externalIds.length) {
    const byExternalId = await db.listing.updateMany({
      where: {
        externalId: { in: externalIds },
        status: { in: [...ACTIVE_MARKETPLACE_LISTING_STATUSES] },
        ...(params.marketplace ? { platform: params.marketplace } : {}),
        ...(params.marketplaceShopId ? { marketplaceShopId: params.marketplaceShopId } : {}),
      },
      data: SOLD_UPDATE,
    });
    closed += byExternalId.count;
  }

  return closed;
}

/**
 * After a complete active-listing crawl, anything still ACTIVE for the shop
 * that was not seen in this job is no longer live on the marketplace.
 */
export async function closeListingsMissingFromActiveSync(
  shopId: string,
  syncedBefore: Date
): Promise<number> {
  const result = await prisma.listing.updateMany({
    where: {
      marketplaceShopId: shopId,
      status: { in: [...ACTIVE_MARKETPLACE_LISTING_STATUSES] },
      OR: [
        { lastSyncedAt: null, createdAt: { lt: syncedBefore } },
        { lastSyncedAt: { lt: syncedBefore } },
      ],
    },
    data: SOLD_UPDATE,
  });
  return result.count;
}
