-- Drop old indexes
DROP INDEX IF EXISTS "ListingOpportunity_marketplace_trendScore_idx";
DROP INDEX IF EXISTS "ListingOpportunity_isListed_isInStock_idx";

-- Drop old columns
ALTER TABLE "ListingOpportunity" DROP COLUMN "viewsDelta7d";
ALTER TABLE "ListingOpportunity" DROP COLUMN "watchesDelta7d";
ALTER TABLE "ListingOpportunity" DROP COLUMN "trendScore";
ALTER TABLE "ListingOpportunity" DROP COLUMN "isListed";
ALTER TABLE "ListingOpportunity" DROP COLUMN "isInStock";

-- Add new columns
ALTER TABLE "ListingOpportunity" ADD COLUMN "currentOrders" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ListingOpportunity" ADD COLUMN "currentRevenue" REAL NOT NULL DEFAULT 0;
ALTER TABLE "ListingOpportunity" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE "ListingOpportunity" ADD COLUMN "lastSyncedAt" DATETIME;

-- Drop all existing rows (clean slate - user confirmed)
DELETE FROM "ListingOpportunity";

-- Add new indexes
CREATE INDEX "ListingOpportunity_marketplace_externalId_idx" ON "ListingOpportunity"("marketplace", "externalId");
CREATE INDEX "ListingOpportunity_lastSyncedAt_idx" ON "ListingOpportunity"("lastSyncedAt");
