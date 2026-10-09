import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { ListingPreparationClient } from "@/components/marketplace/listing-preparation-client";
import { EbayConnector } from "@/lib/marketplace/connectors/ebay";
import { hasOAuthScope } from "@/lib/marketplace/scopes";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create Marketplace Listings | KhyatiGems™ ERP",
};

function getRegionalPrices(rawMetadata: string | null) {
  if (!rawMetadata) return null;
  try {
    const metadata = JSON.parse(rawMetadata) as {
      regionalPrices?: {
        india?: { amount?: number };
        us?: { amount?: number };
        global?: { amount?: number };
      };
    };
    const prices = metadata.regionalPrices;
    if (
      typeof prices?.india?.amount === "number" &&
      typeof prices.us?.amount === "number" &&
      typeof prices.global?.amount === "number"
    ) {
      return {
        india: prices.india.amount,
        us: prices.us.amount,
        global: prices.global.amount,
      };
    }
  } catch {
    return null;
  }
  return null;
}

function getMarketplaceDraftId(rawMetadata: string | null) {
  if (!rawMetadata) return null;
  try {
    const metadata = JSON.parse(rawMetadata) as { marketplaceDraft?: { id?: string } };
    return metadata.marketplaceDraft?.id || null;
  } catch {
    return null;
  }
}

export default async function MarketplaceCreateListingsPage() {
  const permission = await checkPermission(PERMISSIONS.LISTINGS_VIEW);
  if (!permission.success) redirect("/");

  const [shops, drafts] = await Promise.all([
    prisma.marketplaceShop.findMany({
      where: {
        marketplace: { in: ["EBAY", "ETSY"] },
        status: "CONNECTED",
        connection: { status: "CONNECTED" },
      },
      select: {
        id: true,
        name: true,
        marketplace: true,
        connectionId: true,
        connection: { select: { scopes: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.listing.findMany({
      where: {
        platform: { in: ["EBAY", "ETSY"] },
        marketplaceShopId: { not: null },
        status: "DRAFT",
        syncStatus: "DRAFT",
      },
      include: {
        inventory: { select: { sku: true, itemName: true } },
        marketplaceShop: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
  ]);
  const ebayShops = await Promise.all(shops.filter((shop) => shop.marketplace === "EBAY").map(async (shop) => {
    try {
      return {
        id: shop.id,
        name: shop.name,
        writeReady: await new EbayConnector().ensureInventoryWriteScope(shop.connectionId, shop.connection.scopes),
      };
    } catch {
      return { id: shop.id, name: shop.name, writeReady: false, writeAccessError: "Unable to verify eBay listing access. Reload to retry, or reconnect if the connection has expired." };
    }
  }));
  return <ListingPreparationClient
    ebayShops={ebayShops}
    etsyShops={shops.filter((shop) => shop.marketplace === "ETSY").map((shop) => ({
      id: shop.id,
      name: shop.name,
      writeReady: hasOAuthScope(shop.connection.scopes, "listings_w"),
    }))}
    drafts={drafts.map((draft) => ({
    id: draft.id,
    externalId: draft.externalId || getMarketplaceDraftId(draft.rawMetadata),
    sku: draft.inventory?.sku || draft.listingSku || "—",
    itemName: draft.inventory?.itemName || draft.marketplaceTitle || "Unknown item",
    title: draft.marketplaceTitle || draft.inventory?.itemName || draft.listingSku || "Untitled marketplace draft",
    shop: draft.marketplaceShop?.name || draft.marketplaceShopName || `${draft.platform} shop`,
    platform: draft.platform,
    syncError: draft.syncError,
    price: draft.listedPrice,
    currency: draft.currency,
    regionalPrices: getRegionalPrices(draft.rawMetadata),
    updatedAt: draft.updatedAt.toISOString(),
  }))} />;
}
