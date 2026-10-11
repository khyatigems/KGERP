import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { EbayConnector, type EbayMarketplaceDraftInput } from "./connectors/ebay";
import { buildEbayStaticDescription } from "./ebay-description-html";
import { buildEbayInventoryDescription } from "./ebay-description-payload";
import { nonEmptyEbayAspects } from "./inventory-listing-defaults";
import type { DraftSettings } from "./draft-settings";
import { HttpError } from "./http";
import { resolveEbayCondition } from "./listing-preparation";

type Metadata = {
  description?: string; condition?: string; format?: string; duration?: string;
  draftSettings?: DraftSettings;
  mediaAssets?: Array<{ url: string; type: "IMAGE" | "VIDEO" }>;
  ebayTaxonomy?: { categoryId?: string; marketplaceId?: string; categoryPath?: string; requiredAspectValues?: Record<string, string> };
  marketplaceDraft?: { id?: string; draftSettings?: DraftSettings };
  completeEbay?: { state: string; offerId?: string; reviewToken?: string; listingId?: string; error?: string; locationKey?: string; verified?: boolean };
  [key: string]: unknown;
};
export type DispatchAddress = { country: string; postalCode: string; city?: string };
export type CompleteEbayEdits = { title: string; description: string; price: number; quantity: number; aspects: Record<string, string[]>; draftSettings?: DraftSettings; media?: Array<{ mediaUrl: string; type: "IMAGE" | "VIDEO" }> };

export function completeEbayInput(saved: { listingSku: string | null; marketplaceTitle: string | null; listedPrice: number; currency: string; marketplaceQuantity: number | null }, metadata: Metadata): EbayMarketplaceDraftInput {
  const input: EbayMarketplaceDraftInput = {
    sku: saved.listingSku || "", title: saved.marketplaceTitle || "", price: saved.listedPrice, currency: saved.currency,
    quantity: saved.marketplaceQuantity || 1, description: buildEbayStaticDescription(metadata.description || ""),
    condition: metadata.condition || "", marketplaceId: metadata.ebayTaxonomy?.marketplaceId || "EBAY_US",
    categoryId: metadata.ebayTaxonomy?.categoryId || "", draftSettings: metadata.draftSettings || metadata.marketplaceDraft?.draftSettings,
    aspects: nonEmptyEbayAspects(Object.fromEntries(Object.entries(metadata.ebayTaxonomy?.requiredAspectValues || {}).map(([name, value]) => [name, [value]]))),
    media: (metadata.mediaAssets || []).map((asset) => ({ type: asset.type, mediaUrl: asset.url })),
  };
  if (!input.sku || !input.title.trim() || input.title.length > 80 || !input.description.trim() || !input.condition || !/^\d+$/.test(input.categoryId) || !Number.isFinite(input.price) || input.price <= 0) throw new Error("The saved draft is incomplete. Edit and save its title, description, condition, category and price first.");
  if (!Number.isInteger(input.quantity) || input.quantity < 1) throw new Error("Enter a positive whole-number listing quantity.");
  if (!input.media.some((asset) => asset.type === "IMAGE")) throw new Error("Select at least one product photo before preparing the complete listing.");
  if (input.media.filter((asset) => asset.type === "IMAGE").length > 24 || input.media.filter((asset) => asset.type === "VIDEO").length > 1) throw new Error("Choose at most 24 photos and one video.");
  if (metadata.format && !["FixedPrice", "FIXED_PRICE", "Fixed price"].includes(metadata.format)) throw new Error("This workflow supports fixed-price listings only.");
  if (metadata.duration && !["GTC", "GoodTillCancelled", "Good 'Til Cancelled"].includes(metadata.duration)) throw new Error("Fixed-price listings require GTC duration. Update the ERP template first.");
  return input;
}

function digest(value: unknown) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }

export function verifyCompleteEbayPayload(input: EbayMarketplaceDraftInput, item: Record<string, unknown>, offer: Record<string, unknown>) {
  const product = item.product as { title?: string; description?: string; aspects?: Record<string, string[]>; imageUrls?: string[]; videoIds?: string[] } | undefined;
  const policies = offer.listingPolicies as DraftSettings | undefined;
  const price = (offer.pricingSummary as { price?: { value?: string; currency?: string } })?.price;
  const mismatches: string[] = [];
  if (product?.title !== input.title) mismatches.push("title");
  if (product?.description !== buildEbayInventoryDescription(input.description, input.title)) mismatches.push("inventory description");
  if (offer.listingDescription !== input.description) mismatches.push("HTML description");
  if (item.condition !== input.condition) mismatches.push("condition");
  if (offer.sku !== input.sku || offer.marketplaceId !== input.marketplaceId || offer.categoryId !== input.categoryId) mismatches.push("SKU/category/marketplace");
  if (offer.format !== "FIXED_PRICE" || offer.listingDuration !== "GTC") mismatches.push("format/duration");
  if (offer.merchantLocationKey !== input.merchantLocationKey) mismatches.push("dispatch location");
  if (offer.availableQuantity !== input.quantity || Number(price?.value) !== Number(input.price.toFixed(2)) || price?.currency !== input.currency) mismatches.push("price/quantity/currency");
  for (const key of ["fulfillmentPolicyId", "paymentPolicyId", "returnPolicyId"] as const) if (!input.draftSettings?.[key] || policies?.[key] !== input.draftSettings[key]) mismatches.push(key);
  for (const [name, values] of Object.entries(input.aspects)) if (digest([...(product?.aspects?.[name] || [])].sort()) !== digest([...values].sort())) mismatches.push(`item specific: ${name}`);
  for (const asset of input.media.filter((asset) => asset.type === "IMAGE")) if (!product?.imageUrls?.includes(asset.mediaUrl)) mismatches.push("product photo");
  if (digest(product?.imageUrls || []) !== digest(input.media.filter((asset) => asset.type === "IMAGE").map((asset) => asset.mediaUrl))) mismatches.push("photo selection/order");
  if ((product?.videoIds?.length || 0) !== input.media.filter((asset) => asset.type === "VIDEO").length) mismatches.push("product video");
  if (mismatches.length) throw new Error(`eBay read-back did not match: ${[...new Set(mismatches)].join(", ")}. Publishing is blocked.`);
}

async function load(draftId: string, shopId: string) {
  const saved = await prisma.listing.findFirst({ where: { id: draftId, platform: "EBAY", marketplaceShopId: shopId, marketplaceShop: { status: "CONNECTED", connection: { status: "CONNECTED" } } }, include: { inventory: { select: { status: true, condition: true, imageUrl: true, media: { select: { mediaUrl: true, type: true } } } }, marketplaceShop: { include: { connection: { select: { scopes: true } } } } } });
  if (!saved?.marketplaceShop) throw new Error("Saved eBay draft not found for this connected shop.");
  const metadata = JSON.parse(saved.rawMetadata || "{}") as Metadata;
  if (!metadata.condition && saved.inventory?.condition) metadata.condition = resolveEbayCondition(saved.inventory.condition) || undefined;
  return { saved, metadata, connectionId: saved.marketplaceShop.connectionId, connector: new EbayConnector() };
}

export async function reviewCompleteEbayListing(draftId: string, shopId: string) {
  const { saved, metadata, connector, connectionId } = await load(draftId, shopId);
  const input = completeEbayInput(saved, metadata);
  const [locations, policyGroups] = await Promise.all([connector.getInventoryLocations(connectionId), connector.getDraftSettingGroups(connectionId, input.marketplaceId)]);
  const availableMedia = [...(saved.inventory?.media || []), ...(saved.inventory?.imageUrl ? [{ mediaUrl: saved.inventory.imageUrl, type: "IMAGE" }] : []), ...input.media].filter((asset, index, all) => ["IMAGE", "VIDEO"].includes(asset.type) && all.findIndex((other) => other.mediaUrl === asset.mediaUrl) === index);
  return { input, locations, policyGroups, availableMedia, preparation: metadata.completeEbay || null, shopName: saved.marketplaceShop!.name, status: saved.status };
}

export async function prepareCompleteEbayListing(draftId: string, shopId: string, locationKey: string | undefined, address: DispatchAddress | undefined, edits?: CompleteEbayEdits) {
  let context = await load(draftId, shopId);
  if (edits) {
    const { saved, metadata } = context;
    if (saved.status !== "DRAFT" || ["PREPARING", "PUBLISHING", "PUBLISH_UNCERTAIN"].includes(metadata.completeEbay?.state || "")) throw new Error("This draft is busy or already published. Reload its status.");
    metadata.description = buildEbayStaticDescription(edits.description);
    metadata.draftSettings = edits.draftSettings;
    if (edits.media) {
      const permitted = [...(metadata.mediaAssets || []).map((asset) => ({ mediaUrl: asset.url, type: asset.type })), ...(saved.inventory?.media || []), ...(saved.inventory?.imageUrl ? [{ mediaUrl: saved.inventory.imageUrl, type: "IMAGE" }] : [])];
      if (edits.media.some((asset) => !permitted.some((other) => other.mediaUrl === asset.mediaUrl && other.type === asset.type))) throw new Error("Select media attached to this inventory item, or upload it through this review first.");
      if (new Set(edits.media.map((asset) => asset.mediaUrl)).size !== edits.media.length) throw new Error("The same media file cannot be selected twice.");
      metadata.mediaAssets = edits.media.map((asset) => ({ url: asset.mediaUrl, type: asset.type }));
    }
    metadata.ebayTaxonomy = { ...metadata.ebayTaxonomy, requiredAspectValues: Object.fromEntries(Object.entries(nonEmptyEbayAspects(edits.aspects)).map(([name, values]) => [name, values.join(" | ")])) };
    metadata.completeEbay = { ...metadata.completeEbay, state: "SAVED", verified: false, reviewToken: undefined };
    completeEbayInput({ ...saved, marketplaceTitle: edits.title, listedPrice: edits.price, marketplaceQuantity: edits.quantity }, metadata);
    const update = await prisma.listing.updateMany({ where: { id: saved.id, status: "DRAFT", rawMetadata: saved.rawMetadata }, data: { marketplaceTitle: edits.title, listedPrice: edits.price, marketplacePrice: edits.price, marketplaceQuantity: edits.quantity, rawMetadata: JSON.stringify(metadata) } });
    if (!update.count) throw new Error("This draft changed. Reload before saving edits.");
    context = await load(draftId, shopId);
  }
  const { saved, metadata, connector, connectionId } = context;
  if (saved.status !== "DRAFT") throw new Error("Only an unpublished ERP draft can be prepared.");
  if (saved.inventory?.status !== "IN_STOCK") throw new Error("This inventory item is no longer in stock. Preparation was stopped.");
  if (["PREPARING", "PUBLISHING", "PUBLISH_UNCERTAIN"].includes(metadata.completeEbay?.state || "")) throw new Error("A previous operation is pending. Reconcile its status before changing this draft.");
  if (!(await connector.ensureInventoryWriteScope(connectionId, saved.marketplaceShop!.connection.scopes))) throw new Error("Reconnect this shop with sell.inventory permission.");
  const input = completeEbayInput(saved, metadata);
  const taxonomy = await connector.getCategoryAspects(connectionId, metadata.ebayTaxonomy?.categoryPath || String(metadata.categoryPath || "Loose Gemstones"), input.marketplaceId, input.categoryId);
  const missing = taxonomy.requiredAspects.filter((aspect) => !input.aspects[aspect.name]?.length).map((aspect) => aspect.name);
  if (missing.length) throw new Error(`Required item specifics are missing: ${missing.join(", ")}. Edit this draft first.`);
  const definitions = [...taxonomy.requiredAspects, ...taxonomy.optionalAspects];
  for (const [name, values] of Object.entries(input.aspects)) {
    const definition = definitions.find((aspect) => aspect.name === name);
    if (!definition || (definition.mode === "SELECTION_ONLY" && values.some((value) => !definition.values.includes(value)))) throw new Error(`Choose a current eBay category value for ${name}.`);
  }
  let locations = await connector.getInventoryLocations(connectionId);
  if (!locationKey && address) {
    if (!/^[A-Z]{2}$/.test(address.country) || !address.postalCode.trim()) throw new Error("Enter the actual dispatch country code and postal code.");
    const key = `erp-${digest({ shopId, address }).slice(0, 32)}`;
    if (!locations.some((location) => location.merchantLocationKey === key)) {
      await connector.createInventoryLocation(connectionId, key, address);
      locations = await connector.getInventoryLocations(connectionId);
    }
    locationKey = key;
  }
  if (!locations.some((location) => location.merchantLocationKey === locationKey)) throw new Error("Choose an enabled eBay dispatch location or enter the actual dispatch address.");
  input.merchantLocationKey = locationKey;
  const existingOffers = await connector.findOffersForSku(connectionId, input.sku, input.marketplaceId).catch((error) => { if (error instanceof HttpError && error.status === 404) return []; throw error; });
  if (existingOffers.some((offer) => offer.status === "PUBLISHED")) throw new Error("This SKU already has a published eBay offer. Publishing another listing is blocked.");
  if (existingOffers.length > 1) throw new Error("Multiple offers exist for this SKU. Resolve duplicates before continuing.");
  input.existingOfferId = existingOffers[0]?.offerId || metadata.completeEbay?.offerId || metadata.marketplaceDraft?.id;
  if (input.existingOfferId) {
    const prior = await connector.getMarketplaceOffer(connectionId, input.existingOfferId);
    if (prior.sku !== input.sku || prior.status !== "UNPUBLISHED" || prior.marketplaceId !== input.marketplaceId) throw new Error("The existing offer does not match this unpublished draft.");
  }
  metadata.completeEbay = { state: "PREPARING", offerId: input.existingOfferId, locationKey };
  const claim = await prisma.listing.updateMany({ where: { id: saved.id, status: "DRAFT", rawMetadata: saved.rawMetadata }, data: { rawMetadata: JSON.stringify(metadata) } });
  if (!claim.count) throw new Error("This draft changed. Reload before preparing it.");
  try {
    const result = await connector.createMarketplaceDraft(connectionId, input);
    metadata.completeEbay.offerId = result.offerId;
    // Persist the remote ID before read-back, so failures never lose the offer.
    await prisma.listing.update({ where: { id: saved.id }, data: { rawMetadata: JSON.stringify(metadata) } });
    if (result.warnings.length) throw new Error(`Selected media could not all be transferred: ${result.warnings.join("; ")}`);
    input.draftSettings = result.draftSettings;
    metadata.draftSettings = result.draftSettings;
    const [item, offer] = await Promise.all([connector.getCompleteInventoryItem(connectionId, input.sku), connector.getCompleteOffer(connectionId, result.offerId)]);
    verifyCompleteEbayPayload(input, item, offer);
    const reviewToken = digest({ input, offerId: result.offerId });
    metadata.completeEbay = { state: "READY", offerId: result.offerId, reviewToken, locationKey, verified: true };
    await prisma.listing.update({ where: { id: saved.id }, data: { rawMetadata: JSON.stringify(metadata), syncError: null } });
    return { success: true, reviewToken, offerId: result.offerId, input, location: locations.find((location) => location.merchantLocationKey === locationKey) };
  } catch (error) {
    metadata.completeEbay = { ...metadata.completeEbay, state: "PREPARE_FAILED", verified: false, error: error instanceof Error ? error.message : "Preparation failed." };
    await prisma.listing.update({ where: { id: saved.id }, data: { rawMetadata: JSON.stringify(metadata), syncError: metadata.completeEbay.error } });
    throw error;
  }
}

export async function publishCompleteEbayListing(draftId: string, shopId: string, reviewToken: string, confirmationSku: string) {
  const { saved, metadata, connector, connectionId } = await load(draftId, shopId);
  const prepared = metadata.completeEbay;
  if (confirmationSku !== saved.listingSku) throw new Error("Type the exact SKU to confirm publishing this live listing.");
  if (!prepared?.offerId) throw new Error("Prepare and verify the complete offer first.");
  const remote = await connector.getMarketplaceOffer(connectionId, prepared.offerId);
  if (remote.sku !== saved.listingSku || remote.marketplaceId !== metadata.ebayTaxonomy?.marketplaceId) throw new Error("The eBay offer does not match this draft.");
  // Reconcile an interrupted publication without publishing twice.
  if (remote.status === "PUBLISHED" && remote.listingId) return finalize(remote.listingId);
  if (["PUBLISHING", "PUBLISH_UNCERTAIN"].includes(prepared.state)) throw new Error("Publication is not yet confirmed. Check again; no automatic second publish request will be sent.");
  if (saved.status !== "DRAFT" || prepared.state !== "READY" || !prepared.verified || reviewToken !== prepared.reviewToken) throw new Error("The listing changed or is not verified. Prepare it again before publishing.");
  if (saved.inventory?.status !== "IN_STOCK") throw new Error("This inventory item is no longer in stock. Publishing was stopped.");
  const input = completeEbayInput(saved, metadata);
  input.merchantLocationKey = prepared.locationKey;
  const [item, offer] = await Promise.all([connector.getCompleteInventoryItem(connectionId, input.sku), connector.getCompleteOffer(connectionId, prepared.offerId)]);
  verifyCompleteEbayPayload(input, item, offer);
  const claim = await prisma.listing.updateMany({ where: { id: saved.id, status: "DRAFT", rawMetadata: saved.rawMetadata }, data: { rawMetadata: JSON.stringify({ ...metadata, completeEbay: { ...prepared, state: "PUBLISHING" } }) } });
  if (!claim.count) throw new Error("Another request changed this draft. Reload its status.");
  try {
    const listingId = await connector.publishMarketplaceOffer(connectionId, prepared.offerId);
    return await finalize(listingId);
  } catch (error) {
    prepared.state = error instanceof HttpError && [400, 422].includes(error.status) ? "PREPARE_FAILED" : "PUBLISH_UNCERTAIN";
    if (prepared.state === "PREPARE_FAILED") prepared.verified = false;
    prepared.error = error instanceof Error ? error.message : "Publication response interrupted.";
    await prisma.listing.update({ where: { id: saved.id }, data: { rawMetadata: JSON.stringify(metadata), syncError: prepared.error } });
    throw error;
  }
  async function finalize(listingId: string) {
    const listingUrl = `https://www.ebay.com/itm/${encodeURIComponent(listingId)}`;
    metadata.completeEbay = { ...prepared!, state: "PUBLISHED", listingId };
    await prisma.listing.update({ where: { id: saved.id }, data: { status: "ACTIVE", externalId: listingId, listingUrl, syncStatus: "SYNCED", syncError: null, rawMetadata: JSON.stringify(metadata) } });
    return { success: true, listingId, listingUrl };
  }
}
