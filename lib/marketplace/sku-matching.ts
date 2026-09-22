import { prisma } from "@/lib/prisma";
import type { MarketplacePlatform, NormalizedListing } from "@/lib/marketplace/types";

export type SkuMatchStatus =
  | "MATCHED"
  | "MISMATCH"
  | "UNKNOWN_SKU"
  | "NO_SKU";

export interface SkuMatchResult {
  status: SkuMatchStatus;
  inventoryId: string | null;
  inventorySku: string | null;
  listingId: string | null;
  reason: string;
}

/**
 * Resolve a marketplace listing to an ERP Inventory record using the safe
 * matching hierarchy from the architecture spec:
 *   1. known marketplace listing relationship (platform + listingId)
 *   2. exact SKU match
 *   3. (never auto-guess) -> UNKNOWN_SKU / MISMATCH for manual resolution
 */
export async function matchListingToInventory(params: {
  marketplace: MarketplacePlatform;
  listingId: string;
  listingSku: string | null;
}): Promise<SkuMatchResult> {
  const { marketplace, listingId, listingSku } = params;

  // 1. Known listing relationship
  if (listingId) {
    const existing = await prisma.listing.findFirst({
      where: { platform: marketplace, externalId: listingId },
      select: { id: true, inventoryId: true, inventory: { select: { sku: true } } },
    });
    if (existing) {
      return {
        status: "MATCHED",
        inventoryId: existing.inventoryId,
        inventorySku: existing.inventory?.sku ?? null,
        listingId: existing.id,
        reason: "Known marketplace listing relationship",
      };
    }
  }

  // 2. Exact SKU match
  if (listingSku) {
    const inventory = await prisma.inventory.findUnique({
      where: { sku: listingSku },
      select: { id: true, sku: true },
    });
    if (inventory) {
      return {
        status: "MATCHED",
        inventoryId: inventory.id,
        inventorySku: inventory.sku,
        listingId: null,
        reason: "Exact SKU match",
      };
    }
    return {
      status: "UNKNOWN_SKU",
      inventoryId: null,
      inventorySku: null,
      listingId: null,
      reason: `No ERP inventory exists for SKU ${listingSku}`,
    };
  }

  return {
    status: "NO_SKU",
    inventoryId: null,
    inventorySku: null,
    listingId: null,
    reason: "Marketplace listing has no usable SKU",
  };
}

export interface ListingMatchResult {
  listing: NormalizedListing;
  match: SkuMatchResult;
}

export async function matchListings(
  listings: NormalizedListing[]
): Promise<ListingMatchResult[]> {
  const results: ListingMatchResult[] = [];
  for (const listing of listings) {
    const match = await matchListingToInventory({
      marketplace: listing.marketplace,
      listingId: listing.listingId,
      listingSku: listing.listingSku,
    });
    results.push({ listing, match });
  }
  return results;
}

export async function resolveInventoryBySku(sku: string | null | undefined) {
  if (!sku) return null;
  return prisma.inventory.findUnique({ where: { sku } });
}
