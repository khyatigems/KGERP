import { prisma } from "../lib/prisma";
import { prepareCompleteEbayListing, reviewCompleteEbayListing } from "../lib/marketplace/ebay-complete-listing";

async function main() {
  const sku = process.argv[2];
  if (!sku) throw new Error("Provide a saved draft SKU.");
  const saved = await prisma.listing.findFirst({ where: { platform: "EBAY", listingSku: sku, status: "DRAFT" } });
  if (!saved?.marketplaceShopId) throw new Error("No saved eBay draft found.");
  const metadata = JSON.parse(saved.rawMetadata || "{}");
  console.log(JSON.stringify({ title: saved.marketplaceTitle, price: saved.listedPrice, descriptionLength: metadata.description?.length, condition: metadata.condition, categoryId: metadata.ebayTaxonomy?.categoryId, format: metadata.format, duration: metadata.duration, draftSettings: metadata.draftSettings, legacyDraftSettings: metadata.marketplaceDraft?.draftSettings }));
  if (process.argv.includes("--prepare")) {
    const country = process.argv[4], postalCode = process.argv[5], city = process.argv[6];
    if (!country || !postalCode) throw new Error("Provide actual country code, postal code and optional city after --prepare.");
    const result = await prepareCompleteEbayListing(saved.id, saved.marketplaceShopId, undefined, { country, postalCode, city });
    console.log(JSON.stringify({ sku, offerId: result.offerId, verified: result.success, itemSpecifics: Object.keys(result.input.aspects), policies: result.input.draftSettings, location: result.location, photoCount: result.input.media.filter((asset) => asset.type === "IMAGE").length, published: false }, null, 2));
  } else {
    const result = await reviewCompleteEbayListing(saved.id, saved.marketplaceShopId);
    console.log(JSON.stringify({ sku, state: result.preparation?.state, itemSpecifics: Object.keys(result.input.aspects), locations: result.locations, policies: result.policyGroups, published: false }, null, 2));
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
