import { prisma } from "@/lib/prisma";

export type ReconciliationExceptionType =
  | "SOLD_BUT_ACTIVE_LISTING"
  | "MARKETPLACE_SOLD_NOT_ERP"
  | "QUANTITY_MISMATCH"
  | "UNKNOWN_SKU"
  | "MISSING_LISTING_RELATIONSHIP"
  | "DUPLICATE_LISTING"
  | "FULFILLMENT_MISMATCH";

export interface ReconciliationException {
  type: ReconciliationExceptionType;
  severity: "CRITICAL" | "WARNING";
  entityType: string;
  entityId: string;
  sku: string | null;
  marketplace: string | null;
  message: string;
}

const ACTIVE_LISTING_STATUSES = ["ACTIVE", "LISTED"];

/**
 * Read-only inventory reconciliation engine. Compares ERP inventory against
 * marketplace listings, orders and fulfillment records and returns exceptions
 * for human review. It NEVER performs automatic corrections.
 */
export async function reconcileInventory(): Promise<ReconciliationException[]> {
  const exceptions: ReconciliationException[] = [];

  const soldInventory = await prisma.inventory.findMany({
    where: { status: "SOLD" },
    select: { id: true, sku: true },
  });
  const soldIds = new Set(soldInventory.map((i) => i.id));

  const activeListings = await prisma.listing.findMany({
    where: { status: { in: ACTIVE_LISTING_STATUSES } },
    select: {
      id: true,
      inventoryId: true,
      platform: true,
      externalId: true,
      listingSku: true,
      marketplaceQuantity: true,
      inventory: { select: { id: true, sku: true, status: true, pieces: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Duplicate listing detection (same platform + externalId)
  const seenListings = new Map<string, number>();
  for (const listing of activeListings) {
    if (!listing.externalId) continue;
    const key = `${listing.platform}|${listing.externalId}`;
    const count = (seenListings.get(key) || 0) + 1;
    seenListings.set(key, count);
    if (count > 1) {
      exceptions.push({
        type: "DUPLICATE_LISTING",
        severity: "WARNING",
        entityType: "Listing",
        entityId: listing.id,
        sku: listing.inventory?.sku ?? listing.listingSku,
        marketplace: listing.platform,
        message: `Duplicate listing for ${listing.platform} externalId ${listing.externalId}`,
      });
    }
  }

  // Sold-but-active-listing + quantity mismatch + unknown SKU
  for (const listing of activeListings) {
    const inv = listing.inventory;

    if (listing.inventoryId && soldIds.has(listing.inventoryId)) {
      exceptions.push({
        type: "SOLD_BUT_ACTIVE_LISTING",
        severity: "CRITICAL",
        entityType: "Inventory",
        entityId: listing.inventoryId,
        sku: inv?.sku ?? null,
        marketplace: listing.platform,
        message: `SKU ${inv?.sku ?? "?"} is SOLD in ERP but still has an active ${listing.platform} listing`,
      });
    }

    if (
      inv &&
      listing.marketplaceQuantity != null &&
      inv.pieces > 0 &&
      inv.status === "IN_STOCK" &&
      Number(listing.marketplaceQuantity) !== Number(inv.pieces)
    ) {
      exceptions.push({
        type: "QUANTITY_MISMATCH",
        severity: "WARNING",
        entityType: "Inventory",
        entityId: listing.inventoryId ?? "",
        sku: inv.sku,
        marketplace: listing.platform,
        message: `Quantity mismatch: ERP ${inv.pieces} vs ${listing.platform} ${listing.marketplaceQuantity}`,
      });
    }

    if (listing.listingSku && !inv) {
      exceptions.push({
        type: "UNKNOWN_SKU",
        severity: "WARNING",
        entityType: "Listing",
        entityId: listing.id,
        sku: listing.listingSku,
        marketplace: listing.platform,
        message: `Listing SKU ${listing.listingSku} has no ERP inventory match`,
      });
    }
  }

  // Marketplace-sold-but-not-ERP: order items whose SKU is still IN_STOCK with no matching Sale
  const orderItems = await prisma.marketplaceOrderItem.findMany({
    where: { listedSku: { not: null } },
    select: {
      id: true,
      listedSku: true,
      fulfillmentSku: true,
      fulfillmentReason: true,
      order: { select: { marketplace: true, marketplaceOrderId: true } },
    },
  });

  const erpSkus = await prisma.inventory.findMany({
    where: { sku: { in: orderItems.map((o) => o.listedSku!).filter(Boolean) } },
    select: { id: true, sku: true, status: true },
  });
  const skuStatus = new Map(erpSkus.map((i) => [i.sku, i.status]));

  for (const item of orderItems) {
    const status = item.listedSku ? skuStatus.get(item.listedSku) : undefined;
    if (status === "IN_STOCK") {
      exceptions.push({
        type: "MARKETPLACE_SOLD_NOT_ERP",
        severity: "CRITICAL",
        entityType: "MarketplaceOrderItem",
        entityId: item.id,
        sku: item.listedSku,
        marketplace: item.order?.marketplace ?? null,
        message: `Marketplace sold SKU ${item.listedSku} but ERP still marks it IN_STOCK`,
      });
    }
    if (item.fulfillmentSku && item.fulfillmentSku !== item.listedSku && !item.fulfillmentReason) {
      exceptions.push({
        type: "FULFILLMENT_MISMATCH",
        severity: "WARNING",
        entityType: "MarketplaceOrderItem",
        entityId: item.id,
        sku: item.listedSku,
        marketplace: item.order?.marketplace ?? null,
        message: `Fulfillment SKU ${item.fulfillmentSku} differs from listed SKU ${item.listedSku} without a reason`,
      });
    }
  }

  return exceptions;
}
