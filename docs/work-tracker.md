# Work Tracker

## Architecture assessment and file plan

Inspected the checked-in `package.json`, App Router pages/routes, `prisma/schema.prisma`, `lib/prisma.ts`, `lib/auth.ts`, `lib/auth.config.ts`, `middleware.ts`, sidebar, marketplace connector registry/types/eBay/Etsy implementations, listing preparation/publishing, Listing, Inventory, MarketplaceOrder, MarketplaceShop, MarketplaceSyncLog/Job and ActivityLog models, migration scripts and existing tsx/assert tests before editing.

The ERP is Next.js 16 / React 19 with NextAuth v5 JWT credentials authentication, Zod 4, Prisma 5.22 SQLite and optional Turso/libSQL adapter. Middleware allows API requests through: private API handlers must authenticate themselves. User IDs come from JWT `session.user.id`; role/permission checks exist for marketplace operations. The new feature is personal and permits all authenticated users to manage only their own entries. Existing navigation uses shared Card/Button conventions and `navGroups`.

eBay and Etsy connectors are registered. Amazon has a platform type but no connector. Listings map to Inventory and optional MarketplaceShop; imported listings and Etsy drafts have no trustworthy publication-time/user attribution. MarketplaceOrder is business order data, not evidence of a listing being published. ActivityLog remains separate from browser telemetry. No Chrome extension manifest/background/options source was found. `lib/extension-api-auth.ts` uses shared environment credentials without user identity and is intentionally not reused for personal tracking.

Implementation files:

- `prisma/schema.prisma`, additive `20261020000000_work_tracker/migration.sql`: WorkSession, WorkInterval, WorkTarget, WorkActivityEvent, WorkTrackerCredential and User relations.
- `lib/work-tracker/core.ts`: schemas, exact host allowlist, interval subtraction/union and IANA timezone boundaries.
- `lib/work-tracker/schema.ts`: cached, concurrent-safe additive schema initialization using the existing DDL helper; verifies tables/unique indexes and retries failures.
- `lib/work-tracker/auth.ts`: existing session authentication, origin checks, personal hashed bearer credentials.
- `lib/work-tracker/service.ts`: timer lifecycle, corrections, ingestion and tombstones.
- `lib/work-tracker/reports.ts`: interval clipping, overlap precedence, day/week reports and real listing evidence.
- `lib/work-tracker/http.ts`, `app/api/work-tracker/[...path]/route.ts`: private APIs using existing routing conventions.
- `app/(dashboard)/work-tracker/page.tsx`, `components/layout/sidebar.tsx`: responsive tracker and navigation.
- `lib/prisma.ts`: refresh stale generated clients during development.
- `lib/marketplace/ebay-complete-listing.ts`, its existing API caller: record actor/time/external listing ID only after a confirmed successful publish response. Existing OAuth and synchronization behavior is retained.
- `extensions/work-tracker/`: dependency-free Manifest V3 JavaScript source and packaging script.
- `scripts/tests/work-tracker*`: unit, isolated SQLite/HTTP integration and mocked Chrome worker tests; package scripts.

## Data and accounting

Tracker APIs first ensure their own tables and indexes exist, following the ERP’s existing runtime schema-initialization convention. This runs only additive `CREATE ... IF NOT EXISTS` statements, caches successful initialization and verifies required structures before serving requests. The migration is also idempotent so deploying it after first use preserves tracker entries. No unrelated migration, reset, seed or business-record update runs.

WorkSession stores the requested fields plus requestId, revision and a nullable unique activeUserId. Non-null activeUserId locks one RUNNING **or PAUSED** timer per user at the database level. Stopping releases it. A paused timer must be stopped before starting another. WorkInterval records each active segment, avoiding counting pauses. Server clocks determine manual timer transitions and durationSeconds. Revision checks reject stale competing changes; retrying an already-applied transition is harmless.

Automatic tracking is opt-in. Each uploaded active slice becomes a completed EXTENSION WorkSession with one interval; no open automatic server timer can accumulate time during browser downtime. This deliberately uses small completed records rather than pretending a browser visit is a productive task. Raw session duration is interval duration; report totals are deduplicated. Manual intervals take priority, followed by browser intervals in chronological/stable-ID order. Deduplication happens **before** platform/activity filters, and across devices. Overlaps are attributed once, even after manual corrections. Deleted browser entries retain event IDs as tombstones, preventing later retries from recreating deleted time.

Reports use half-open `[from,to)` UTC instants, clip crossing intervals and group by the requested IANA timezone. Weeks start Monday. The UI date picker includes the whole final local calendar day, handles DST, and supports up to 93 days per report. Sessions paginate 100 at a time; the active timer is returned separately. Target progress in the page uses the current local day/week independently of historical filters. Summary API target progress is restricted to its query window, so request the full current week for current target progress. CSV exports the selected daily/weekly platform summary. No mock statistics are used.

Corrections require a stopped session. Editing classification/notes preserves pauses. Editing either timestamp replaces all intervals with a single corrected active interval and recalculates duration. Manual historical entry: start/stop an entry and correct its timestamps. Invalid, future, inverted or greater-than-366-day correction ranges are rejected.

## API

Base: `/api/work-tracker`. Responses are JSON with `Cache-Control: no-store`. Cookie-authenticated writes require an `Origin` header equal to the ERP origin. No client userId is accepted. Errors use 400 validation, 401 authentication, 403 scope/origin, 404 ownership/not found, 409 conflicts, 413 oversized payload and 500 unexpected failure. Write bodies are limited to 100,000 characters; event batches to 100.

| Method | Path | Body / query |
| --- | --- | --- |
| GET | `/sessions` | `from`, `to` UTC ISO timestamps; optional `platform`, `activityType`, `timeZone`, zero-based `page`. Defaults past seven days, Asia/Kolkata. Returns entries/total/page/pageSize/current. |
| POST | `/sessions/start` | UUID `requestId`, `platform`, `activityType`, optional description/sku/marketplaceListingId/notes. Reuse requestId when retrying. |
| POST | `/sessions/:id/pause` | `{ "revision": 0 }` (use latest returned revision) |
| POST | `/sessions/:id/resume` | `{ "revision": 1 }` |
| POST | `/sessions/:id/stop` | `{ "revision": 2 }` |
| PATCH | `/sessions/:id` | revision and permitted classification/description/sku/marketplaceListingId/notes/startedAt/endedAt corrections |
| DELETE | `/sessions/:id` | revision; only completed owned entries |
| POST | `/activity-events` | `{ "events": [...] }`; personal bearer credential or authenticated same-origin session |
| GET | `/reports/summary` | same date/platform/activity/timezone filters; totals/byPlatform/daily/weekly/today/targets |
| GET | `/reports/productivity` | same filters; platform metrics, coverage and formula definitions |
| GET | `/targets` | own targets |
| PUT | `/targets` | platform, period DAILY/WEEKLY, integer targetMinutes 1–1440 DAILY or 1–10080 WEEKLY; upsert by user/platform/period |
| GET | `/credentials` | own credential metadata, never token hashes |
| POST | `/credentials` | `{ "name": "Chrome" }`; returns token **once** and expiry; max 10 unexpired active credentials |
| PATCH | `/credentials/:id` | `{ "name": "Office PC" }`; rename own active credential without replacing its token |
| DELETE | `/credentials/:id` | `{}`; revoke own credential |

Platforms: ERP, EBAY, ETSY, AMAZON. Activities: LISTING_PREPARATION, LISTING_CREATION, SEO, IMAGES, INVENTORY, ORDERS, CUSTOMER_SERVICE, SYNCHRONIZATION, TROUBLESHOOTING, OTHER. Labels in the page are human-readable.

Example event (timestamps must be real past instants):

```json
{
  "events": [{
    "id": "baf1406b-7f25-49d9-a645-e28ccaa59001",
    "platform": "EBAY",
    "domain": "www.ebay.com",
    "eventType": "ACTIVE",
    "activityType": "LISTING_CREATION",
    "startedAt": "2026-10-20T06:30:00.000Z",
    "occurredAt": "2026-10-20T06:30:30.000Z",
    "classificationOverride": false
  }]
}
```

Transition eventType also permits IDLE, TAB_SWITCH, WINDOW_FOCUS, WINDOW_BLUR; these have no startedAt and contribute zero time. ACTIVE intervals require a start and may span at most 90 seconds. Events older than seven days or in the future are rejected. Source/user/duration are server-controlled. Only hostname metadata is accepted, never page URLs/content. A classificationOverride allows the user-selected platform on an otherwise supported hostname. Unsupported/lookalike hosts remain rejected. IDs are globally unique and cannot be reused by another user. Replays return accepted IDs without adding time. Batch commits are per event: retry the batch after a temporary partial failure using the original IDs.

Credentials are 256-bit random secrets, SHA-256 hashed in the database, expire after 90 days and are revocable. They permit **only activity event ingestion**. They cannot read reports, mint credentials, change targets or edit sessions. They are distinct from marketplace tokens. HTTPS is required by the extension except loopback HTTP for local testing. Session authentication remains unchanged.

## Productivity: scope and limitations

eBay's existing complete-listing publisher now stores `rawMetadata.workPublication` after an actual successful publish response, including actor, timestamp and external listing ID. A reconciliation of an already-published remote listing does not fabricate these fields. Old/imported records, drafts, sync import timestamps and order counts are not treated as publications.

Denominator: distinct shop + external listing ID confirmed published by this user in the reporting window. Numerator: deduplicated active LISTING_PREPARATION and LISTING_CREATION minutes in the same window, linked by marketplaceListingId to an unambiguous confirmed publication. SKU alone is insufficient. Rates require eligible linked time for **every** counted publication; otherwise unavailable. Preparation and publishing minutes are also reported separately. Two stages of the same listing never count as two publications.

- Average minutes per listing = eligible minutes / confirmed publications.
- Listings/hour = confirmed publications / (eligible minutes / 60).

Etsy publishing occurs outside the current ERP draft flow; Amazon has no connector. Publication counts/rates for those platforms (and ERP) are unavailable. eBay count zero means no confirmed evidence in the covered subset, not proof no external publications occurred. Daily/weekly productivity comparison rows show publication counts, preparation/publishing minutes and rates by local period, alongside the time report. Each period uses the same attribution rules. Synchronization and troubleshooting minutes are explicit activity totals; attribution of minutes to an actual failed sync operation is unavailable because current sync logs do not link to tracker sessions. No new connector, marketplace authorization flow or order integration is introduced.

## Windows setup

Use the existing supported Node/npm installation and repository environment configuration. No new environment variables or secrets are required.

```powershell
Set-Location 'D:\Tools by Akansh\khyatigems-erp'
npm ci
npx prisma generate
npm run test:work-tracker
npm run build:work-tracker-extension
```

Use a **disposable local database or backed-up staging copy** for setup. Never point test setup at production. The new integration suite creates a temporary SQLite database, generates the baseline schema, applies the new migration and verifies no schema diff remains; it never reads or writes the configured application database.

For an existing migrated local database, set DATABASE_URL explicitly to that local file, clear Turso URL overrides for the current shell, then run the existing migration workflow:

```powershell
$env:DATABASE_URL = 'file:./dev.db'
$env:TURSO_DATABASE_URL = ''
$env:TURSO_URL = ''
$env:RUN_SAFE_MIGRATIONS = 'true'
npm run migrate:safe
npm run dev
```

This repository's historical migrations cannot currently bootstrap an empty database: `20260605182431_add_category_gemtype_banners` assumes `EbaySettings` already exists. Do not reset a populated database or baseline all migrations blindly to bypass this. For a clean development database, generate the full current schema with `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script` and apply it **only to a newly created disposable local file**, as the isolated integration test demonstrates. Restore a known baseline for production/staging migration checks.

## Chrome installation and operation

1. Download the free extension from ERP Work Tracker > Connections, extract into a permanent folder, then Load unpacked in `chrome://extensions`. Developers can run `npm run build:work-tracker-extension` and load `extensions/work-tracker/dist` instead. The normal ERP build also regenerates the download archive automatically.
2. Enter the installed extension ID in ERP and choose **Check this browser**. The extension verifies saved access and recovers legacy credential names from ERP.
3. Connect an unconfigured profile with a recognizable browser name, or rename its verified existing connection. No manual credential creation or token copying is needed. Another account/address, an unverifiable connection, or unresolved pending records blocks replacement access.
4. Pin the extension and choose **Enable automatic tracking**. Pause in the popup as needed. Settings allows idle threshold changes, connection checks and pending-record export or clear.
5. ON means eligible active tracking; OFF means paused, idle, unsupported tab or unfocused/minimized window; ! indicates a sync/queue/configuration error. Updates require replacing the unpacked files in the same folder and clicking Reload in Chrome, then reloading ERP.

Permissions: `tabs` reads the active tab URL solely for exact hostname classification; `idle` detects idle/lock; `storage` stores settings and pending minimal events on this profile; `alarms` checkpoints every 30 seconds. The default ERP host permission allows authenticated background fetch. Optional host permissions are requested only for the configured ERP origin. No content scripts, screenshot capture, form access or marketplace token access. Local storage access is restricted to trusted extension contexts. Credential is not put in Chrome sync storage.

Chrome APIs: [idle](https://developer.chrome.com/docs/extensions/reference/api/idle), [windows](https://developer.chrome.com/docs/extensions/reference/api/windows), [service worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle).

Only an eligible active tab in a focused, non-minimized window contributes. Domain allowlists cover the explicit regional eBay/Amazon hosts in platform-detection.js and ERP/Etsy hosts; arbitrary subdomains and lookalikes do not qualify. The ERP hostname follows the configured origin.

Recent slices remain local for idle threshold **plus 90 seconds** before upload; entering idle removes the preceding threshold from pending slices. Locking stops tracking immediately and preserves the active time just before the lock. This conservative delay prevents uploaded idle time from becoming irreversible. Transition metadata has zero duration. A large alarm/suspension gap over 90 seconds is discarded; startup clears an unfinished checkpoint without bridging downtime. Some work can be undercounted after suspension. This is an estimate, not employee performance proof.

Offline queue entries retain UUIDs; exponential retry backs off up to an hour, and Sync now retries immediately. Records commit once at the server. Worker operations serialize state changes; uploads run separately so slow networking cannot block focus/idle handling. Upload acknowledgements merge into the latest queue to preserve newly captured intervals. A failed acknowledgement or local queue update is reported as a failed sync, and unaccepted records remain queued. Queue capacity is 10,000 records; tracking pauses at capacity without silently dropping entries. Seven-day-old records block sync pending user review/export/clear. Settings provides export of pending metadata (no credential) and an explicitly confirmed destructive queue-clear operation. Changing ERP or credential with a pending queue is blocked to prevent uploading one user's records into another account. Revoke lost credentials in ERP.

The Work Tracker order-value context is available only when all connected shops in scope have a successful, recent, zero-failure ORDERS sync job and eligible imported orders have valid amounts and currencies. Otherwise the UI reports affected shops and marks the value unavailable. This prevents stale or partial imported rows from being treated as complete sales coverage. It remains shop-wide context, not personal revenue.

## Deployment and rollback

1. Review additive SQL and deploy to backed-up staging first. Run `npm run migrate:guard`; use the existing `migrate:backup`, `migrate:deploy:safe`, `migrate:validate` workflows with your existing deployment secret handling. Do not echo credentials or change marketplace grants. The normal build only generates Prisma and does not apply migrations.
2. Verify all five new tables/indexes on staging, timer uniqueness, own-user access and listed regression checks. Existing relationMode is `prisma`; migration follows that convention.
3. Back up production using the existing deployment process. Apply the reviewed migration through the repository's controlled workflow, regenerate client/build, then deploy the application. No production migration was executed during implementation.
4. Smoke-test with an authorized account: start/pause/resume/stop, historical correction, duplicate event submission, target, a focused marketplace tab then idle/focus loss, and a retry after disconnecting networking. Confirm inventory, orders, marketplace sync and OAuth screens still work. Verify actual Chrome permission prompts, extension reload/restart, local and deployed HTTPS authentication.

Rollback: pause/uninstall the extension, revoke tracker credentials, redeploy the prior application revision. **Leave additive tables and publication metadata intact** so recorded work is preserved. No database reset/drop is needed. Do not remove marketplace credentials. If removal is later required, export work data and design a separate reviewed migration after confirming no retained version depends on it. Reinstalling the new revision restores access to saved records.

## Verification and remaining acceptance

Run `npm run test:work-tracker`, `npx tsc --noEmit`, `npm run lint`, `npm run migrate:guard`, `npm run build`, and the existing regression scripts on disposable databases. Tracker suites cover lifecycle, database lock/retries, auth/origin/scope/revocation, ownership, event replay/tombstones, report overlap/filter behavior, correction changes, targets, true publication evidence, IANA/DST boundaries, exact domains, offline retries and actual worker behavior using mocked Chrome APIs. Additive migration is applied to a generated baseline and checked for Prisma schema parity.

Actual interactive Chrome installation, staging/production migrations, live marketplace requests and real deployment acceptance require an authorized environment. They are not implied by mocked tests. Broader lint/build/regression outcomes and executed commands are recorded in `work-tracker-validation.md`.


## Named Chrome pairing (1.2.0)

Connections has one setup path: check the installed extension, then either connect a new profile or rename its existing access. The protocol 2 status reply verifies the saved token against ERP's sensor-status endpoint, which returns only credential ID, name and expiry alongside the existing status. Legacy profiles recover those fields from their token. ERP checks that the returned ID belongs to the current session's active credential list before exposing the rename action. Another account/address, offline verification, old extension protocol or a pending queue blocks new credential creation. Revoked/expired credentials can be replaced when paused and the queue is empty. A failed handshake revokes its newly created credential; failed cleanup directs the user to revoke it manually. Sampling remains responsive while status verification performs network requests. Commit rechecks settings and queue to handle concurrent connects and tab activity.

The duplicate manual credential UI and raw-token display are removed. Active keys support authenticated owner-only rename/revoke; history is collapsed. The last received activity in the source card is account-wide, while extension status provides this profile's last successful upload. Keys do not imply online browser status. No database migration is required.

`npm run build:work-tracker-extension` regenerates dist and the extension-only archive at `public/downloads/work-tracker-extension.zip`. The ERP offers that free download with extract/load-unpacked instructions. The archive is public and contains no credentials or ERP source. Keep the extracted folder permanently and update it in place to retain its unpacked extension ID. The optional `NEXT_PUBLIC_WORK_TRACKER_EXTENSION_ID` still supports a future store listing, but publication remains deferred per the owner's choice.
