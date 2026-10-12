import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { ListingPreparationClient } from "@/components/marketplace/listing-preparation-client";
import { EbayConnector } from "@/lib/marketplace/connectors/ebay";
import { hasOAuthScope } from "@/lib/marketplace/scopes";
import { WebsiteCreateListing } from "@/components/website/create-listing";
import { websiteEnabled } from "@/lib/website/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create Marketplace Listings | KhyatiGems™ ERP",
};

export default async function MarketplaceCreateListingsPage({searchParams}:{searchParams:Promise<{marketplace?:string;listing?:string}>}) {
  const permission = await checkPermission(PERMISSIONS.LISTINGS_VIEW);
  if (!permission.success) redirect("/");
  const params=await searchParams;
  if(params.marketplace==="WEBSITE"&&websiteEnabled())return <WebsiteCreateListing listingId={params.listing}/>;

  const shops = await prisma.marketplaceShop.findMany({
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
    });
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
    websiteAvailable={websiteEnabled()}
    ebayShops={ebayShops}
    etsyShops={shops.filter((shop) => shop.marketplace === "ETSY").map((shop) => ({
      id: shop.id,
      name: shop.name,
      writeReady: hasOAuthScope(shop.connection.scopes, "listings_w"),
    }))}
  />;
}
