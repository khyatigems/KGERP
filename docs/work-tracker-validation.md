# Work Tracker validation — 20 October 2026

## Browser connection audit — 25 October 2026

Removed the simultaneous automatic/manual credential forms and raw-token display. One status-led flow verifies this profile with ERP, distinguishes expired/revoked, offline, another account/address and older extension versions, and renames existing access without minting another key. Active access is separated from collapsed history. Only a verified ID owned by the current account is marked This browser. Status network calls run outside the worker sampling queue; commit checks prevent concurrent replacement and preserve pending records.

Verification: full tracker unit/isolated-database integration/worker/pairing suites passed. Added tests for owner-only credential renaming, CSRF, metadata without token/hash exposure, legacy token identity recovery, revoked-token recovery, offline rejection, paused/empty-queue requirements, concurrent connects and responsive controls during status requests. Targeted lint and TypeScript checks passed. Production build completed successfully, including the final build with automatic ZIP regeneration. A separate production server returned logged-out HTTP 200 for the download route, with a valid ZIP signature and the expected 40,239-byte archive. Extension archive 1.2.0 passed independent Python ZIP CRC, contents and UTF-8 validation. Relevant source UTF-8 scan passed.

An isolated browser harness rendered the real connection component with mocked Chrome messaging and ERP endpoints. Verified new connection creates one credential; renaming preserves its count; revocation confirms consequences and moves the key to history; another account, offline, old extension and pending queue do not offer replacement creation. This does not replace an actual installed-extension test against deployed ERP, which requires updating the user's unpacked Chrome extension and deploying the matching ERP code. No production credentials or retained activity were modified during tests.

## Follow-up audit — 21 October 2026

The order-value context now requires a recent successful, zero-failure ORDERS sync for every connected shop in scope, plus complete valid amounts/currencies for eligible imported orders. Missing or stale coverage returns an explicit unavailable reason naming affected shops; imported rows by themselves cannot imply complete sales coverage. Isolated integration coverage verifies stale rows remain unavailable, fresh coverage permits totals, and later staleness disables them again.

The extension now validates event acknowledgements against the submitted batch, propagates queue acknowledgement/storage failures to **Sync now**, and leaves unacknowledged records queued for idempotent retry. Tests simulate offline uploads, invalid acknowledgements and local acknowledgement-write failure. The compact history shows day/platform/activity totals first; individual intervals and corrections are paged in an opt-in detail view. Marketplace-wide order-value context is separated from personal work KPI cards. The extension settings page verifies the saved credential against an authenticated sensor-status endpoint. The weekly report's email test action is tucked under an optional recipient section because preview validates PDF content while test delivery validates Zoho delivery and the attachment.

Follow-up verification: `npm run test:work-tracker`, `npm run test:weekly-reports`, `npm run test:weekly-reports:ui`, targeted ESLint, `npx tsc --noEmit`, `npm run build:work-tracker-extension`, and `npm run build` passed. The full build retains only the existing Next.js middleware convention deprecation notice. Actual Chrome installation and credential-based interactive acceptance remain to be confirmed in the user's Chrome profile.

## Follow-up: calculation and extension behavior review

Reviewed manual active intervals, report overlap allocation, daily/weekly timezone boundaries, targets and publication attribution while preparing the user walkthrough. Corrected immediate screen lock being treated as a full idle-threshold rollback; screen lock now preserves preceding active time while stopping new counting. Corrected the extension's offline age constant to a full seven days. Uploads now run outside the state-change queue, so slow requests cannot block focus/idle/control handling; acknowledgements remove accepted IDs from the latest queue without losing new intervals. Worker regression tests explicitly hold a network request open and verify controls, focus loss and new queued records remain correct.

Duplicate listing rows for the same shop/external ID now produce one publication without hiding valid rates; equal external IDs across different shops still make attribution unavailable. Added tests for both cases. Daily target validation now prevents goals over 1440 minutes, expired credentials display Expired, and the page explains the distinction between its manual timer and extension intervals. Productivity cards expose the linked minutes used for rates.

Added `docs/work-tracker-user-guide.md` with installation, local versus deployed ERP configuration, every page section, numerical examples and current reporting limitations. Rebuilt the unpacked extension output after the fixes.

## Follow-up: missing tracker tables fixed

The first use against the configured application database exposed an integration omission: its five tracker tables were absent, while the generated Prisma client was present. Sessions, reports and extension credentials consequently returned 500. Added `lib/work-tracker/schema.ts` and initialization at the shared tracker API entry point, following the existing ERP runtime schema pattern. Only additive tracker DDL runs; successful setup is cached per client, concurrent requests share initialization, and tables/required unique indexes are verified before marking setup ready. Failed initialization remains retryable.

The additive migration now uses `IF NOT EXISTS`, allowing later migration deployment after runtime initialization without deleting tracker records. Regression tests compare runtime DDL against the migration, reproduce an existing ERP schema without tracker tables, exercise simultaneous dashboard requests and credential creation, reapply the migration and verify existing inventory and new credentials are retained.

Initialized the configured database's tracker structures and verified queries on all five models succeed. The running development server subsequently returned **200** for sessions, credentials, summary and productivity requests; this was confirmed in its live terminal output. Full tracker unit/integration/worker suites pass after the fix. No existing business records, users or marketplace credentials were edited.

## Result

Implemented in the existing ERP repository: additive database models/migration; secure personal APIs; manual interval timers; Work Tracker navigation/dashboard; corrections, reports, CSV and targets; scoped/revocable extension credentials; Manifest V3 automatic tracking, offline queue and settings; confirmed eBay publication evidence and daily/weekly productivity comparisons. No production migration, production credential change, marketplace OAuth change or production deployment was performed. No new environment variables are required.

| Check | Outcome |
| --- | --- |
| `npm run test:work-tracker` | Passed unit, isolated SQLite/HTTP integration and actual service-worker tests with mocked Chrome APIs. |
| Final `npx tsx scripts/tests/work-tracker.integration.ts` | Passed after adding concurrent-start race, query clipping and daily/weekly productivity assertions. |
| Final `node scripts/tests/work-tracker-extension.mjs` | Passed after validating focus-transition recording. |
| Tracker-specific ESLint | Passed, no errors or warnings. Includes new libraries/routes/page/extension/tests. |
| `npx tsc --noEmit --pretty false` | Passed. Production build also passed its TypeScript check. |
| `npx prisma validate` | Valid. Existing relationMode index warnings remain elsewhere in schema. |
| New migration applied to disposable baseline, then Prisma schema diff | Passed; empty diff. Test generates baseline from current schema without tracker tables, applies the exact migration and compares against the full schema. |
| `npm run migrate:guard` | Passed; no destructive migration patterns. |
| Final `npm run build` | Passed; `/work-tracker` and `/api/work-tracker/[...path]` included. Existing middleware deprecation warning remains. |
| `npm run build:work-tracker-extension` | Passed; unpacked output in `extensions/work-tracker/dist`. |
| `npm run test:all` with explicit disposable local DB | Passed: attention, invoice, reports, customers, PDF and loyalty suites. Reports tests also create their own local fixture. |
| `npm run test:marketplace-listing-sync` | Passed. |
| `npm run test:marketplace-oauth-scopes` | Passed. |
| `npm run test:marketplace-draft-settings` | Passed. |
| `npm run test:ebay-description` | Passed. |
| `npm run test:dashboard` | Passed: cache and trading dashboard integration, including permission revocation. |
| `npm run lint` (entire repository) | Fails on existing files: 166 errors, 79 warnings. No new tracker files appear in that failure output; scoped feature lint is clean. |
| `git diff --check` | Passed; Git reports existing line-ending notices. |

The test suite never uses the configured application database. It explicitly overrides DATABASE_URL and clears Turso URL overrides before importing application modules. It creates and removes an OS temporary fixture. Broader tests that write data were run with DATABASE_URL pointing to `tmp/work-tracker/regression.db`, or use their own explicit disposable fixtures. Existing marketplace regression tests use local data/mocks; no live publication or OAuth request was made.

## Corrected or environmental failures observed

- Historical `prisma migrate diff --from-migrations ... --shadow-database-url file:...` failed at the existing `20260605182431_add_category_gemtype_banners` migration because `EbaySettings` is absent in an empty baseline. This is not resolved by resetting or modifying an existing database. The tracker migration was generated from the checked-in pre-change schema instead and independently validated against a generated local baseline.
- Initial test-only TypeScript fetch mock signature mismatch was fixed; final type-check and build pass.
- Initial mocked-worker assertions assumed recent transition metadata could upload immediately; corrected to respect the idle safety buffer. A double-response callback in the worker was also fixed and the test now passes.
- A concurrent build retry encountered Windows `EPERM` while replacing Prisma's loaded query-engine DLL. Tests were allowed to finish and the build was rerun successfully. On Windows, serialize Prisma generation and database-using tests.
- Automatic approval review rejected the command to create/start an isolated browser UI test server, reporting only “blocked by policy.” It was not retried through another mechanism. Consequently, visual browser QA is not claimed.

## Pending acceptance

- Interactive desktop Chrome unpacked installation, real permission prompts, real focus/idle/restart behavior and real HTTPS credential exchange against staging.
- Visual/responsive inspection of the ERP page in an actual browser. API, compilation and mocked-browser tests do not substitute for this.
- Review, backup and application of the migration on staging/production using the existing controlled migration workflow. Historical fresh-bootstrap migration issue must be handled through a known baseline, not a database reset.
- Staging smoke tests for existing login, inventory, listings, orders and marketplace connections with authorized real accounts. Automated regressions passed, but no live marketplace operation was exercised.
- Exact Etsy/Amazon publication productivity and failed-sync-operation time attribution remain unavailable because existing records lack reliable actor/timestamp/session links. The UI/API explicitly show unavailable rather than inventing metrics. eBay evidence covers confirmed ERP publications after deployment only.

## Changed files

Modified existing files:

- `prisma/schema.prisma`: tracker models and User relations.
- `lib/prisma.ts`: stale development client detection includes WorkSession.
- `components/layout/sidebar.tsx`: Work Tracker item for authenticated dashboard users.
- `lib/marketplace/ebay-complete-listing.ts`: confirmed publication metadata, preserving reconciliation behavior.
- `app/api/marketplace/listing-preparation/route.ts`: pass authenticated actor to existing eBay publisher.
- `package.json`: tracker tests and extension build scripts. No dependencies added.

New application and migration files:

- `app/(dashboard)/work-tracker/page.tsx`
- `app/api/work-tracker/[...path]/route.ts`
- `lib/work-tracker/auth.ts`
- `lib/work-tracker/core.ts`
- `lib/work-tracker/http.ts`
- `lib/work-tracker/reports.ts`
- `lib/work-tracker/service.ts`
- `prisma/migrations/20261020000000_work_tracker/migration.sql`

New extension files:

- `extensions/work-tracker/manifest.json`
- `extensions/work-tracker/package.json`
- `extensions/work-tracker/.gitignore`
- `extensions/work-tracker/build.mjs`
- `extensions/work-tracker/src/service-worker.js`
- `extensions/work-tracker/src/activity-tracker.js`
- `extensions/work-tracker/src/api-client.js`
- `extensions/work-tracker/src/platform-detection.js`
- `extensions/work-tracker/src/popup.html`
- `extensions/work-tracker/src/popup.js`
- `extensions/work-tracker/src/options.html`
- `extensions/work-tracker/src/options.js`
- `extensions/work-tracker/src/style.css`

New tests/documentation:

- `scripts/tests/work-tracker.unit.ts`
- `scripts/tests/work-tracker.integration.ts`
- `scripts/tests/work-tracker-extension.mjs`
- `docs/work-tracker.md`: architecture, API, accounting definitions, Windows setup, installation, deployment and rollback.
- `docs/work-tracker-validation.md`: this record.

`dev-server.log` was already modified when work started and was left alone. Generated databases/logs/schema fixtures remain under ignored `tmp/` or ignored SQLite files; generated extension output is ignored under its `dist/`. Temporary pre-change schema used for migration generation was removed. Changes are local; no commit or PR was requested.

## Commands executed

Inspection used `git status`, `git diff`, `git show HEAD:prisma/schema.prisma`, `rg --files`, `rg -n`, `Get-Content` and file listings. Primary validation/build commands are in the result table above. Migration commands included:

```text
prisma migrate diff --from-schema-datamodel <temporary pre-change schema> --to-schema-datamodel prisma/schema.prisma --script --output prisma/migrations/20261020000000_work_tracker/migration.sql
prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
prisma migrate diff --from-url <disposable SQLite fixture> --to-schema-datamodel prisma/schema.prisma --script
prisma generate
prisma validate
```

The unsuccessful shadow-migration check and isolated browser-server launch are documented above. No `migrate reset`, production `db push`, production migration deployment, OAuth reauthorization, credential edit or live publishing command was executed.
