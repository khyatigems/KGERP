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
