# Work Tracker — automatic marketplace workflow

Open **Marketplaces → Work Tracker**. Routine Start/Stop timers are no longer needed.

## How work is recorded

ERP work is recorded automatically while its tab is visible and focused. In listing preparation and draft review, the selected marketplace, product and shop supply the context: preparing an Etsy listing then switching to an eBay listing creates separate intervals automatically. Other ERP pages use their route context. Product/shop references are validated on the server. Five minutes without input removes the trailing inactive time. Closing, hiding or unfocusing the ERP stops collection; browser suspension gaps are discarded.

For work on external eBay, Etsy and Amazon websites, install the companion Chrome extension once. ERP pages are excluded by the extension because the ERP already records their richer context. External platform classification follows the active supported hostname; external activity defaults to Other because browsing a page does not prove listing creation. Correct classifications in ERP history when necessary.

Intervals synchronize with stable IDs and are merged without overlapping time being counted twice. Existing manual entries take precedence, then ERP context, then extension estimates. The page warns if an old manual timer is still open; close it once before relying on automatic attribution. Legacy manual APIs remain available, but routine manual timer controls are removed from this page.

## Chrome installation

1. In ERP Work Tracker > Connections, expand **Install or update the free extension** and download the ZIP. Extract it into a permanent folder. Developers can instead run `npm run build:work-tracker-extension` and use `extensions/work-tracker/dist`.
2. Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select the folder containing `manifest.json`. For updates, replace files in the same folder and choose **Reload**. Reload the ERP page after installing or updating.
3. Enter the extension ID in ERP and choose **Check this browser**. The ID is remembered locally. The extension verifies its saved access with ERP; a stored token alone does not count as a working connection.
4. If unconnected, enter a recognizable browser name and choose **Connect this browser**. ERP creates and transfers the credential without showing it. If already connected to this account, edit the browser name and choose **Save browser name**; this keeps the existing key. Legacy manually configured profiles recover their name from ERP without creating another key.
5. Pin the extension and choose **Enable automatic tracking** in its popup. Saved access lasts 90 days and may be revoked from ERP. A revoked or expired connection can reconnect only after tracking is paused and pending records have been resolved. Offline verification never creates replacement credentials.
6. **Browser access** lists this account's active keys and supports rename/revoke. A matching verified connection is marked **This browser**. Old revoked or expired keys are under **Previous access**. Multiple similarly named keys remain separate; rename the right key using its displayed access suffix, or revoke unused ones. A valid key is not proof that its browser is online. Last received activity in the source card is account-wide; the profile-specific upload timestamp appears after checking this browser.

If another account or ERP address is configured, use extension Settings to pause tracking, sync or export and clear pending records, then disconnect before switching. Exported records are for review; clearing permanently discards the unsent records and does not import them later. Revoke unused access in the old ERP account as well.

Only the active tab in a focused, non-minimized window counts. No form contents, screenshots, passwords, page titles or full URLs are collected. Recent intervals wait for the idle threshold plus 90 seconds before upload; allow about seven minutes with the default threshold. Sync now retries eligible queued records without bypassing that buffer and displays upload failures instead of a success message. Offline records retry safely; records older than seven days require export/review/clear. Changing environment/credential is blocked while old records are pending. Keep the local ERP server running for local uploads.

## Page guide

| Area | Meaning |
|---|---|
| Live header | Current automatic ERP context, today's synced time, local pending count and privacy pause. It is not an unsaved manual timer. |
| Date/platform/activity controls | Personal time for the selected inclusive date range, timezone and daily/weekly grouping. Weeks start Monday. |
| Marketplace cards and history graph | Real deduplicated work time by ERP/eBay/Etsy/Amazon. Empty history is shown honestly. |
| Order-value graph | Shop-wide imported order totals in the chosen original currency, shown only when each connected shop has a recent successful, zero-failure order sync and order amounts are complete. Otherwise it names stale shops and marks the value unavailable; imported rows alone never imply complete coverage. This is not personal earned revenue, net profit or a causal result of the tracked hours. Activity filters affect time only. Cancelled/refunded/failed/unpaid orders are excluded. |
| Activity breakdown | Deduplicated time by work category. External browser work initially uses Other. |
| History | Compact summary, one row per day, marketplace and activity, after overlap removal. Open **Inspect / correct intervals** to view 15 individual effective intervals per page and correct or delete an erroneous entry. The detail view does not add time to the summary. |
| Productivity | Confirmed publications and eligible linked work. Current publication evidence is limited to confirmed ERP eBay publications; Etsy/Amazon counts/rates are unavailable where reliable evidence is missing. |
| Targets | Daily/weekly platform goals and actual progress. Daily goals allow up to 1,440 minutes; weekly up to 10,080. |
| Chrome connection | Verify this Chrome profile, connect or rename it, and manage active and previous browser access. |

CSV export uses the displayed time summary. The report window is limited to 93 days. Historical filters do not change today's live total.

## Calculations and limitations

Average minutes per listing = eligible linked listing-work minutes / confirmed published listings. Listings/hour = confirmed published listings / eligible linked hours. Preparation and publishing time remain separate. A matching listing record or product/shop reference can link ERP work; an ambiguous listing or unlinked publication makes rates unavailable. A publication is counted once per verified shop/listing in tracker productivity. Synchronization/troubleshooting time is labeled activity, not a proven duration for a particular failed sync job.

ERP and extension activity are estimates. Long reading can become idle; discarded suspended intervals are not reconstructed. ERP idle threshold is currently five minutes; the extension threshold is configurable. Pending records are not included in synced totals. A marketplace switch is reflected after synchronization, not instantly in historical reports. Revenue remains company/shop-wide, separate from personal time. No combined foreign-currency total is invented.

Automated tests cover ingestion, validated ERP context, overlap priority, authentication/ownership, lifecycle compatibility, reporting boundaries and mocked Chrome focus/idle/retry behavior. An actual unpacked installation, host permission prompts and authenticated interactive acceptance in your Chrome profile still need verification. Deployment/migration and rollback details are in `docs/work-tracker.md` and the weekly BI deployment guide.
