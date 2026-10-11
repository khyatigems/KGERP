import { prisma } from "../lib/prisma";
import { EbayConnector } from "../lib/marketplace/connectors/ebay";

async function main() {
  const offerId = process.argv[2];
  if (!offerId || !/^\d+$/.test(offerId)) throw new Error("Provide a numeric eBay offer ID.");
  const saved = await prisma.listing.findFirst({
    where: { platform: "EBAY", rawMetadata: { contains: `"id":"${offerId}"` } },
    select: { listingSku: true, marketplaceShop: { select: { connectionId: true, name: true } } },
  });
  if (!saved?.marketplaceShop) {
    console.log("This offer is not present in the database configured in this workspace; live verification was not performed.");
    return;
  }
  const offer = await new EbayConnector().getMarketplaceOffer(saved.marketplaceShop.connectionId, offerId);
  console.log(JSON.stringify({ shop: saved.marketplaceShop.name, ...offer, matchesSavedSku: offer.sku === saved.listingSku }));
}

main().catch(() => { console.error("Offer verification could not complete using this workspace's configured connection."); process.exitCode = 1; }).finally(() => prisma.$disconnect());
