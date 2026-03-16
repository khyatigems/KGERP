# Turso Safe Migration Procedure

## Preconditions
- `DATABASE_URL` must point to the production Turso database.
- `RUN_SAFE_MIGRATIONS=true` must be set for deployment migration safety workflow.
- Review migration SQL for intent before deployment.

## Data-Loss Gate
- Script: `npm run migrate:guard`
- Blocks deployment if migration SQL contains destructive patterns:
  - `DROP TABLE`
  - `DROP COLUMN`
  - `TRUNCATE`
  - `DELETE FROM`
- Override only after manual approval:
  - `ALLOW_DESTRUCTIVE_MIGRATION=true`

## Backup and Validation
- Pre-migration backup:
  - `npm run migrate:backup`
  - Output: `migration-artifacts/backups/*.json`
- Validation snapshots:
  - `npm run migrate:validate`
  - Output: `migration-artifacts/validation/*.json`
- Safe deploy orchestrator:
  - `npm run migrate:deploy:safe`
  - Sequence:
    1. Guard destructive SQL
    2. Backup
    3. Pre-validation snapshot
    4. `prisma migrate deploy`
    5. Post-validation snapshot

## Rollback Strategy
- If migration fails before apply:
  - No schema change is committed.
- If migration applies but app validation fails:
  - Stop rollout immediately.
  - Restore from pre-migration backup artifact.
  - Revert to last good application release.
- Operational recommendation:
  - Use Turso database branch promotion as blue-green strategy for instant cutover/rollback.

## Blue-Green Pattern
- Create green Turso branch from current production data snapshot.
- Run `migrate:deploy:safe` against green branch.
- Run app smoke tests against green branch.
- Switch production `DATABASE_URL` to green branch only after validation.
- Keep blue branch intact until post-release verification window ends.

## Required Post-Migration Checks
- `npm run build`
- `npx tsc --noEmit`
- `npm run test:export:queue`
- `npm run test:payments:reconcile`
- Manual smoke checks for reports/export endpoints.
