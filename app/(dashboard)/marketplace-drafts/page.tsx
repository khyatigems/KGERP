import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { MarketplaceDraftsClient } from "@/components/marketplace/marketplace-drafts-client";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Marketplace Drafts | KhyatiGems ERP" };
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

function getSellerHubDraft(rawMetadata: string | null) {
  try {
    const value = JSON.parse(rawMetadata || "{}").sellerHubDraft;
    if (!value || typeof value !== "object") return null;
    const completeUrl = typeof value.completeUrl === "string" && value.completeUrl.startsWith("https://www.ebay.com/") ? value.completeUrl : null;
    return { state: String(value.state || "NOT_SUBMITTED"), taskId: typeof value.taskId === "string" ? value.taskId : null, draftId: typeof value.draftId === "string" ? value.draftId : null, completeUrl };
  } catch { return null; }
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

export default async function MarketplaceDraftsPage() {
 const permission = await checkPermission(PERMISSIONS.LISTINGS_VIEW);
 if (!permission.success) redirect("/");
 const drafts = await prisma.listing.findMany({
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
      take: 100,
    });
 return <MarketplaceDraftsClient drafts={drafts.map((draft) => ({
    id: draft.id,
    externalId: draft.externalId || getMarketplaceDraftId(draft.rawMetadata),
    sellerHubDraft: getSellerHubDraft(draft.rawMetadata),
    sku: draft.inventory?.sku || draft.listingSku || "—",
    itemName: draft.inventory?.itemName || draft.marketplaceTitle || "Unknown item",
    title: draft.marketplaceTitle || draft.inventory?.itemName || draft.listingSku || "Untitled marketplace draft",
    shop: draft.marketplaceShop?.name || draft.marketplaceShopName || `${draft.platform} shop`,
    shopId: draft.marketplaceShopId,
    platform: draft.platform,
    syncError: draft.syncError,
    price: draft.listedPrice,
    currency: draft.currency,
    regionalPrices: getRegionalPrices(draft.rawMetadata),
    updatedAt: draft.updatedAt.toISOString(),
  }))} />;
}
