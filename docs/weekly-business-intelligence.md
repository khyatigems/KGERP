# Weekly Business Intelligence reports

## Architecture and access

The repository uses Next.js App Router, React, Zod and **Prisma/SQLite or Turso**, not Drizzle. Existing inventory, marketplace, sales, returns, company settings, activity audit and email models are reused. Settings → **Reports & Email Alerts** opens `/settings/weekly-reports`. Every private API checks the authenticated user's database-backed `settings:manage` permission; writes require a matching Origin. PDF downloads recheck that permission and return private/no-store responses.

Configuration is stored in the existing `Setting` table under `weekly_business_intelligence_settings`. It contains no credentials. Save operations use optimistic concurrency and audit before/after values. Recipients are validated, case-normalized, deduplicated and individually enabled. Changing the recipient list requires confirmation. Live/test send buttons also require confirmation. Defaults are Monday 09:00 Asia/Kolkata, previous Monday–Sunday, the three requested recipients, **automatic reporting OFF and live delivery OFF**. Preview current options before enabling automation/delivery; the configuration hash must match a successful stored preview. Frequency is currently weekly.

The configuration covers schedule/timezone/period, platform or individual-shop scope, comparison/valuation/charts/detail switches, PDF sections, required-field and certificate-category policy, enabled/severity/threshold alert rules, approved company logo selection, footer/confidentiality, email templates/test recipient, attachment limit, retries and retention. Template placeholders shown in the UI are plain text, never executed HTML. Keep certificate-required categories empty if no verified business policy has been agreed; the report then says certificate assessment is unavailable.

## Metric definitions

See [verified field mapping](weekly-report-field-mapping.md). Every report stores its settings and metric snapshot. The PDF, run-detail API and audit view use that same snapshot. Intervals are `[start,end)` in the configured timezone. A Monday 26 October 2026 run covers 19–25 October, with UTC boundaries 18 October 18:30 through 25 October 18:30 for Asia/Kolkata. DST gaps resolve to the first valid local minute; repeated local delivery times use the first occurrence.

- Physical inventory is deduplicated by unique SKU, independent of listing count. Availability, price valuation, completeness and active listing states are **generation-time** snapshots; historical week-end completeness is unavailable.
- Inventory prices are summed once per SKU, without multiplying by pieces. Cost and asking value are separate and follow the existing INR inventory-price convention; this assumption is printed, not an exchange-rate conversion.
- Orders are deduplicated by platform plus external order ID. Conflicting shop assignment is disclosed. Order count includes received cancellations/refunds; eligible units/value exclude cancelled/refunded/failed/unpaid/payment-pending orders. Exclusions recognize known recorded status strings only: the eBay connector stores fulfillment status, so complete cancellation/refund and payment-confirmation coverage is unavailable. Units sum item quantities. Average order value uses eligible orders with valid amounts in each original currency. Unknown amounts are excluded with coverage warnings.
- Recorded marketplace order value may include tax/shipping; it is not cash receipts, net sales, profit or settlements. Reliable discount/tax/shipping/refund decomposition and historical FX are unavailable. Currencies are never added together. Prior zero yields N/A percentage change.
- New listings use distinct platform/listing IDs and the earliest available successful ERP eBay `workPublication` marker, validated against `completeEbay.state=PUBLISHED`. Imported timestamps and Etsy draft creation are not publication evidence. Coverage is explicitly partial; historical attempts and non-eBay publication counts remain unavailable.
- ERP Sale and SalesReturn records remain separate ledgers. They are not added to marketplace revenue. Missing return-table access produces unavailable counts, not zero.
- All-shop scope includes known disconnected shops for health visibility and unassigned records in totals; unassigned orders cannot be assigned to a shop row. Selected shop/platform scope limits marketplace metrics, while physical inventory and ERP sales/returns remain company-wide.

## PDF and storage

`lib/weekly-report/pdf.ts` renders reusable escaped HTML, generated SVG bar charts, an embedded local font and the actual approved Khyati Gems logo using the existing Puppeteer dependency. No external scripts or assets are loaded by Chromium. The approved logo is `public/brand/khyatigems-logo.png`; CompanySettings document/logo paths can be used if local to `public`. Remote company logo URLs fail explicitly: use the approved logo option or make the approved company asset local. SVG logos reject external references/scripts/entities and are sanitized to supported vector elements/attributes. Aspect ratio is preserved.

A4, running page count/period/footer, repeated table headers and row break avoidance support long exception registers. No SKU rows are truncated. Missing data is labeled. PDF header/EOF, configured size and SHA-256 checksum are verified. PDF bytes are stored privately in `WeeklyReportRun.pdfBase64`, not in public URLs or ephemeral serverless disk. This is durable but adds database storage overhead; verify the production database's row/payload limits and capacity for the chosen report/retention settings. Larger installations should introduce a verified private object-store adapter before increasing limits. Successful PDF artifacts expire under configured retention; metadata/history remains.

The file `output/pdf/KhyatiGems-weekly-SYNTHETIC-preview.pdf` is a QA fixture generated with fabricated test records to exercise page breaks and is visibly marked synthetic so it cannot be mistaken for company data; automated tests never email it. A report generated from ERP data (including a Preview run in Settings) is not labelled synthetic. `output/weekly-reports/settings-1440.png` and `settings-390.png` show the actual Settings component with preview configuration. They are visual smoke tests, not authenticated end-to-end browser tests.

The PDF summarizes missing images and missing certificate numbers as counts and percentages; their affected SKUs are excluded from the detailed exception table. Detailed SKU output defaults off. If enabled, that table is limited to other missing required product fields. Week-over-week changes are shown for orders, units, confirmed new listings, and per-shop orders/units/order value when the prior period has a non-zero denominator; prior-zero values are N/A.

## Zoho delivery and failure semantics

Reuses `lib/email/connectors/zoho.ts` (`ZohoMailConnector`), encrypted OAuth storage from `lib/email/oauth.ts`, configured sender identity and the verified existing attachment-upload/send implementation. No new mail credentials or marketplace OAuth grants are introduced. The connector now refuses to send when attachment upload metadata is missing, disables hidden retries of message-submission POSTs and returns sanitized failures with Retry-After information.

Each enabled recipient has a `WeeklyReportDelivery` row and a correlated existing `EmailLog` row per attempt. `ACCEPTED` means Zoho returned a message ID; it **does not prove mailbox delivery**. Known safe failures retry with configurable delays, jitter and attempt limits; provider Retry-After is respected. Accepted recipients are never retried. Network/5xx/timeout failures after submission, missing message IDs and interrupted submissions become `UNKNOWN` and block automatic resending. Review Zoho Sent before any operational reconciliation. An automatic exactly-once guarantee cannot be claimed without a verified provider idempotency/query facility.

Failed deliveries and generation errors are visible per run/recipient in administrator Settings history. Authorized users can retry known failures below their configured attempt limit. Unknown outcomes require operational investigation; this version does not provide an unsafe force-resend button. A separate out-of-band permanent-failure notification channel is not implemented; administrators must monitor history/cron failures. No production mail was sent during implementation.

## Persistent scheduling and production deployment

1. Back up the database and verify the existing migration ledger. Review/apply additive migrations `20261020000000_work_tracker`, `20261020010000_work_tracker_context`, `20261020020000_weekly_business_reports` using the repository's established Prisma/Turso safe-deploy workflow. Never reset the database or baseline all unapplied migrations blindly. Report DDL is also verified on authenticated feature initialization, following the existing ERP runtime-schema convention.
2. Install the existing dependencies with `npm ci`. Generate Prisma before starting a dev server/worker on Windows so the loaded DLL is not locked. Run checks and build.
3. Provision a Node runtime with a working Puppeteer Chromium binary, sufficient memory and request timeout. `REPORT_CHROME_EXECUTABLE_PATH` optionally selects an installed Chromium executable. This environment rendered successfully locally; production Vercel Chromium packaging is **not verified**. Existing Puppeteer externalization is reused; a missing production binary is a deployment blocker, not silently replaced with a fake PDF.
4. Reuse existing Zoho Mail settings: `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REDIRECT_URI`, data-center/from/name settings and existing secret encryption configuration, exactly as documented by the current email integration. Do not copy tokens into report settings.
5. Configure existing server-only `CRON_SECRET`. An external persistent scheduler must call `GET https://erp.khyatigems.com/api/cron/reports/weekly` **every minute**, with `Authorization: Bearer <CRON_SECRET>`. Do not put the secret in a URL. The endpoint requires the secret even in development. The schedule itself is read from ERP Settings on each invocation, not embedded in cron. Existing daily Vercel crons cannot honor arbitrary editable delivery times. Verify the production plan/trigger before promising 09:00 delivery. Settings displays the computed next scheduled slot and last dispatcher heartbeat, with an explicit unverified state if absent. The next slot is a schedule, not proof a trigger exists.
6. Generate a preview, review its coverage/exception register, save settings, send a test to the explicitly configured test recipient, inspect Zoho acceptance and attachment, then enable live delivery/automation. A real test email is an administrator action, not part of automated tests.

`dispatch()` persists heartbeat, checks the most recent due configured slot, uses one unique live key per reporting period, then processes bounded pending generation/delivery jobs. Generation claims have a ten-minute lease. Retries preserve the original scheduled period. Browser sessions and in-process timers are not required. A trigger outage spanning several weeks does not automatically backfill every missed week: the most recent due period is scheduled, while existing pending runs retain their periods. Define a backfill policy before adding historic catch-up.

### API

All private routes below use `/api/settings/weekly-reports`:

| Method / suffix | Capability |
|---|---|
| GET `/settings` (or base) | Validated settings/version, effective Zoho sender, shops, computed next slot, dispatcher heartbeat, last successful live acceptance |
| PUT `/settings` | `{settings,version,confirmRecipients}`; validation, permissions, optimistic save, matching-preview enable gate and audit |
| POST `/preview` | `{settings?}`; generate a non-sending real-data preview and return run ID |
| POST `/test` | `{confirmSend:true}`; saved settings, marked TEST email to configured test recipient |
| POST `/generate` | `{confirmSend:true}`; saved settings, live per-period idempotency |
| GET `/history?page=0&status=...` | 30 runs/page with recipient outcomes |
| GET `/runs/:id` | Snapshot/details without PDF base64/settings payload |
| GET `/runs/:id/pdf` | Authorized, checksummed private PDF stream |
| POST `/retry` | `{id:deliveryId,confirmSend:true}`; failed recipient only, bounded attempts |
| POST `/retry-generation` | `{id:runId,confirmSend:true}`; failed generation under attempt limit |

History supports status, generated-date and period-start date filters (explicitly labeled UTC), with pagination. Manual generation is limited to three runs/admin/minute. Retry actions require permission, confirmation and bounded attempt counts. Provider-uncertain outcomes cannot be retried by these APIs.

### Windows setup and rollback

PowerShell: `npm ci`, `npx prisma generate`, run the existing non-destructive database migration workflow, then `npm run dev`. A loaded `query_engine-windows.dll.node` can make `prisma generate` fail with EPERM: stop the ERP dev server normally, generate, then restart. Do not delete the engine DLL while it is loaded. `npm run test:weekly-reports`, `npm run test:weekly-reports:pdf`, `npm run test:weekly-reports:ui`, `npm run test:work-tracker`, `npx tsc --noEmit`, `npm run lint`, `npm run build` are available verification commands.

To roll back delivery, disable automatic reporting and live delivery in Settings and disable the external cron trigger. Roll back application code while preserving the additive tables and audit records. No destructive down migration is supplied. Restore from a verified backup only under the normal database recovery process; do not drop inventory/order tables or alter OAuth records. Re-enable only after reconciling SENDING/UNKNOWN recipient outcomes against Zoho Sent.

## Remaining production acceptance

Production cron installation/timing, deployed Chromium, database artifact capacity and real Zoho attachment acceptance have not been exercised. Tests use disposable databases and mocked delivery. Full authenticated interactive UI flows, external confirmed mailbox delivery, out-of-band failure alerts, all missed-week backfill remain pending. Historical datasets cannot be manufactured; the report discloses their absence.
