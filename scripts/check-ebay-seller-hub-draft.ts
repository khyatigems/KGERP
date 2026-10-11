import { prisma } from "../lib/prisma";
import { EbayConnector } from "../lib/marketplace/connectors/ebay";
import { HttpError } from "../lib/marketplace/http";
import { buildSellerHubDraftCsv } from "../lib/marketplace/ebay-seller-hub-draft";
import { checkSellerHubDraft } from "../lib/marketplace/ebay-seller-hub-service";

async function main() {
  const sku = process.argv[2];
  if (!sku) throw new Error("Provide the saved offer SKU.");
  const saved = await prisma.listing.findFirst({ where: { platform: "EBAY", listingSku: sku, status: "DRAFT" }, include: { marketplaceShop: true } });
  if (!saved?.marketplaceShop) throw new Error("No saved eBay offer exists for this SKU.");
  const metadata = JSON.parse(saved.rawMetadata || "{}");
  const connector = new EbayConnector();
  let taskId = metadata.sellerHubDraft?.taskId;
  if (taskId && process.argv.includes("--retry-failed")) {
    const prior = await connector.getSellerHubDraftTask(saved.marketplaceShop.connectionId, taskId);
    if (!prior.terminal || prior.successCount !== 0 || prior.failureCount !== 1) throw new Error("Retry requires a confirmed failed task with zero created drafts.");
    metadata.sellerHubDraftAttempts = [...(metadata.sellerHubDraftAttempts || []), metadata.sellerHubDraft];
    taskId = null;
  }
  if (!taskId) {
    if (!process.argv.includes("--submit")) throw new Error("No upload exists. Use --submit only when explicitly creating a Seller Hub draft.");
    taskId = await connector.createSellerHubDraftTask(saved.marketplaceShop.connectionId);
    metadata.sellerHubDraft = { taskId, state: "CREATED", feedType: "FX_DRAFT" };
    // Persist before uploading. Re-running never uploads or creates a second task.
    await prisma.listing.update({ where: { id: saved.id }, data: { rawMetadata: JSON.stringify(metadata) } });
    const csv = buildSellerHubDraftCsv({ sku, title: saved.marketplaceTitle || "", categoryId: metadata.ebayTaxonomy?.categoryId || "", description: metadata.description || "", price: saved.listedPrice, quantity: saved.marketplaceQuantity || 1, condition: "NEW", imageUrls: (metadata.mediaAssets || []).filter((asset: { type: string }) => asset.type === "IMAGE").map((asset: { url: string }) => asset.url) });
    await connector.uploadSellerHubDraft(saved.marketplaceShop.connectionId, taskId, csv);
  }
  const result = await checkSellerHubDraft(saved.id, saved.marketplaceShop.id);
  console.log(JSON.stringify({ sku, taskId, ...result }));
}
main().catch((error: unknown) => { console.error(error instanceof HttpError ? error.message : error instanceof Error ? error.message : "Draft check failed"); process.exitCode = 1; }).finally(() => prisma.$disconnect());
