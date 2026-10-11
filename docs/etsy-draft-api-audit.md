# Etsy draft API audit — 11 October 2026

The earlier bare HTTP 400 does not identify the rejected field: the HTTP error parser discarded array and plain-text response bodies. The exact historical rejection cannot be recovered from that message.

Corrected request defects:

- Serialize `tags`, `value_ids`, and `values` using Etsy's unbracketed, comma-separated form fields. Bracketed names such as `tags[]` were used previously.
- Use `legacy=false` when creating a listing with `readiness_state_id`, following Etsy's processing-profile migration documentation.
- Replace unsupported `2000_2009` and `before_1960` date options with Etsy's accepted date ranges.
- Validate titles, tag characters, supported dates, and the rounded converted price before creating a remote draft. Normalize titles to NFC.
- Start photo ranks at 1.
- Disable automatic retries for draft creation, which is not idempotent.
- Preserve array/string marketplace errors and identify failures at the draft-creation stage.

Existing safeguards reviewed: connected-shop write permission, current shipping/processing profile membership, current taxonomy and required properties, current shop section, inventory eligibility, attached media selection, certificate privacy, existing draft detection, and shop-currency conversion. Category and media upload failures remain warnings attached to the successfully created draft, rather than pretending draft creation failed.

Verification: mocked connector requests cover required physical-listing fields, processing-profile query, tag/property encoding, rejection detail, and no automatic retry. Shared validation tests cover rejected dates, unsupported title/tag characters, and a price rounding to zero. These are contract tests; they do not prove a live Etsy draft was created.

The hosted site requires a deployment of these changes before its behavior changes. No new production listing was created during this audit; the browser form retained from the previous investigation did not contain the user's failing submission details.

Sources:

- https://developers.etsy.com/documentation/reference/
- https://developer.etsy.com/documentation/tutorials/migration/
- https://github.com/etsy/open-api/discussions/780


## Eligibility and plain-text descriptions

The Etsy form previously allowed a modern item made by another company to be sent with `is_supply=false`. For loose stones supplied for jewelry making, select Supply or tool; selecting the loose gemstone product type now defaults this classification. Both the form and server/connector reject the inconsistent modern resale combination before creating a marketplace draft. Actual maker and age remain unchanged. This validation is not a guarantee of Etsy policy approval for every product.

Existing inventory descriptions are normalized from Markdown on load and again at the connector boundary. Generated descriptions also use plain-text headings and bullets. Inventory records are not rewritten by opening the form.

The Etsy creation form supports multiple JPEG/PNG/WebP uploads (4 MB each), saved as inventory media. Uploaded photos are selected for the draft; uncheck photos to exclude them without deleting inventory assets. Saving is disabled during upload. The authenticated media endpoint verifies inventory-edit permission, an in-stock inventory item, and a connected Etsy shop before accepting an upload.

Validation: Etsy eligibility and plain-text regression tests, marketplace description/settings/HTTP regressions, eBay image/batch regressions, TypeScript and targeted ESLint. Live Etsy acceptance requires deployment and a new explicit draft save; these changes do not publish listings.


## Custom category values and draft repair

`updateListingProperty` requires `value_ids` even when a text/numeric attribute has no predefined taxonomy value ID. Serialize a present empty `value_ids=` for custom values, alongside `values`; use the actual Etsy ID for predefined choices. Never fabricate ID 0. Attribute warnings now include the name/property ID.

Saved Etsy drafts with attribute warnings expose Retry Etsy attributes. This uses saved ERP attributes and the existing external listing ID, checks Etsy still reports state=draft, and only updates properties. It never recreates the draft, reuploads photos, or publishes. Media warnings remain until separately addressed. A post-create attribute-check failure preserves the newly created listing ID and records a warning.
