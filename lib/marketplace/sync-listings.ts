import { prisma } from "@/lib/prisma";
import { getConnector } from "@/lib/marketplace/connectors";
import { matchListingToInventory } from "@/lib/marketplace/sku-matching";
import { startSyncLog, finalizeSyncLog, failSyncLog } from "@/lib/marketplace/sync-log";
import type { MarketplacePlatform } from "@/lib/marketplace/types";
import { isLiveMarketplaceListing } from "@/lib/marketplace/listing-status";
import { markMarketplaceListingsSold } from "@/lib/marketplace/close-listings";
import { listingSyncMetadata } from "@/lib/marketplace/listing-details";
import { priceObservations } from "@/lib/marketplace/price-history";
import { ensureMarketplaceFoundationSchema } from "@/lib/marketplace-foundation";
import { retryMarketplaceWrite, isMarketplaceDatabaseBusy } from "@/lib/marketplace/database-retry";

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
 * Unmatched SKUs are retained and flagged, but never linked into ERP coverage.
 */
export async function syncListingsForPlatform(
  shopId: string,
  params: { limit?: number; offset?: number } = {}
): Promise<ListingSyncResult> {
  await ensureMarketplaceFoundationSchema();
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
        const externalId = listing.listingId;
        const existing = await prisma.listing.findFirst({
          where: { platform: listing.marketplace, marketplaceShopId: shop.id, externalId },
          include: { priceHistory: { take: 1, orderBy: { changedAt: "desc" } } },
        });

        // The marketplace feed is authoritative for listing availability.
        // A local sale can mark a listing SOLD without ending it remotely;
        // refresh that listing without changing inventory or sale records.

        if (!isLiveMarketplaceListing({ status: listing.status, quantity: listing.quantity })) {
          if (existing) {
            await markMarketplaceListingsSold({
              marketplace: listing.marketplace,
              marketplaceShopId: shop.id,
              externalIds: [externalId],
            });
            counters.updated += 1;
          } else {
            counters.skipped += 1;
          }
          continue;
        }

        const match = await matchListingToInventory({
          marketplace: listing.marketplace,
          marketplaceShopId: shop.id,
          listingId: listing.listingId,
          listingSku: listing.listingSku,
        });

        const inventoryId = match.status === "MATCHED" ? match.inventoryId : null;
        const isOrphan = match.status !== "MATCHED";

        const now = new Date();
        const currency = listing.currency || existing?.currency || "USD";
        const observations = priceObservations({
          previous: existing ? { price: existing.marketplacePrice ?? (existing.listedPrice > 0 ? existing.listedPrice : null), currency: existing.currency, observedAt: existing.lastSyncedAt || existing.updatedAt } : undefined,
          latest: existing?.priceHistory[0],
          price: listing.price, currency, source: `${platform}_SYNC`, now,
        });
        const data = {
          inventoryId,
          platform: listing.marketplace,
          marketplaceShopId: shop.id,
          externalId,
          listedPrice: listing.price ?? existing?.listedPrice ?? 0,
          currency,
          status: (listing.status || "ACTIVE").toUpperCase(),
          listingUrl: listing.listingUrl ?? existing?.listingUrl ?? null,
          listingSku: listing.listingSku ?? existing?.listingSku ?? null,
          marketplaceTitle: listing.title ?? existing?.marketplaceTitle ?? null,
          marketplacePrice: listing.price ?? existing?.marketplacePrice ?? null,
          marketplaceQuantity: listing.quantity ?? existing?.marketplaceQuantity ?? null,
          marketplaceViews: listing.views ?? existing?.marketplaceViews ?? null,
          marketplaceFavorites: listing.favorites ?? existing?.marketplaceFavorites ?? null,
          marketplaceOrders: listing.orders ?? existing?.marketplaceOrders ?? null,
          marketplaceShopName: listing.shopName ?? null,
          syncStatus: isOrphan ? match.status : "SYNCED",
          syncError: isOrphan ? match.reason : null,
          lastSyncedAt: now,
          rawMetadata: listingSyncMetadata(listing, existing?.rawMetadata ?? null),
          priceHistory: observations.length ? { create: observations } : undefined,
        };

        if (existing) {
          await retryMarketplaceWrite(() => prisma.listing.update({ where: { id: existing.id }, data }));
          counters.updated += 1;
        } else {
          await retryMarketplaceWrite(() => prisma.listing.create({ data: { ...data, listedDate: now } }));
          counters.created += 1;
        }
        if (isOrphan && listing.listingSku) unknownSkus.push(listing.listingSku);
      } catch (error) {
        // Keep the page cursor unchanged so the worker retries every row on
        // this page instead of permanently skipping a transient write failure.
        if (isMarketplaceDatabaseBusy(error)) throw error;
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
