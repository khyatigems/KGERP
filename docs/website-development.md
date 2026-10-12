# Website module — development milestone

## Isolation

Restart the local ERP development server after configuration changes, then open /website-management. Website records use a separate database through `lib/website/store.ts`. No migrations were added to the ERP migration directory; no ERP schema, marketplace pricing engine, inventory writes, existing payment handler or email send flow was modified. The Website sidebar entry is visible to users with settings management permission. Only the new WEBSITE_MANAGEMENT_ENABLED and WEBSITE_DATABASE_URL keys were appended to the ignored local .env.local; all existing ERP configuration values were preserved. The local module uses tmp/website-development/management.db. Hosted configuration has not been changed.

Module flags (configure in staging, not in the current production environment):

```
WEBSITE_MANAGEMENT_ENABLED=true
WEBSITE_DATABASE_URL=file:./tmp/website-development/catalogue.db
WEBSITE_FEED_TOKEN=<random server-only token of at least 32 characters>
```

The dedicated connection must never point to the ERP database. Runtime code performs no schema creation. The local migrator accepts only a database inside `tmp/website-development`, backs up an existing file, rejects non-additive SQL, uses a transaction, verifies migration checksums and is repeatable. It does not load `.env` files. For remote staging/production, prepare a separate database, a provider-consistent backup and an explicitly scoped transactional deployment procedure; the local migration script deliberately cannot migrate remote databases.

```
$env:WEBSITE_DATABASE_URL='file:./tmp/website-development/catalogue.db'
node scripts/website/migrate.mjs
```

## Features delivered

Opt-in `/website-management` and authenticated management API for draft products, collections, scheduled percentage offers, banners, announcement messages and prepaid retail checkout settings. Existing settings permission controls management. Inventory import additionally requires cost-view permission and reads an exact SKU without mapping inventory names, categories, collections or selling price. Staff select website terminology and enter website price.

Listing creation now lives at /marketplace-create-listings?marketplace=WEBSITE with native marketplace Website and shop KhyatiGems. It reuses the inventory picker, reads facts and purchase cost, verifies inventory eligibility when publishing, and provides separate website categories, content generation, SEO fields, charges and volume tier rows. Website Management Products contains listed records with activate/deactivate/remove and collection controls. Collection editing and product assignment synchronize both membership views transactionally. Removal preserves audit history and ERP inventory. Live reservations remain pending.

Website pricing supports flat, purchase-cost percentage and sale-price percentage charges; offers/tier changes are checked against the website floor in the same transaction. Independent offers do not stack together; the feed chooses the lowest eligible automatic price, respecting each offer's volume-stacking flag. Coupon redemption, per-customer limits and order-level bundles are not implemented yet.

Bearer-protected catalogue returns published records and excludes cost, internal inventory ID, charges and earnings. Website `/api/catalogue` proxies it using server-only credentials. The storefront includes shop, collection, search, product and cart pages. Checkout is explicitly disabled. No shipping or tax-inclusive final payable amount is promised.

The separate email-template installer has been removed. Website Management links to existing ERP email templates. Checkout settings require customer email; actual checkout contact validation and automatic order-email triggers remain pending with the order flow. Existing email services and templates are unchanged.

## Razorpay test order ledger

The local website-only migration `002-orders` adds a separate WebsiteOrder table. `/api/website/orders` accepts a server-to-server bearer token for pending and payment-confirmed Razorpay Test Mode records; the authenticated Website Management Orders view displays recent orders and customer delivery details. This ledger is not an ERP sales invoice and does not reserve or decrement inventory. Razorpay credentials remain in the storefront server environment. Set the same random `WEBSITE_FEED_TOKEN` on the ERP and storefront; use a separate staging WEBSITE_DATABASE_URL. The Vercel Preview storefront requires HTTPS URLs for both catalogue and order endpoints. Do not point this ledger at the ERP database or enable live payments.

## Remaining implementation

1. Product-fact mapping review, polished editor controls, schedule previews and all-category numeric filters.
2. Live availability reconciliation/reservations and safe ERP order/invoice allocation, backed by staging tests.
3. Razorpay live-mode activation; international activation; destination shipping/tax calculation; cancellation/refunds.
4. Shiprocket integration and transactional email event queue.
5. Homepage banner/announcement placement, existing collection-page migration and navigation activation.
6. Server-rendered product/collection URLs and metadata, structured data, feed/sitemap, redirects and approved policy changes. New shopping pages remain `noindex` until this is ready.
7. ERP staging UI verification, production backup/deployment validation and pilot launch.

## Checks

Run pure pricing and marketplace regression tests without importing ERP auth/database modules. Run store integration tests only against the explicitly isolated local website database. Do not launch the ERP with its current environment for tests: existing dashboard schema helpers may modify the configured shared database. TypeScript checks need no database connection.

## Website Create Listing refinement

The Website inventory picker uses a dedicated read-only search route with the existing buildReadyToSellWhere rules (IN_STOCK, image, certificate number, description and HSN) and excludes every non-deleted website product, including drafts and paused listings. Listing save and activation recheck eligibility. Public website categories/collections remain independent; gemstone variety now comes from inventory gemType, gemstone-code name or stoneType. Material is optional.

Content is generated automatically on inventory selection and can be regenerated from reviewed attributes. Website slugs regenerate with the product title and are verified on save. The HTML description reuses the same inventory-driven builder and saved branding settings as eBay, read without changing ERP settings. Certificate identifiers are not passed to the builder. Stored HTML is sanitized; previews and storefront display use a sandboxed frame. Plain product summaries remain available for search and SEO.

MSP loads the same active default pricing profile as Marketplace Create Listings (first active profile fallback), with resolvePurchaseCost and enabled charges. Flat fees add their amount; percentage fees use purchase cost, matching the shared ERP engine. The server reloads cost and fees on save/activation. Profile charges are shown as a read-only breakdown; website retail price remains independent.

Listings permit at most 14 photographs and 1 video. The editor shows inventory/website-library thumbnails, inclusion switches and main-photo selection. New website uploads use the configured Cloudinary helper and isolated WebsiteRecord media entries; they do not write Inventory or InventoryMedia. Images accept JPG/PNG/WebP (10 MB) and are decoded/normalized; MP4 video accepts 25 MB. The listing schema enforces counts independently of the browser.

Volume tiers are optional same-SKU quantity thresholds with an INR price per piece. The highest qualifying threshold applies; cross-SKU purchases do not qualify. The editor shows minimum quantity, per-piece price, product total and estimated earning, with a remove control. Single-piece listings cannot add tiers. Save rejects duplicate thresholds, thresholds above available quantity and increasing volume prices. Offers stack only when explicitly configured.

Validation: isolated React browser fixtures cover selection, saved variety, generation, slug updates, thumbnail limits, volume totals, MSP, publish payload and mobile width. Pure tests verify HTML sanitization, content and pricing parity with the shared engine. Full ERP UI/live inventory and Cloudinary uploads have not been exercised against production.

## Website presentation controls

Dedicated editors replace generic field rendering. Collection slugs are generated from titles on both client and server (duplicate URLs rejected). Plain text or manually pasted HTML is supported, with safe HTML storage, preview, thumbnail upload, alt text, SEO and product assignment. Product-description HTML is now image-free; legacy descriptions are cleaned on read without rewriting existing rows. The description label is Product description (HTML).

Banners explicitly target hero, homepage-feature (below curated collections) or shop-top. Hero controls include existing homepage assets, uploaded image/video, poster/mobile image, copy, CTA links, order, duration, transition, split/full video layout, visibility and schedules. When no hero records are active, original website slides remain. Existing homepage video is selected by its site-relative asset URL, so it need not be uploaded again. ERP asset previews use NEXT_PUBLIC_WEBSITE_URL or the existing site's canonical https://www.khyatigems.com origin.

Announcement bars support messages per line, static/marquee/fade/slide, direction, scroll/rotation timing, brand/system fonts, size/weight, hex colours, padding, alignment, hover/focus pause, dismissal, sticky positioning, optional icon upload, device controls, priority and scheduling. Dates entered locally are stored as UTC ISO times. The storefront checks cached expiry each second and reloads scheduled content every minute.

Offers can target products, collections or all products, specify minimum same-SKU quantity, choose volume stacking, schedule an automatic percentage discount and show optional artwork/text on the Shop catalogue. Collection changes validate applicable offer floors inside the existing website transaction. Coupon redemption remains outside this milestone.

Checkout is still disabled for orders/payments. Its settings and disabled preview include logo/banner upload, brand styling, contact/address/invoice requirements, countries, support details, dispatch/shipping/tax copy and policy links. Razorpay/prepaid/email/terms requirements remain fixed. Existing ERP email templates/services are reused.

Content uploads use the existing Cloudinary helper with isolated WebsiteRecord media/audit entries; no ERP inventory or media record is written. All added fields are JSON payload additions with backward-compatible schema defaults, so no new ERP or website table migration was required. No production database migration or Cloudinary upload was executed during development.

Tests: website-management.browser.cjs uses isolated HTTP fixtures for collection HTML/slug/upload, offer scope, hero video, announcement styling/IST timing and checkout fields. website-presentation.unit.ts validates safe HTML, media-free product descriptions, scheduling/style boundaries and offer scope. website-store.integration.ts checks collection-offer floor rollback in an explicit local website database. Website qa/website-presentation.cjs checks the actual storefront scripts against fixtures, including schedule expiry, original hero fallback and checkout disabled state.
