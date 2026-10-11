import { prisma } from "@/lib/prisma";
import { EbayConnector } from "@/lib/marketplace/connectors/ebay";
import { buildSellerHubDraftCsv, parseSellerHubDraftReport } from "@/lib/marketplace/ebay-seller-hub-draft";

type DraftMetadata = Record<string, unknown> & {
  description?: string; condition?: string;
  ebayTaxonomy?: { categoryId?: string; marketplaceId?: string };
  mediaAssets?: Array<{ url: string; type: string }>;
  marketplaceDraft?: { id?: string };
  sellerHubDraft?: { taskId?: string; state?: string; draftId?: string; completeUrl?: string; error?: string };
};

export async function loadSellerHubDraft(draftId: string, shopId: string) {
  const saved = await prisma.listing.findFirst({
    where: { id: draftId, platform: "EBAY", marketplaceShopId: shopId, status: "DRAFT", marketplaceShop: { status: "CONNECTED", connection: { status: "CONNECTED" } } },
    include: { marketplaceShop: { include: { connection: { select: { scopes: true } } } }, inventory: { select: { condition: true } } },
  });
  if (!saved?.marketplaceShop) throw new Error("No saved eBay draft exists for this connected shop.");
  const metadata = JSON.parse(saved.rawMetadata || "{}") as DraftMetadata;
  if (metadata.ebayTaxonomy?.marketplaceId !== "EBAY_US" || saved.currency !== "USD") throw new Error("Seller Hub draft transfer currently supports eBay US in USD.");
  const csv = buildSellerHubDraftCsv({
    sku: saved.listingSku || "", title: saved.marketplaceTitle || "", description: metadata.description || "",
    categoryId: metadata.ebayTaxonomy.categoryId || "", price: saved.listedPrice, quantity: saved.marketplaceQuantity || 1,
    condition: metadata.condition || (saved.inventory?.condition?.toLowerCase() === "new" ? "NEW" : "USED"),
    imageUrls: (metadata.mediaAssets || []).filter((asset) => asset.type === "IMAGE").map((asset) => asset.url),
  });
  return { saved, metadata, csv, connectionId: saved.marketplaceShop.connectionId };
}

export async function checkSellerHubDraft(draftId: string, shopId: string) {
  const { saved, metadata, connectionId } = await loadSellerHubDraft(draftId, shopId);
  const taskId = metadata.sellerHubDraft?.taskId;
  if (!taskId) return { state: metadata.sellerHubDraft?.state || "NOT_SUBMITTED", success: false, terminal: false };
  const connector = new EbayConnector();
  const result = await connector.getSellerHubDraftTask(connectionId, taskId);
  const report = result.terminal ? await connector.getSellerHubDraftResult(connectionId, taskId) : null;
  const details = report ? parseSellerHubDraftReport(report) : { draftId: null, completeUrl: null, error: null };
  const success = result.success && Boolean(details.draftId);
  const state = success ? "CREATED" : result.terminal ? "FAILED" : "PROCESSING";
  if (metadata.sellerHubDraft?.state === "UPLOAD_UNCERTAIN" && result.status === "CREATED") {
    return { ...result, state: "UPLOAD_UNCERTAIN", taskId, report, ...details, success: false, error: "The upload was interrupted before eBay confirmed receiving the file. Do not resubmit automatically; use the CSV fallback if the task remains empty." };
  }
  metadata.sellerHubDraft = { ...metadata.sellerHubDraft, state, ...(details.draftId ? { draftId: details.draftId } : {}), ...(details.completeUrl ? { completeUrl: details.completeUrl } : {}), ...(result.terminal && !success ? { error: details.error || "eBay did not confirm a created draft. Download the result report for details." } : {}) };
  // Store the outcome and report, retaining the original offer ID separately.
  metadata.sellerHubDraftResult = { ...result, report };
  await prisma.listing.updateMany({ where: { id: saved.id, rawMetadata: saved.rawMetadata }, data: { rawMetadata: JSON.stringify(metadata), syncError: state === "FAILED" ? metadata.sellerHubDraft.error : null } });
  return { ...result, success, state, taskId, report, ...details };
}

export async function submitSellerHubDraft(draftId: string, shopId: string) {
  const { saved, metadata, csv, connectionId } = await loadSellerHubDraft(draftId, shopId);
  const connector = new EbayConnector();
  if (!(await connector.ensureInventoryWriteScope(connectionId, saved.marketplaceShop!.connection.scopes))) throw new Error("Reconnect this eBay shop with sell.inventory access.");
  if (metadata.sellerHubDraft?.taskId || ["CREATING", "UPLOAD_UNCERTAIN"].includes(metadata.sellerHubDraft?.state || "")) {
    return checkSellerHubDraft(draftId, shopId);
  }
  if (metadata.marketplaceDraft?.id) {
    const offer = await connector.getMarketplaceOffer(connectionId, metadata.marketplaceDraft.id);
    if (offer.status !== "UNPUBLISHED" || offer.sku !== saved.listingSku) throw new Error("This saved offer is already published or does not match the inventory SKU. Draft transfer was stopped.");
  }
  metadata.sellerHubDraft = { state: "CREATING" };
  const claim = await prisma.listing.updateMany({ where: { id: saved.id, rawMetadata: saved.rawMetadata }, data: { rawMetadata: JSON.stringify(metadata) } });
  if (!claim.count) throw new Error("Another request is already submitting this draft. Check its upload status.");
  let taskId: string;
  try {
    taskId = await connector.createSellerHubDraftTask(connectionId);
  } catch (error) {
    metadata.sellerHubDraft = { state: "NOT_SUBMITTED", error: error instanceof Error ? error.message : "Task creation failed." };
    await prisma.listing.update({ where: { id: saved.id }, data: { rawMetadata: JSON.stringify(metadata), syncError: metadata.sellerHubDraft.error } });
    throw error;
  }
  metadata.sellerHubDraft = { taskId, state: "UPLOAD_UNCERTAIN" };
  await prisma.listing.update({ where: { id: saved.id }, data: { rawMetadata: JSON.stringify(metadata) } });
  // Upload once. An interrupted response must be checked, never blindly retried.
  await connector.uploadSellerHubDraft(connectionId, taskId, csv);
  return checkSellerHubDraft(draftId, shopId);
}
