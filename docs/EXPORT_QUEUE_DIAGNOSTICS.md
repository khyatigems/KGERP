# Export Queue Diagnostics and Fix

## Root Cause
- Export queue worker executed report analytics through cached helpers tied to `unstable_cache`.
- Background execution path (fire-and-forget queue trigger) ran without `incrementalCache` context, causing failures with:
  - `Invariant: incrementalCache missing in unstable_cache`
- Impact: queued jobs moved to `FAILED` with no downloadable output.

## Corrections
- Added uncached analytics builders and switched queue processor + download generator to uncached functions.
- Added stale `PROCESSING` recovery (auto re-queue after timeout window).
- Added stricter report-type validation at queue creation.
- Improved immediate trigger behavior and logging on trigger failure.
- Added cron-auth observability when unauthorized/misconfigured.
- Restricted job status PATCH endpoint to settings-manage role.
- Added UI submission error display in Export Job Center.
- Added deployment migration step for production safety (`prisma migrate deploy`).

## Verification Checklist
- Queue job for `inventory` and `capital-rotation` succeeds.
- Worker reports `processed/completed/failed/staleRecovered`.
- Failed jobs retain concise error message; server logs include stack snippet.
- Cron endpoint logs unauthorized attempts with minimal metadata.
- Build pipeline applies migrations before build.

## Test Coverage
- Integration test:
  - `npm run test:export:queue`
  - Confirms queued jobs are processed and reach `COMPLETED`.
