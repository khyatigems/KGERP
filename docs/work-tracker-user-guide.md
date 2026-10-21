# Work Tracker — automatic marketplace workflow

Open **Marketplaces → Work Tracker**. Routine Start/Stop timers are no longer needed.

## How work is recorded

ERP work is recorded automatically while its tab is visible and focused. In listing preparation and draft review, the selected marketplace, product and shop supply the context: preparing an Etsy listing then switching to an eBay listing creates separate intervals automatically. Other ERP pages use their route context. Product/shop references are validated on the server. Five minutes without input removes the trailing inactive time. Closing, hiding or unfocusing the ERP stops collection; browser suspension gaps are discarded.

For work on external eBay, Etsy and Amazon websites, install the companion Chrome extension once. ERP pages are excluded by the extension because the ERP already records their richer context. External platform classification follows the active supported hostname; external activity defaults to Other because browsing a page does not prove listing creation. Correct classifications in ERP history when necessary.

Intervals synchronize with stable IDs and are merged without overlapping time being counted twice. Existing manual entries take precedence, then ERP context, then extension estimates. The page warns if an old manual timer is still open; close it once before relying on automatic attribution. Legacy manual APIs remain available, but routine manual timer controls are removed from this page.

## Chrome installation

1. Run `npm run build:work-tracker-extension`. In Chrome open `chrome://extensions`, enable Developer mode, click Load unpacked and select `extensions/work-tracker/dist`. Reload the extension after rebuilding.
2. In ERP Work Tracker → Chrome connection, create a personal credential and copy it. Tokens are displayed once, expire after 90 days and can be revoked. They permit only activity uploads, never marketplace OAuth access or report downloads.
3. Open extension Connection settings. Enter the same ERP environment: `http://localhost:3000` for local development, or `https://erp.khyatigems.com` after deployment. Paste that environment's personal credential, choose the idle threshold (300 seconds initially), save and grant the requested ERP host permission.
4. Click **Enable automatic tracking** once. It follows external marketplaces automatically. **Pause tracking** is a privacy control, not a task timer. The badge shows ON for eligible activity, OFF while paused/idle/unfocused/unsupported, and ! for errors.

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
| Chrome connection | Create/revoke personal credentials and inspect the last received extension activity. |

CSV export uses the displayed time summary. The report window is limited to 93 days. Historical filters do not change today's live total.

## Calculations and limitations

Average minutes per listing = eligible linked listing-work minutes / confirmed published listings. Listings/hour = confirmed published listings / eligible linked hours. Preparation and publishing time remain separate. A matching listing record or product/shop reference can link ERP work; an ambiguous listing or unlinked publication makes rates unavailable. A publication is counted once per verified shop/listing in tracker productivity. Synchronization/troubleshooting time is labeled activity, not a proven duration for a particular failed sync job.

ERP and extension activity are estimates. Long reading can become idle; discarded suspended intervals are not reconstructed. ERP idle threshold is currently five minutes; the extension threshold is configurable. Pending records are not included in synced totals. A marketplace switch is reflected after synchronization, not instantly in historical reports. Revenue remains company/shop-wide, separate from personal time. No combined foreign-currency total is invented.

Automated tests cover ingestion, validated ERP context, overlap priority, authentication/ownership, lifecycle compatibility, reporting boundaries and mocked Chrome focus/idle/retry behavior. An actual unpacked installation, host permission prompts and authenticated interactive acceptance in your Chrome profile still need verification. Deployment/migration and rollback details are in `docs/work-tracker.md` and the weekly BI deployment guide.
