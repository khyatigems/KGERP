-- Replace the single-column UNIQUE on inventoryId with a composite
-- UNIQUE on (inventoryId, marketplace) so the same SKU can hold
-- separate engagement caches for Etsy and eBay simultaneously.

CREATE TABLE "ListingOpportunity_new" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "inventoryId" TEXT NOT NULL,
  "marketplace" TEXT NOT NULL,
  "externalId" TEXT,
  "currentViews" INTEGER NOT NULL DEFAULT 0,
  "currentWatches" INTEGER NOT NULL DEFAULT 0,
  "currentFavourites" INTEGER NOT NULL DEFAULT 0,
  "currentOrders" INTEGER NOT NULL DEFAULT 0,
  "currentRevenue" REAL NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "lastSyncedAt" DATETIME,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ListingOpportunity_new_inventoryId_fkey"
    FOREIGN KEY ("inventoryId") REFERENCES "Inventory" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "ListingOpportunity_new"
  ("id", "inventoryId", "marketplace", "externalId",
   "currentViews", "currentWatches", "currentFavourites",
   "currentOrders", "currentRevenue", "currency",
   "lastSyncedAt", "updatedAt")
SELECT
  "id", "inventoryId", "marketplace", "externalId",
  "currentViews", "currentWatches", "currentFavourites",
  "currentOrders", "currentRevenue", "currency",
  "lastSyncedAt", "updatedAt"
FROM "ListingOpportunity";

DROP TABLE "ListingOpportunity";
ALTER TABLE "ListingOpportunity_new" RENAME TO "ListingOpportunity";

DROP INDEX IF EXISTS "ListingOpportunity_inventoryId_key";

CREATE INDEX "ListingOpportunity_marketplace_externalId_idx"
  ON "ListingOpportunity"("marketplace", "externalId");
CREATE INDEX "ListingOpportunity_lastSyncedAt_idx"
  ON "ListingOpportunity"("lastSyncedAt");
CREATE UNIQUE INDEX "ListingOpportunity_inventoryId_marketplace_key"
  ON "ListingOpportunity"("inventoryId", "marketplace");
