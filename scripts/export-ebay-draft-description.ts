import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { prisma } from "../lib/prisma";
import { buildEbayStaticDescription } from "../lib/marketplace/ebay-description-html";

async function main() {
  const sku = process.argv[2];
  if (!sku) throw new Error("Provide a saved eBay draft SKU.");
  const saved = await prisma.listing.findFirst({ where: { platform: "EBAY", listingSku: sku, status: "DRAFT" } });
  if (!saved) throw new Error("Saved draft not found.");
  const metadata = JSON.parse(saved.rawMetadata || "{}");
  const html = String(metadata.description || "");
  const path = resolve(process.argv[3] || "ebay-description-clean.html");
  await writeFile(path, buildEbayStaticDescription(html), "utf8");
  console.log(JSON.stringify({ path, scriptElements: (html.match(/<script\b/gi) || []).length, eventHandlers: (html.match(/\bon\w+\s*=/gi) || []).length, javascriptUrls: (html.match(/javascript\s*:/gi) || []).length }));
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
