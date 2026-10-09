import assert from "node:assert/strict";
import { buildEbayHtmlDescription } from "../../lib/ebay-description";
import { buildEbayInventoryDescription } from "../../lib/marketplace/ebay-description-payload";
import { areEtsyRequirementsCurrent, loadEtsyCategoryRequirements } from "../../lib/marketplace/etsy-requirements";

const html = buildEbayHtmlDescription({ itemName: "Blue & Green Zircon", category: "Loose Gemstone", gemType: "Zircon", notes: "Details ".repeat(1000) });
assert.ok(html.length > 4000);
const summary = buildEbayInventoryDescription(html, "Zircon");
assert.ok(summary.length > 0 && summary.length <= 4000);
assert.ok(!summary.includes("<style") && !summary.includes("font-family:"));
assert.ok(summary.includes("Blue & Green Zircon"));
assert.equal(buildEbayInventoryDescription("<style>CSS only</style>", "Fallback title"), "Fallback title");
assert.equal(buildEbayInventoryDescription("<p>Blue &amp; green &#39;gem&#39; &#x1f48e;</p>", "Fallback"), "Blue & green 'gem' 💎");
assert.equal(buildEbayInventoryDescription("a".repeat(3999) + "💎", "Fallback").length, 3999);

const scope = { shopId: "shop-a", taxonomyId: "gemstones" };
assert.equal(areEtsyRequirementsCurrent(scope, "shop-a", "gemstones"), true);
assert.equal(areEtsyRequirementsCurrent(scope, "shop-b", "gemstones"), false);
assert.equal(areEtsyRequirementsCurrent(scope, "shop-a", "bracelets"), false);
assert.equal(areEtsyRequirementsCurrent(null, "shop-a", "gemstones"), false);

async function main() {
  const category = { taxonomyId: "gemstones", name: "Gemstones", path: "Craft Supplies > Gemstones" };
  const options = { categories: [category], properties: [{ id: "craft", name: "Craft type", required: true, values: [{ id: "jewelry", name: "Jewelry making" }] }] };
  const requests: Array<{ shopId: string; etsyTaxonomyId?: string; inventoryId?: string }> = [];
  const fetcher: typeof fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    requests.push(body);
    return Response.json(body.etsyTaxonomyId ? options : { categories: [category], properties: [] });
  };
  const first = await loadEtsyCategoryRequirements<typeof options>(
    { shopId: "shop-a", taxonomyId: "", inventoryId: "item-a" }, (categories) => categories[0], undefined, fetcher
  );
  assert.equal(requests.length, 2);
  assert.equal(requests[0].etsyTaxonomyId, undefined);
  assert.equal(requests[1].etsyTaxonomyId, "gemstones");
  assert.equal(first.options.properties[0].name, "Craft type", "First load must also fetch required properties");
  assert.equal(areEtsyRequirementsCurrent({ shopId: "shop-a", taxonomyId: first.taxonomyId }, "shop-a", "gemstones"), true);
  const next = await loadEtsyCategoryRequirements<typeof options>(
    { shopId: "shop-a", taxonomyId: "gemstones", inventoryId: "item-b" }, () => null, undefined, fetcher
  );
  assert.equal(requests.length, 3, "Changing inventory refreshes current category without repeating category selection");
  assert.equal(requests[2].inventoryId, "item-b");
  assert.equal(next.options.properties[0].name, "Craft type");
  await assert.rejects(loadEtsyCategoryRequirements(
    { shopId: "shop-a", taxonomyId: "gemstones", inventoryId: "" }, () => null, undefined,
    async () => Response.json({ error: "Reconnect this shop" }, { status: 403 })
  ), /Reconnect this shop/);
  console.log("Marketplace description and Etsy requirements regression tests passed.");
}

void main();
