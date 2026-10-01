ALTER TABLE "MarketplaceConnection" ADD COLUMN "oauthAppProfile" TEXT;

-- Existing Etsy tokens remain encrypted and untouched. Record that they use
-- the existing Seller App credentials so refreshes keep using that app.
UPDATE "MarketplaceConnection"
SET "oauthAppProfile" = 'ETSY_SELLER_LEGACY'
WHERE "marketplace" = 'ETSY' AND "oauthAppProfile" IS NULL;
