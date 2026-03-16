# Payments Report Reconciliation

## Issue
- Payments report showed only a subset of invoices because payment analytics depended solely on `Payment` rows and historical invoices lacked corresponding payment entries.

## Fix Implemented
- Added automatic historical reconciliation:
  - Scans all invoices.
  - Validates expected paid amounts using `paymentStatus` and `paidAmount`.
  - Backfills missing `Payment` entries with `method=OTHER` and reconciliation metadata.
  - Captures discrepancies and processing errors.
- Added validation metrics for completeness checks.
- Payments report now scans full history (no last-6-month hard filter) and runs reconciliation before analytics render.

## Key Components
- Reconciliation service: `lib/payment-reconciliation.ts`
- Payments report integration: `app/(dashboard)/reports/payments/page.tsx`
- Reconciliation API:
  - `GET /api/reports/payments/reconcile?dryRun=true|false`
  - `POST /api/reports/payments/reconcile` (admin settings permission)

## Data Validation and Error Handling
- Completeness checks:
  - total invoice count
  - total payment row count
  - paid-status invoices with near-zero paid amount
- Error handling:
  - transaction-protected backfill writes
  - per-invoice error capture without aborting entire run
  - discrepancy list when actual payments exceed expected paid values

## Reconciliation Backfill Behavior
- Expected paid amount derived per invoice:
  - `PAID` => full `totalAmount`
  - otherwise uses clamped `paidAmount`
- Missing delta creates a reconciliation payment entry with traceable reference.

## Verification
- Typecheck passes.
- Reports payment tests and build checks should include reconciliation pass and full-history visibility checks.
