import { loadEnvConfig } from "@next/env";
import { mkdir, writeFile } from "node:fs/promises";
loadEnvConfig(process.cwd());
async function main() {
 const { prisma } = await import("../lib/prisma");
 const { EbayConnector } = await import("../lib/marketplace/connectors/ebay");
 const { EtsyConnector } = await import("../lib/marketplace/connectors/etsy");
 const { EBAY_TEMPLATE_CATEGORY_PATHS } = await import("../lib/marketplace/listing-preparation");
 try {
  const shops = await prisma.marketplaceShop.findMany({ where: { status: "CONNECTED", connection: { status: "CONNECTED" }, marketplace: { in: ["EBAY", "ETSY"] } }, select: { marketplace: true, connectionId: true, externalShopId: true } });
  const catalog: { fetchedAt: string; ebay: unknown[]; etsy: unknown[] } = { fetchedAt: new Date().toISOString(), ebay: [], etsy: [] };
  const ebay = shops.find((s) => s.marketplace === "EBAY");
  if (!ebay) throw new Error("No connected eBay shop available for the field audit.");
  for (const [type, path] of Object.entries(EBAY_TEMPLATE_CATEGORY_PATHS)) {
   const data = await new EbayConnector().getCategoryAspects(ebay.connectionId, path);
   if (!data.categoryId && type === "JEWELRY") {
    // All returned bracelet leaf categories are audited; category IDs remain distinct.
    for (const choice of data.suggestions.filter((s) => s.categoryPath === "Bracelets & Charms")) {
     const leaf = await new EbayConnector().getCategoryAspects(ebay.connectionId, path, "EBAY_US", choice.categoryId);
     catalog.ebay.push({ type, ...leaf });
    }
   } else catalog.ebay.push({ type, ...data });
   console.log(`eBay ${type}: ${data.requiredAspects.length} required / ${data.optionalAspects.length} optional fields`);
  }
  const etsy = shops.find((s) => s.marketplace === "ETSY");
  if (!etsy) throw new Error("No connected Etsy shop available for the field audit.");
  const connector = new EtsyConnector();
  const choices = await connector.getListingPreparationOptions(etsy.connectionId, etsy.externalShopId);
  const categories = choices.categories.filter((category) => / > Gemstones$| > Beads$| > Beaded Bracelets$| > Charm Bracelets$/.test(category.path));
  for (const category of categories) {
   const data = await connector.getListingPreparationOptions(etsy.connectionId, etsy.externalShopId, category.taxonomyId);
   catalog.etsy.push({ category, properties: data.properties });
   console.log(`Etsy ${category.path}: ${data.properties.length} fields`);
  }
  await mkdir("lib/marketplace/catalog", { recursive: true });
  await writeFile("lib/marketplace/catalog/inventory-fields.json", JSON.stringify(catalog, null, 2) + "\n");
 } finally { await prisma.$disconnect(); }
}
main().catch((error) => { console.error(error instanceof Error ? error.message : "Field audit failed"); process.exitCode = 1; });
