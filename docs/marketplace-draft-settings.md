# Marketplace draft settings

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
