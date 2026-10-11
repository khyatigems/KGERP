import assert from "node:assert/strict";
import { makeDraftSettingGroup, parseEbayDefaultPolicyIds, resolveDraftSettings } from "../../lib/marketplace/draft-settings";

const preferences = `<GetUserPreferencesResponse><Ack>Success</Ack><SellerProfilePreferences><SupportedSellerProfiles>
  <SupportedSellerProfile><ProfileType>SHIPPING</ProfileType><ProfileID>ship-default</ProfileID><CategoryGroup><Name>ALL</Name><IsDefault>true</IsDefault></CategoryGroup></SupportedSellerProfile>
  <SupportedSellerProfile><ProfileType>SHIPPING</ProfileType><ProfileID>motor</ProfileID><CategoryGroup><Name>MOTORS_VEHICLE</Name><IsDefault>true</IsDefault></CategoryGroup></SupportedSellerProfile>
  <SupportedSellerProfile><ProfileType>PAYMENT</ProfileType><ProfileID>pay</ProfileID><CategoryGroup><Name>ALL</Name><IsDefault>true</IsDefault></CategoryGroup></SupportedSellerProfile>
  <SupportedSellerProfile><ProfileType>RETURN_POLICY</ProfileType><ProfileID>return</ProfileID><CategoryGroup><Name>ALL</Name><IsDefault>1</IsDefault></CategoryGroup></SupportedSellerProfile>
</SupportedSellerProfiles></SellerProfilePreferences></GetUserPreferencesResponse>`;
assert.deepEqual(parseEbayDefaultPolicyIds(preferences), { fulfillmentPolicyId: "ship-default", paymentPolicyId: "pay", returnPolicyId: "return" });
const multiple = makeDraftSettingGroup("shippingProfileId", "Shipping profile", [{ id: "1", name: "Local" }, { id: "2", name: "Worldwide" }]);
assert.equal(multiple.selectedId, "");
assert.throws(() => resolveDraftSettings([multiple]), /Choose a shipping profile/);
assert.deepEqual(resolveDraftSettings([multiple], { shippingProfileId: "2" }), { shippingProfileId: "2" });
assert.throws(() => resolveDraftSettings([multiple], { shippingProfileId: "other-shop" }), /no longer available/);
assert.throws(() => resolveDraftSettings([makeDraftSettingGroup("readinessStateId", "Processing profile", [])]), /No processing profile/);

async function main() {
  const { prisma } = await import("../../lib/prisma");
  const { encryptSecret } = await import("../../lib/security/secret-store");
  const { EbayConnector } = await import("../../lib/marketplace/connectors/ebay");
  const { EtsyConnector } = await import("../../lib/marketplace/connectors/etsy");
  const originalFind = prisma.marketplaceConnection.findUnique;
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  process.env.ERP_SECRET_ENCRYPTION_KEY = "draft-settings-test-key-only";
  process.env.ETSY_CLIENT_ID = "test-client";
  process.env.ETSY_SHARED_SECRET = "test-secret";
  process.env.ETSY_REDIRECT_URI = "https://example.test/callback";
  const tokenRef = encryptSecret(JSON.stringify({ accessToken: "test-token", expiresAt: new Date(Date.now() + 3600000).toISOString() }));
  try {
    prisma.marketplaceConnection.findUnique = (async () => ({ tokenRef, marketplace: "ETSY", oauthAppProfile: "ETSY_SELLER_LEGACY" })) as unknown as typeof originalFind;
    let offerCreated = false;
    globalThis.fetch = async (url, init) => {
      const path = String(url);
      if (path.includes("/fulfillment_policy?")) return Response.json({ fulfillmentPolicies: [
        { fulfillmentPolicyId: "ship-other", name: "Other", categoryTypes: [{ name: "ALL_EXCLUDING_MOTORS_VEHICLES" }] },
        { fulfillmentPolicyId: "ship-default", name: "Default shipping", categoryTypes: [{ name: "ALL_EXCLUDING_MOTORS_VEHICLES" }] },
        { fulfillmentPolicyId: "motor", name: "Vehicles", categoryTypes: [{ name: "MOTORS_VEHICLES" }] },
      ] });
      if (path.includes("/payment_policy?")) return Response.json({ paymentPolicies: [{ paymentPolicyId: "pay", name: "Payment" }] });
      if (path.includes("/return_policy?")) return Response.json({ returnPolicies: [{ returnPolicyId: "return", name: "Returns" }] });
      if (path.endsWith("/ws/api.dll")) {
        assert.match(String(init?.body), /ShowSellerProfilePreferences>true/);
        return new Response(preferences);
      }
      if (path.includes("/inventory_item/")) {
        const body = JSON.parse(String(init?.body));
        assert.ok(body.product.description.length > 0 && body.product.description.length <= 4000);
        assert.ok(!body.product.description.includes("<style>"));
        assert.equal(body.product.aspects["California Prop 65 Warning"], undefined);
        assert.deepEqual(body.product.aspects.Color, ["Blue"]);
        return new Response(null, { status: 204 });
      }
      if (path.endsWith("/offer")) {
        offerCreated = true;
        const body = JSON.parse(String(init?.body));
        assert.deepEqual(body.listingPolicies, { fulfillmentPolicyId: "ship-default", paymentPolicyId: "pay", returnPolicyId: "return" });
        assert.equal(body.listingDescription, `<h1>Test listing</h1><p>${"Gemstone details ".repeat(500)}</p>`, "Keep all product text and static markup without executable content or stylesheet blocks");
        return Response.json({ offerId: "test-offer" });
      }
      if (path.endsWith("/offer/test-offer")) {
        assert.equal(init?.method || "GET", "GET", "Offer verification must be read-only");
        return Response.json({ offerId: "test-offer", sku: "TEST", status: "UNPUBLISHED", marketplaceId: "EBAY_US" });
      }
      throw new Error(`Unexpected test request: ${path}`);
    };
    const ebay = new EbayConnector();
    const groups = await ebay.getDraftSettingGroups("ebay-test");
    assert.equal(groups[0].selectedId, "ship-default", "Use seller preferences when REST default flag is absent");
    assert.equal(groups[0].options.length, 2, "Exclude vehicle-only policies");
    const longHtmlDescription = `<style>.listing { color: red; }</style><h1>Test listing</h1><p>${"Gemstone details ".repeat(500)}</p>`;
    const ebayInput = { sku: "TEST", title: "Test", description: longHtmlDescription, categoryId: "123", marketplaceId: "EBAY_US", price: 20, currency: "USD", quantity: 1, condition: "NEW", aspects: { "California Prop 65 Warning": [""], Color: [" Blue "] }, media: [] };
    const result = await ebay.createMarketplaceDraft("ebay-test", ebayInput);
    assert.equal(result.offerId, "test-offer");
    assert.equal(offerCreated, true);
    const verified = await ebay.getMarketplaceOffer("ebay-test", "test-offer");
    assert.equal(verified.status, "UNPUBLISHED");
    assert.equal(verified.listingId, null, "Unpublished offers do not have a published listing ID");
    offerCreated = false;
    await assert.rejects(ebay.createMarketplaceDraft("ebay-test", { ...ebayInput, draftSettings: { fulfillmentPolicyId: "wrong-shop" } }), /no longer available/);
    assert.equal(offerCreated, false, "Validate shop policies before remote draft creation");
    let draftCreated = false;
    globalThis.fetch = async (url, init) => {
      const path = String(url);
      if (path.endsWith("/shipping-profiles")) return Response.json({ count: 1, results: [{ shipping_profile_id: 123, title: "Worldwide shipping" }] });
      if (path.includes("/readiness-state-definitions?")) return Response.json({ count: 1, results: [{ readiness_state_id: 456, readiness_state: "ready_to_ship", min_processing_time: 1, max_processing_time: 3, processing_time_unit: "days" }] });
      if (path.endsWith("/shops/shop-test/listings?legacy=false")) {
        draftCreated = true;
        const form = new URLSearchParams(String(init?.body));
        assert.equal(form.get("shipping_profile_id"), "123");
        assert.equal(form.get("readiness_state_id"), "456");
        assert.equal(form.get("type"), "physical");
        assert.equal(form.get("tags"), "green gem,jewelry making");
        assert.equal(form.has("tags[]"), false);
        assert.equal(form.get("who_made"), "i_did");
        assert.equal(form.get("when_made"), "2020_2026");
        return Response.json({ listing_id: 789 });
      }
      if (path.endsWith("/listings/789/properties/200")) {
        const form = new URLSearchParams(String(init?.body));
        assert.equal(form.get("value_ids"), "10");
        assert.equal(form.get("values"), "Green");
        assert.equal(form.has("value_ids[]"), false);
        return Response.json({});
      }
      throw new Error(`Unexpected test request: ${path}`);
    };
    const etsy = new EtsyConnector();
    const etsyInput = { title: "Test", description: "Test", quantity: 1, price: 20, taxonomyId: "123", whoMade: "I_DID" as const, whenMade: "2020_2026", isSupply: false, tags: ["green gem", "jewelry making"], categoryAttributes: [{ propertyId: "200", valueId: "10", value: "Green" }], media: [] };
    const etsyDraft = await etsy.createMarketplaceDraft("etsy-test", "shop-test", etsyInput);
    assert.equal(etsyDraft.listingId, "789");
    assert.equal(draftCreated, true);
    assert.deepEqual(etsyDraft.warnings, []);
    draftCreated = false;
    await assert.rejects(etsy.createMarketplaceDraft("etsy-test", "shop-test", { ...etsyInput, draftSettings: { shippingProfileId: "wrong-shop" } }), /no longer available/);
    assert.equal(draftCreated, false);
    let failedCreates = 0;
    globalThis.fetch = async (url) => {
      const path = String(url);
      if (path.endsWith("/shipping-profiles")) return Response.json({ count: 1, results: [{ shipping_profile_id: 123, title: "Shipping" }] });
      if (path.includes("/readiness-state-definitions?")) return Response.json({ count: 1, results: [{ readiness_state_id: 456 }] });
      failedCreates += 1;
      return Response.json(["The processing profile is invalid."], { status: 400 });
    };
    await assert.rejects(etsy.createMarketplaceDraft("etsy-test", "shop-test", etsyInput), /Etsy draft creation failed \(HTTP 400\): The processing profile is invalid/);
    assert.equal(failedCreates, 1);
    globalThis.fetch = async (url) => {
      const path = String(url);
      if (path.endsWith("/shipping-profiles")) return Response.json({ count: 1, results: [{ shipping_profile_id: 123, title: "Shipping" }] });
      if (path.includes("/readiness-state-definitions?")) return Response.json({ count: 1, results: [{ readiness_state_id: 456 }] });
      failedCreates += 1;
      return Response.json({ error: "Temporary failure" }, { status: 500 });
    };
    await assert.rejects(etsy.createMarketplaceDraft("etsy-test", "shop-test", etsyInput), /HTTP 500/);
    assert.equal(failedCreates, 2, "Never automatically retry non-idempotent draft creation");
  } finally {
    prisma.marketplaceConnection.findUnique = originalFind;
    globalThis.fetch = originalFetch;
    for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
    Object.assign(process.env, originalEnv);
  }
  console.log("Marketplace draft settings regression tests passed.");
}

void main();
