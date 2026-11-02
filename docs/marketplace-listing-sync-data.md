# Marketplace listing data and price history

The marketplace listings table now displays saved photos, views, favorites/watchers, eBay impressions, eBay sold quantity, and expandable category, listing type, dates, Etsy tags and variation details. Excel/PDF exports include engagement metrics, their view period, the previous price, image URL, category and price observation time.

## Images

Older eBay syncs JSON-encoded the source XML; the previous reader searched that JSON string as if it were plain XML. The reader now accepts both formats, Etsy image associations, and normalized `_listing` metadata. Each sync stores normalized photo URLs in the database alongside the original response. Sparse responses preserve saved photos. Missing images trigger the official marketplace image/detail endpoint, with at most four concurrent image requests. The table falls back through the saved marketplace photos and linked ERP photos if a URL fails to load.

## API capabilities and permissions

| Data | eBay | Etsy |
| --- | --- | --- |
| Price, currency, available quantity, title, SKU, state, URL | Active listing feed | Active listing feed |
| Photos | Active feed; `GetItem` picture fallback | `Images` association; listing images fallback |
| Favorites/watchers | `WatchCount`; omitted count means zero in `GetMyeBaySelling` | `num_favorers` (including zero) |
| Views | Sell Analytics `LISTING_VIEWS_TOTAL` | Listing `views`; daily tabulation for active listings |
| Impressions | Sell Analytics `LISTING_IMPRESSION_TOTAL` | Not exposed by the listing endpoint |
| Sold quantity | `SellingStatus.QuantitySold`, units rather than order count | Not exposed by the listing endpoint |
| Category, listing dates/type | Fields returned by active feed | Taxonomy ID, original creation/update/expiry dates, type |
| Tags, variation flag | Not normalized from the summary feed | `tags`, `has_variations` |

eBay Analytics uses one batch request per listings page for the last 30 completed UTC days. The actual returned date range and data update time are saved and shown. It requires `https://api.ebay.com/oauth/api_scope/sell.analytics.readonly`, now included in new OAuth authorization requests. Existing connections without that permission show a reconnect message. Analytics errors do not discard successfully fetched listings; the table identifies unavailable or retained metrics. The deprecated Trading `HitCount` is not used as a modern view count. Etsy zero is retained as supplied by the API, including its documented daily-tabulation caveat. Unavailable data is displayed as a dash.

## Price records

The existing `ListingPriceHistory` table is retained, with an additive nullable `currency` column. Sync uses a nested database write so the listing and its price records succeed or fail together. A listing with no history first records its saved pre-sync price (source suffixed `_BASELINE`), then the new price. Repeated observations of an unchanged amount/currency add no record. Missing prices never become a zero price. Sync sources distinguish `EBAY_SYNC` and `ETSY_SYNC`. ERP edit and extension update paths also record history synchronously with the listing update.

The table shows the previous price, direction, absolute/percentage difference, and when the price was observed. Its history dialog loads all recorded entries through a permission-checked, non-cached endpoint. New records include currency; historical rows with unknown currency are explicitly labeled as assumed from the current listing. Different currencies are not compared as an increase/decrease.

Observation time is when ERP learned the price, not necessarily the exact marketplace edit time. Changes made and reversed between syncs, and prices never previously captured, cannot be reconstructed from the current-price API. No invented price records are backfilled.

### Legacy source-label correction

The older shared listing-sync implementation hard-coded `EBAY_SYNC` and `EBAY_SYNC_INITIAL` even for Etsy listings. Correcting the writer does not rewrite those existing history entries, and an unchanged price intentionally does not create a replacement observation. Migration `20261102010000_correct_etsy_price_history_sources` changes those two legacy labels to their `ETSY_` equivalents only when both the listing and its linked shop are Etsy. Genuine eBay observations, user edits, extension edits and ambiguous/unlinked records are preserved. Prices, timestamps and listing associations are untouched.

For an already-running database, `npm run repair:marketplace-price-history-sources` previews eligible records. Add `-- --apply` to save a JSON backup under `tmp/price-history-source-repair` and update the labels in a transaction with checks that prices and timestamps remain unchanged. The repair and migration are idempotent. Run `npm run test:marketplace-price-history-sources` for the isolated migration regression test.

## Deployment and verification

Apply the additive `20261102000000_listing_price_history_currency` migration through the normal safe migration workflow. The existing marketplace foundation schema check also ensures the nullable currency column for installations using runtime schema checks. Regenerate Prisma with `node scripts/prisma-generate.mjs`. Run a listings sync after deploying to populate the new metrics/details; reconnect eBay shops when the permission message appears. Previously saved images can display immediately.

Run `npm run test:marketplace-listing-details` for normalization, connector enrichment, history authorization, isolated SQLite persistence/rollback and isolated browser checks. The browser test uses the real listings page/components with fixture data and produces desktop/mobile and history-dialog screenshots in `tmp/marketplace-listings-review`. It does not change the connected database or marketplace listings.

Sources checked November 2, 2026:

- [eBay active listings / GetMyeBaySelling](https://developer.ebay.com/devzone/xml/docs/reference/ebay/GetMyeBaySelling.html)
- [eBay GetItem and deprecated HitCount](https://developer.ebay.com/devzone/xml/docs/Reference/ebay/GetItem.html)
- [eBay traffic report metrics, dimensions and filters](https://developer.ebay.com/api-docs/sell/static/performance/traffic-report.html)
- [eBay official Analytics OpenAPI specification](https://developer.ebay.com/api-docs/master/sell/analytics/openapi/3/sell_analytics_v1_oas3.json)
- [Etsy official OpenAPI specification](https://www.etsy.com/openapi/generated/oas/3.0.0.json)
