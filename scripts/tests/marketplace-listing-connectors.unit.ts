import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as traffic from "@/lib/marketplace/ebay-traffic";
import * as scopes from "@/lib/marketplace/scopes";
import type { NormalizedListing } from "@/lib/marketplace/types";

async function main() {
  let grant: string | null = "https://api.ebay.com/oauth/api_scope";
  let trafficCalls = 0; let failTraffic = false; let detailCalls = 0;
  const dependencies: Record<string, unknown> = {
    "@/lib/marketplace/ebay-traffic": traffic,
    "@/lib/marketplace/scopes": scopes,
    "@/lib/marketplace/oauth": { loadTokens: async () => ({ scope: grant }) },
    "@/lib/marketplace/http": { bearerAuth: (token: string) => ({ Authorization: `Bearer ${token}` }), httpJson: async (url: string) => {
      trafficCalls++;
      const params = new URL(url).searchParams;
      assert.equal(params.get("dimension"), "LISTING");
      assert.match(params.get("filter")!, /listing_ids:\{111\}/);
      if (failTraffic) throw new Error("Access denied");
      return { header: { dimensionKeys: [{ key: "LISTING_ID" }], metrics: [{ key: "LISTING_VIEWS_TOTAL" }, { key: "LISTING_IMPRESSION_TOTAL" }] }, records: [{ dimensionValues: [{ value: "111" }], metricValues: [{ value: 0 }, { value: 22 }] }], startDate: "2026-10-03T00:00:00Z", endDate: "2026-11-01T00:00:00Z", lastUpdatedDate: "2026-11-02T00:00:00Z" };
    } },
  };
  type Connector = { getAccessToken: () => Promise<string>; callTradingApi: (call: string) => Promise<string>; fetchListings: (params: unknown, context: unknown) => Promise<NormalizedListing[]> };
  const exports: { EbayConnector?: new () => Connector } = {};
  const source = ts.transpileModule(readFileSync("lib/marketplace/connectors/ebay.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { exports, URLSearchParams, Buffer, process, console: { log: () => {} }, require: (name: string) => dependencies[name] || {} });
  const connector = new exports.EbayConnector!();
  connector.getAccessToken = async () => "token";
  connector.callTradingApi = async (call) => {
    if (call === "GetItem") { detailCalls++; return '<Item><PictureDetails><PictureURL>https://example.com/recovered.jpg</PictureURL></PictureDetails></Item>'; }
    return '<ActiveList><ItemArray><Item><ItemID>111</ItemID><Quantity>1</Quantity><WatchCount>4</WatchCount><CurrentPrice currencyID="INR">25</CurrentPrice></Item></ItemArray></ActiveList>';
  };
  const fetch = () => connector.fetchListings({}, { connectionId: "connection", externalShopId: "external", shopId: "shop", shopName: "Shop" });
  let items = await fetch();
  assert.equal(trafficCalls, 0, "Do not make unauthorized analytics requests");
  assert.match(items[0].details?.metricsWarning || "", /Reconnect/);
  assert.equal(items[0].images[0], "https://example.com/recovered.jpg");
  assert.equal(detailCalls, 1);
  grant = traffic.EBAY_ANALYTICS_SCOPE;
  items = await fetch();
  assert.equal(trafficCalls, 1, "One traffic request per page, not per listing");
  assert.equal(items[0].views, 0); assert.equal(items[0].details?.impressions, 22);
  assert.equal(items[0].favorites, 4); assert.equal(items[0].currency, "INR");
  assert.equal(items[0].details?.metricsWarning, null);
  failTraffic = true;
  items = await fetch();
  assert.equal(items.length, 1, "A failed optional analytics call must not discard the active feed");
  assert.match(items[0].details?.metricsWarning || "", /unavailable/);
  console.log("Marketplace listing connector enrichment tests passed.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
