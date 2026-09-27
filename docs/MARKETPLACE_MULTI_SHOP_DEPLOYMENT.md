# Marketplace Multi-Shop Deployment

## Database rollout

The multi-shop schema is an additive migration:

- `prisma/migrations/20260927000000_marketplace_multishop_sync_jobs/migration.sql`
- Adds marketplace shop/account identity, durable sync jobs, and webhook notification deduplication.
- Replaces platform-only listing/order uniqueness with shop-scoped indexes. Existing records remain in place with a null shop ID.

Apply it to a reviewed Turso branch before deploying the application:

1. Set `DATABASE_URL` to the target branch and `RUN_SAFE_MIGRATIONS=true`.
2. Run `npm run migrate:deploy:safe` and review the backup and validation artifacts.
3. Deploy the application only after the migration succeeds.
4. Reconnect legacy marketplace accounts in Marketplace > Connections so OAuth can register their external account and shop IDs. Existing tokens are not returned to the browser.

The Vercel build script does not apply database migrations automatically.

## Application environment

Configure application-level credentials only; do not add per-shop variables:

- eBay: `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`, `EBAY_RU_NAME`.
- eBay sandbox testing only: `EBAY_ENVIRONMENT=sandbox`. Production is the default.
- Etsy: `ETSY_CLIENT_ID`, `ETSY_SHARED_SECRET`, `ETSY_REDIRECT_URI`. Existing aliases remain supported by the connector.
- Token encryption: `ERP_SECRET_ENCRYPTION_KEY` with at least 16 characters. Use a stable, high-entropy secret and preserve it across deployments so stored tokens remain decryptable.
- Scheduled worker authorization: `CRON_SECRET`.

Register the OAuth callback URL `/api/integrations/marketplace/oauth/callback` with each marketplace application. Etsy must use the exact configured redirect URI.

## Sync worker

Vercel runs `/api/cron/marketplace/sync` every minute. The worker handles bounded pages and records progress in the database; manual sync actions also kick off an initial bounded batch. The scheduled endpoint requires `CRON_SECRET` in production.

The minute schedule requires a Vercel plan that supports subdaily cron jobs. If the deployment plan does not support it, use an external scheduler to call the protected cron endpoint; do not move full sync work into the browser request.