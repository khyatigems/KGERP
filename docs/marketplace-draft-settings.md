# Marketplace draft settings

## eBay offers and Seller Hub drafts

The old eBay implementation called Inventory API `createOffer`, whose ID is
an unpublished offer ID rather than a Seller Hub draft. New saves preserve the
complete ERP draft. Review complete listing in ERP lets the seller edit title,
description, price, quantity, specifics and policies, choose or create an actual
dispatch location, then prepare an unpublished Inventory API offer. Read-back
verifies every supplied specific, all three policy IDs, full static HTML,
photos/videos, title, SKU, category, condition, GTC format, price/quantity and
location key. Single-item publishing requires the verified revision and SKU
confirmation, with a copy button beside the SKU. Batch publishing selects up to
25 saved drafts, verifies them individually, shows their current titles, shops,
prices, quantities, photo/specific counts and dispatch locations, then requires
one explicit confirmation for the verified group. Items with unsaved review
edits cannot be processed in bulk. Failed items are excluded from publishing;
results stay visible until dismissed. Stop finishes the current request and
leaves remaining items untouched. It changes the ERP listing to ACTIVE only after eBay returns a
listing ID or a later status check confirms publication. POST creation and
publication are never automatically retried. Interrupted publications must be
reconciled; definite validation failures require re-preparation.

The optional basic Seller Hub transfer uploads a Draft CSV through Sell Feed
API `FX_DRAFT`; it is a separate, incomplete draft and is not the full review
workflow. Etsy uses its own draft endpoint. Do not publish both copies.

Reviews can upload JPEG/PNG/WebP photos (4 MB each, minimum 500 pixels on the
longest side), add existing inventory photos, exclude selected media and choose
the main photo. Uploads are scoped to authenticated editable drafts and stored
against the inventory. Photos are decoded, oriented, resized within 2400 pixels,
converted to JPEG and hosted securely. Media edits invalidate readiness; only
inventory-attached media can be prepared, with at most 24 photos and one video.
Read-back also verifies photo order and the absence of removed photos.

The HTML sanitizer preserves static layout properties, including flex wrapping,
spacing, backgrounds, borders, image sizing, shadows and pre-line specifications,
while continuing to reject scripts, events and unsafe CSS/URLs. Existing drafts
whose descriptions previously lost styling can explicitly rebuild the template
from inventory and selected photos, preview it, then verify it. This replaces
description text only when the seller clicks Rebuild; live listings are not
automatically revised. Desktop (1100 px) and mobile (390 px) fixture renders were
checked for preserved formatting and no horizontal overflow.

Uploads are asynchronous. The ERP shows processing until the task completes,
then requires successCount=1, failureCount=0, and a successful result row with
a DraftID before claiming creation. The returned edit link opens the draft in
Seller Hub. Old API offers retain their offer ID and can be transferred using
Send to Seller Hub; they are not published or deleted during transfer.

The Draft template supports title, SKU, category, price, quantity, condition,
HTML description, and photo URLs. Policies, item specifics, and videos remain
in the ERP for reference and require review in Seller Hub. Only eBay US/USD
is currently supported. The Country header is IN for this ERP's Indian seller.
If an upload fails, Download draft CSV can be used in Seller Hub Reports >
Uploads. Download upload result provides the complete returned CSV report.

The operational feed type was confirmed by production testing on 11 October
2026: task-42-13333736577 returned COMPLETED, successCount=1, failureCount=0,
and Seller Hub DraftID 5387189153310 for KGLGZIRVLT130000287. The successful
report did not echo a title; imported field contents could not be visually
verified because the browser login was unavailable. Review the draft before
publishing. No publish endpoint was called.

The earlier bare Action CSV test failed with zero successes. Adding the site,
country, currency, schema/encoding context and complete Draft column layout
produced the confirmed result. No failed upload is automatically resubmitted.
Task IDs are persisted before upload and concurrent submission is guarded by
an atomic metadata comparison. Only generated Action=Draft rows are uploaded.

Saved eBay rows provide a read-only **Check eBay offer** action using `getOffer`,
which reports the remote status, API environment, and any published listing ID.
For local diagnostics, run `npx tsx scripts/check-ebay-offer.ts <offerId>`.

Reference: https://developer.ebay.com/api-docs/sell/inventory/overview.html
Seller Hub draft fields: https://pages.ebay.com/sh/reports/help/uploadable-file-feeds/
Feed workflow: https://developer.ebay.com/api-docs/sell/static/feed/fx-feeds-overview.html

Create Listing loads settings automatically when a connected shop is selected.
The authenticated `shopSettings` action in `/api/marketplace/listing-preparation`
returns named choices and preselected IDs. Users can reload these settings after
changing policies or profiles in the marketplace.

For eBay, the connector loads fulfillment, payment, and return policies for
`EBAY_US`. It checks `GetUserPreferences` with `ShowSellerProfilePreferences`
for the seller's default profiles in category group `ALL`, and matches those
IDs against the Account API policies. Vehicle-only policies are excluded.
A single available policy is selected automatically even if eBay omits its
REST default flag. Multiple policies without a matching default require a choice.

For Etsy, the connector loads the shop's shipping profiles and processing
profiles (`readiness-state-definitions`). A single available profile is selected
automatically. Multiple profiles require a choice. Physical draft requests include
both `shipping_profile_id` and `readiness_state_id`.

Both connectors fetch the current settings again before creating a draft and
validate selected IDs against the chosen shop. Missing or deleted settings produce
a specific validation message before any remote draft is created. Selected IDs
are saved in `marketplaceDraft.draftSettings` in the ERP draft metadata.

The ERP uses existing marketplace settings. If the marketplace returns no
required policy or profile, the user must configure it there and reload.

Run `npm run test:marketplace-draft-settings` for mocked API regression tests.
These tests do not connect to seller accounts or create live marketplace drafts.
# Seller Hub draft field audit (2026-10-11)

User screenshots of draft 5387189153310 confirm title, SKU, category, photo,
price, quantity, condition and HTML imported. Item specifics and payment policy
are blank; the location shows United States despite the CSV Country=IN context.
Do not treat the context header or task success as proof of location or policy
import. The official draft template documents only 11 basic columns and warns
that additional columns are not guaranteed to import:
https://pages.ebay.com/sh/reports/help/uploadable-file-feeds/

The stored description contains one event handler (no script elements), which
explains why eBay reports JavaScript active content.
The handler came from lib/ebay-description.ts product-image onerror; it has also
been removed at the generator source for newly prepared descriptions. Both offer and draft exports
now use a parsed allowlist sanitizer to remove event handlers, scripts, embedded
active content and unsafe URLs/CSS. Original ERP descriptions are preserved.
The saved-draft UI offers a clean HTML download for repairing existing drafts.
This does not update an already-created eBay draft automatically.

Full field transfer to Seller Hub remains unsupported through this basic template.
Do not claim this is a ready-to-publish draft or add unsupported columns and
interpret task success as field verification. A full API listing workflow would
uses the implemented explicit Publish action after ERP review; creation of an
active listing is not equivalent to saving a draft. No active listing was created
during implementation verification.

Live verification on 2026-10-11 updated existing unpublished offer 305937640011
for KGLGZIRVLT130000287. eBay read-back matched all 21 entered item specifics,
one photo, full static description, title/price/quantity/condition/category, all
three saved policies and enabled dispatch location in India, postal code 122001,
city Kpmg (provided by the user). Earlier drafts stored selected policies under
marketplaceDraft.draftSettings; the full workflow preserves that legacy selection
instead of guessing among multiple payment policies. The separate Seller Hub
draft 5387189153310 is unchanged.
