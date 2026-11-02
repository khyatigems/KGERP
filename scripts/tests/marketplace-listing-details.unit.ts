import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { listingSyncMetadata, marketplaceImageUrl, readListingDetails } from "@/lib/marketplace/listing-details";
import { priceObservations } from "@/lib/marketplace/price-history";
import { ebayTrafficQuery, parseEbayTraffic } from "@/lib/marketplace/ebay-traffic";
import { parseEbayActiveListings } from "@/lib/marketplace/connectors/ebay";
import { normalizeEtsyListing } from "@/lib/marketplace/connectors/etsy";

const xml = '<PictureDetails><GalleryURL>https://i.ebayimg.com/photo.jpg?a=1&amp;b=2</GalleryURL><PictureURL><![CDATA[https://i.ebayimg.com/second.jpg]]></PictureURL></PictureDetails>';
for (const raw of [xml, JSON.stringify(xml)]) assert.deepEqual(readListingDetails(raw).images, ["https://i.ebayimg.com/photo.jpg?a=1&b=2", "https://i.ebayimg.com/second.jpg"]);
assert.deepEqual(readListingDetails('{"Images":[{"url_fullxfull":"https://example.com/etsy.jpg"}]}').images, ["https://example.com/etsy.jpg"]);
assert.deepEqual(readListingDetails('{"images":["https://example.com/one.jpg"]}').images, ["https://example.com/one.jpg"]);
assert.deepEqual(readListingDetails("invalid").images, []);
assert.equal(marketplaceImageUrl("javascript:alert(1)"), null);
assert.equal(marketplaceImageUrl("//unsafe/path"), null);

const ebay = parseEbayActiveListings(`<ActiveList><ItemArray><Item><ItemID>111</ItemID><Quantity>5</Quantity><SellingStatus><QuantitySold>2</QuantitySold><CurrentPrice currencyID="GBP">18.50</CurrentPrice></SellingStatus><WatchCount>0</WatchCount>${xml}<StartTime>2026-10-01T00:00:00Z</StartTime></Item></ItemArray></ActiveList>`)[0];
assert.equal(ebay.price, 18.5);
assert.equal(ebay.currency, "GBP", "Do not silently relabel non-USD listings");
assert.equal(ebay.favorites, 0);
assert.equal(ebay.orders, 2);
assert.equal(ebay.quantity, 3);
assert.equal(ebay.images.length, 2);
assert.equal(ebay.views, null, "Deprecated hit counts are not current views");
const saved = listingSyncMetadata(ebay, null);
assert.equal(readListingDetails(saved).images.length, 2);
assert.equal(readListingDetails(listingSyncMetadata({ ...ebay, images: [] }, saved)).images.length, 2, "A sparse response must not erase saved photos");
const savedMetrics = listingSyncMetadata({ ...ebay, details: { viewsPeriod: "October 1–30", metricsUpdatedAt: "2026-10-31T00:00:00Z" } }, null);
const stale = readListingDetails(listingSyncMetadata({ ...ebay, details: { viewsPeriod: "Last 30 completed days", metricsWarning: "Traffic unavailable." } }, savedMetrics));
assert.equal(stale.viewsPeriod, "October 1–30", "Retained metrics retain their actual report window");
assert.match(stale.metricsWarning || "", /last saved/);
const etsy = normalizeEtsyListing({ listing_id: 123, views: 0, num_favorers: 0, price: { amount: 1825, divisor: 100, currency_code: "EUR" }, tags: ["ruby"], has_variations: true, ending_timestamp: 1800000000 });
assert.equal(etsy.price, 18.25); assert.equal(etsy.currency, "EUR");
assert.equal(etsy.views, 0); assert.equal(etsy.favorites, 0);
assert.equal(etsy.orders, null, "Do not confuse Etsy shop sales with listing sales");
assert.deepEqual(readListingDetails(listingSyncMetadata(etsy, null)).tags, ["ruby"]);

const now = new Date("2026-11-02T00:00:00Z");
const base = { previous: { price: 100, currency: "USD", observedAt: new Date("2026-10-01T00:00:00Z") }, price: 80, currency: "USD", source: "ETSY_SYNC", now };
const changes = priceObservations(base);
assert.deepEqual(changes.map((entry) => entry.price), [100, 80], "Keep the pre-sync baseline for legacy listings without history");
assert.ok(changes[0].changedAt < changes[1].changedAt);
assert.equal(changes[0].changedBy, "ETSY_SYNC_BASELINE");
assert.deepEqual(priceObservations({ ...base, previous: { ...base.previous, price: 80 }, latest: { price: 80, currency: "USD" } }), [], "Identical syncs do not duplicate history");
assert.deepEqual(priceObservations({ ...base, latest: { price: 100, currency: "USD" }, price: null }), [], "An unavailable price is not zero");
assert.deepEqual(priceObservations({ ...base, latest: { price: 100, currency: "USD" }, price: 0 }).map((entry) => entry.price), [0]);
assert.equal(priceObservations({ ...base, latest: { price: 100, currency: "USD" }, price: 100, currency: "EUR" })[0].currency, "EUR");

const query = ebayTrafficQuery(["111", "222"], now);
assert.equal(query.get("filter"), "listing_ids:{111|222},date_range:[2026-10-03T00:00:00.000+00:00..2026-11-01T23:59:59.000+00:00]");
const metrics = parseEbayTraffic({ header: { dimensionKeys: [{ key: "LISTING_ID" }], metrics: [{ key: "LISTING_IMPRESSION_TOTAL" }, { key: "LISTING_VIEWS_TOTAL" }] }, records: [ { dimensionValues: [{ value: "111" }], metricValues: [{ value: 20 }, { value: 0, applicable: true }] }, { dimensionValues: [{ value: "222" }], metricValues: [{ value: 9, applicable: false }, { value: "" }] } ] });
assert.deepEqual(metrics.get("111"), { views: 0, impressions: 20 });
assert.deepEqual(metrics.get("222"), { views: null, impressions: null });

async function testHistoryRoute() {
  let allowed = false; let exists = true; let queried = false;
  const dependencies: Record<string, unknown> = {
    "next/server": { NextResponse: Response },
    "@/lib/permission-guard": { checkPermission: async () => ({ success: allowed }) },
    "@/lib/permissions": { PERMISSIONS: { LISTINGS_VIEW: "view" } },
    "@/lib/marketplace-foundation": { ensureMarketplaceFoundationSchema: async () => {} },
    "@/lib/prisma": { prisma: { listing: { findUnique: async () => exists ? { marketplaceShopId: "shop", currency: "USD" } : null }, listingPriceHistory: { findMany: async (args: { where: { listingId: string } }) => { queried = true; assert.equal(args.where.listingId, "listing"); return [{ price: 80, currency: "USD" }]; } } } },
  };
  const source = ts.transpileModule(readFileSync("app/api/marketplace/listings/[id]/price-history/route.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports: { GET?: (req: unknown, context: unknown) => Promise<Response> } = {};
  vm.runInNewContext(source, { exports, require: (name: string) => { assert.ok(name in dependencies, name); return dependencies[name]; } });
  const request = () => exports.GET!(null, { params: Promise.resolve({ id: "listing" }) });
  assert.equal((await request()).status, 403); assert.equal(queried, false);
  allowed = true; exists = false; assert.equal((await request()).status, 404);
  exists = true; const response = await request();
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal((await response.json()).history[0].price, 80);
}
testHistoryRoute().then(() => console.log("Marketplace listing details and price history tests passed.")).catch((error) => { console.error(error); process.exitCode = 1; });
