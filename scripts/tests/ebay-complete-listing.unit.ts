import assert from "node:assert/strict";
import { completeEbayInput, verifyCompleteEbayPayload, publishCompleteEbayListing } from "../../lib/marketplace/ebay-complete-listing";
import { buildEbayInventoryDescription } from "../../lib/marketplace/ebay-description-payload";
import { EbayConnector } from "../../lib/marketplace/connectors/ebay";
import { prisma } from "../../lib/prisma";
import { encryptSecret } from "../../lib/security/secret-store";

const saved = { listingSku: "TEST", marketplaceTitle: "Blue gem", listedPrice: 85, currency: "USD", marketplaceQuantity: 1 };
const metadata = { description: '<p>Actual gemstone</p><img src="https://example.test/photo.jpg" onerror="bad()">', condition: "NEW", format: "Fixed price", duration: "Good 'Til Cancelled", draftSettings: { fulfillmentPolicyId: "ship", paymentPolicyId: "pay", returnPolicyId: "return" }, ebayTaxonomy: { marketplaceId: "EBAY_US", categoryId: "262027", requiredAspectValues: { "Gemstone Type": "Cubic Zirconia", "Gemstone Color": "Blue", "California Prop 65 Warning": "" } }, mediaAssets: [{ url: "https://example.test/photo.jpg", type: "IMAGE" as const }] };
const input = { ...completeEbayInput(saved, metadata), merchantLocationKey: "india-122001" };
assert.ok(!input.description.includes("onerror"));
assert.ok(!input.aspects["California Prop 65 Warning"]);
assert.deepEqual(completeEbayInput(saved, { ...metadata, draftSettings: undefined, marketplaceDraft: { draftSettings: metadata.draftSettings } }).draftSettings, metadata.draftSettings, "Retain policy selections from older drafts");
const item = { condition: "NEW", product: { title: input.title, description: buildEbayInventoryDescription(input.description, input.title), aspects: input.aspects, imageUrls: ["https://example.test/photo.jpg"], videoIds: [] } };
const offer = { sku: input.sku, marketplaceId: "EBAY_US", categoryId: input.categoryId, format: "FIXED_PRICE", listingDuration: "GTC", merchantLocationKey: input.merchantLocationKey, listingDescription: input.description, listingPolicies: metadata.draftSettings, availableQuantity: 1, pricingSummary: { price: { value: "85.00", currency: "USD" } } };
verifyCompleteEbayPayload(input, item, offer);
assert.throws(() => verifyCompleteEbayPayload(input, { ...item, product: { ...item.product, aspects: {} } }, offer), /Gemstone Type/);
assert.throws(() => verifyCompleteEbayPayload(input, item, { ...offer, listingPolicies: {} }), /paymentPolicyId/);
assert.throws(() => verifyCompleteEbayPayload(input, item, { ...offer, merchantLocationKey: "US" }), /dispatch location/);
assert.throws(() => verifyCompleteEbayPayload(input, { ...item, product: { ...item.product, imageUrls: [] } }, offer), /photo/);

async function main() {
  const priorFetch = globalThis.fetch;
  const priorFind = prisma.marketplaceConnection.findUnique;
  const priorKey = process.env.ERP_SECRET_ENCRYPTION_KEY;
  const priorPolicy = EbayConnector.prototype.getDraftSettingGroups;
  const priorListingFind = prisma.listing.findFirst;
  const priorUpdate = prisma.listing.update;
  const priorUpdateMany = prisma.listing.updateMany;
  const priorGet = EbayConnector.prototype.getMarketplaceOffer;
  const priorPublish = EbayConnector.prototype.publishMarketplaceOffer;
  const priorItem = EbayConnector.prototype.getCompleteInventoryItem;
  const priorOffer = EbayConnector.prototype.getCompleteOffer;
  process.env.ERP_SECRET_ENCRYPTION_KEY = "complete-listing-test-only";
  try {
    const tokenRef = encryptSecret(JSON.stringify({ accessToken: "test-token", expiresAt: new Date(Date.now() + 3600000).toISOString() }));
    prisma.marketplaceConnection.findUnique = (async () => ({ tokenRef })) as unknown as typeof priorFind;
    EbayConnector.prototype.getDraftSettingGroups = async () => (["fulfillmentPolicyId", "paymentPolicyId", "returnPolicyId"] as const).map((key) => ({ key, label: key, selectedId: metadata.draftSettings[key], options: [{ id: metadata.draftSettings[key], name: key }] }));
    let publishCalls = 0;
    globalThis.fetch = async (url, init) => {
      if (String(url).endsWith("/publish")) { publishCalls++; return new Response("unavailable", { status: 500 }); }
      const body = JSON.parse(String(init?.body));
      if (String(url).includes("/inventory_item/")) {
        assert.deepEqual(body.product.aspects, input.aspects);
        assert.deepEqual(body.product.imageUrls, item.product.imageUrls);
        return new Response(null, { status: 204 });
      }
      assert.equal(init?.method, "PUT");
      assert.equal(body.merchantLocationKey, "india-122001");
      assert.deepEqual(body.listingPolicies, metadata.draftSettings);
      assert.equal(body.listingDescription, input.description);
      assert.equal(body.listingDuration, "GTC");
      return new Response(null, { status: 204 });
    };
    const connector = new EbayConnector();
    assert.equal((await connector.createMarketplaceDraft("connection", { ...input, existingOfferId: "offer-1" })).offerId, "offer-1");
    assert.equal(publishCalls, 0, "Preparing must not publish");
    await assert.rejects(connector.publishMarketplaceOffer("connection", "offer-1"), /500/);
    assert.equal(publishCalls, 1, "Publishing must not automatically retry");

    let row = { id: "draft", ...saved, status: "DRAFT", inventory: { status: "IN_STOCK" }, rawMetadata: JSON.stringify({ ...metadata, completeEbay: { state: "READY", verified: true, offerId: "offer-1", locationKey: "india-122001", reviewToken: "token" } }), marketplaceShop: { name: "shop", connectionId: "connection", connection: { scopes: "sell.inventory" } } };
    prisma.listing.findFirst = (async () => structuredClone(row)) as unknown as typeof priorListingFind;
    prisma.listing.updateMany = (async ({ where, data }: { where: { rawMetadata: string }; data: { rawMetadata: string } }) => {
      if (row.rawMetadata !== where.rawMetadata) return { count: 0 };
      row.rawMetadata = data.rawMetadata; return { count: 1 };
    }) as unknown as typeof priorUpdateMany;
    prisma.listing.update = (async ({ data }: { data: Partial<typeof row> }) => { row = { ...row, ...data }; return row; }) as unknown as typeof priorUpdate;
    let remotePublished = false;
    EbayConnector.prototype.getMarketplaceOffer = async () => ({ offerId: "offer-1", sku: "TEST", status: remotePublished ? "PUBLISHED" : "UNPUBLISHED", marketplaceId: "EBAY_US", listingId: remotePublished ? "123456" : null, environment: "PRODUCTION" });
    EbayConnector.prototype.getCompleteInventoryItem = async () => item;
    EbayConnector.prototype.getCompleteOffer = async () => offer;
    publishCalls = 0;
    EbayConnector.prototype.publishMarketplaceOffer = async () => { publishCalls++; throw new Error("Interrupted after submission"); };
    await assert.rejects(publishCompleteEbayListing("draft", "shop", "token", "WRONG"), /exact SKU/);
    await assert.rejects(publishCompleteEbayListing("draft", "shop", "stale", "TEST"), /changed/);
    assert.equal(publishCalls, 0);
    await assert.rejects(publishCompleteEbayListing("draft", "shop", "token", "TEST"), /Interrupted/);
    await assert.rejects(publishCompleteEbayListing("draft", "shop", "token", "TEST"), /not yet confirmed/);
    assert.equal(publishCalls, 1);
    remotePublished = true;
    assert.equal((await publishCompleteEbayListing("draft", "shop", "token", "TEST")).listingId, "123456");
    assert.equal(row.status, "ACTIVE");
    assert.equal(publishCalls, 1, "Reconciliation must not publish twice");
    console.log("Complete eBay listing regression tests passed.");
  } finally {
    globalThis.fetch = priorFetch; prisma.marketplaceConnection.findUnique = priorFind;
    prisma.listing.findFirst = priorListingFind; prisma.listing.update = priorUpdate; prisma.listing.updateMany = priorUpdateMany;
    EbayConnector.prototype.getDraftSettingGroups = priorPolicy; EbayConnector.prototype.getMarketplaceOffer = priorGet; EbayConnector.prototype.publishMarketplaceOffer = priorPublish;
    EbayConnector.prototype.getCompleteInventoryItem = priorItem; EbayConnector.prototype.getCompleteOffer = priorOffer;
    if (priorKey === undefined) delete process.env.ERP_SECRET_ENCRYPTION_KEY; else process.env.ERP_SECRET_ENCRYPTION_KEY = priorKey;
    await prisma.$disconnect();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
