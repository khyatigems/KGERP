import { prisma } from "@/lib/prisma";
import { getConnector } from "@/lib/marketplace/connectors";
import { matchListingToInventory } from "@/lib/marketplace/sku-matching";
import { startSyncLog, finalizeSyncLog, failSyncLog } from "@/lib/marketplace/sync-log";
import type { MarketplacePlatform } from "@/lib/marketplace/types";

function safeJson(value: unknown): string | null {
  try {
    return value == null ? null : JSON.stringify(value);
  } catch {
    return null;
  }
}

export interface ListingSyncResult {
  scanned: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  unknownSkus: string[];
  errors: string[];
}

/**
 * Idempotent marketplace listing sync. Fetches normalized listings from a
 * connector and upserts ERP `Listing` rows keyed by (platform, externalId).
 * Unmatched SKUs are NOT written (reported for manual resolution).
 */
export async function syncListingsForPlatform(
  shopId: string,
  params: { limit?: number; offset?: number } = {}
): Promise<ListingSyncResult> {
  const shop = await prisma.marketplaceShop.findUnique({
    where: { id: shopId },
    include: { connection: true },
  });
  if (!shop || shop.status !== "CONNECTED" || shop.connection.status !== "CONNECTED") {
    throw new Error("Marketplace shop is not connected.");
  }
  const platform = shop.marketplace as MarketplacePlatform;
  const connector = getConnector(platform);
  if (!connector) throw new Error(`No connector registered for ${platform}`);

  const logId = await startSyncLog(platform, "LISTINGS", "SYSTEM", shop.id);
  const counters = { scanned: 0, created: 0, updated: 0, skipped: 0, failed: 0 };
  const unknownSkus: string[] = [];
  const errors: string[] = [];

  try {
    const listings = await connector.fetchListings(params, {
      connectionId: shop.connectionId,
      shopId: shop.id,
      externalShopId: shop.externalShopId,
      shopName: shop.name,
    });
    counters.scanned = listings.length;

    for (const listing of listings) {
      if (!listing.listingId) {
        counters.skipped += 1;
        continue;
      }
      try {
        const match = await matchListingToInventory({
          marketplace: listing.marketplace,
          marketplaceShopId: shop.id,
          listingId: listing.listingId,
          listingSku: listing.listingSku,
        });

        const externalId = listing.listingId;
        const existing = await prisma.listing.findFirst({
          where: { platform: listing.marketplace, marketplaceShopId: shop.id, externalId },
        });

        const inventoryId = match.inventoryId;
        const isOrphan = !inventoryId;

        const data = {
          inventoryId,
          platform: listing.marketplace,
          marketplaceShopId: shop.id,
          externalId,
          listedPrice: listing.price ?? 0,
          currency: listing.currency || "USD",
          status: (listing.status || "ACTIVE").toUpperCase(),
          listingUrl: listing.listingUrl,
          listingSku: listing.listingSku,
          marketplaceTitle: listing.title,
          marketplacePrice: listing.price,
          marketplaceQuantity: listing.quantity,
          marketplaceViews: listing.views ?? null,
          marketplaceFavorites: listing.favorites ?? null,
          marketplaceOrders: listing.orders ?? null,
          marketplaceShopName: listing.shopName ?? null,
          syncStatus: isOrphan ? "UNKNOWN_SKU" : "SYNCED",
          syncError: null,
          lastSyncedAt: new Date(),
          rawMetadata: safeJson(listing.raw),
        };

        if (existing) {
          await prisma.listing.update({ where: { id: existing.id }, data });
          counters.updated += 1;
        } else {
          await prisma.listing.create({ data: { ...data, listedDate: new Date() } });
          counters.created += 1;
        }
        if (isOrphan && listing.listingSku) unknownSkus.push(listing.listingSku);
      } catch (error) {
        counters.failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${listing.listingId}: ${message}`);
        console.error(`[sync-listings] failed for ${platform} ${listing.listingId}:`, error);
      }
    }

    await finalizeSyncLog(logId, {
      status: counters.failed > 0 ? "PARTIAL" : "SUCCESS",
      counters,
      errorDetails: errors.length ? errors.slice(0, 20).join("\n").slice(0, 4000) : null,
    });
    return { ...counters, unknownSkus, errors };
  } catch (error) {
    await failSyncLog(logId, error);
    throw error;
  }
}
