-- Older shared listing syncs hard-coded eBay sources for Etsy observations.
-- Require agreement between the listing and connected shop; preserve all values/dates.
UPDATE "ListingPriceHistory"
SET "changedBy" = CASE "changedBy"
  WHEN 'EBAY_SYNC' THEN 'ETSY_SYNC'
  WHEN 'EBAY_SYNC_INITIAL' THEN 'ETSY_SYNC_INITIAL'
END
WHERE "changedBy" IN ('EBAY_SYNC', 'EBAY_SYNC_INITIAL')
  AND "listingId" IN (
    SELECT l."id"
    FROM "Listing" l
    JOIN "MarketplaceShop" s ON s."id" = l."marketplaceShopId"
    WHERE l."platform" = 'ETSY' AND s."marketplace" = 'ETSY'
  );
