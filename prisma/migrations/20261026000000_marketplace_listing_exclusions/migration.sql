CREATE TABLE IF NOT EXISTS "MarketplaceListingExclusion" (
    "inventoryId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "marketplace" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("shopId", "marketplace", "inventoryId"),
    FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("shopId") REFERENCES "MarketplaceShop"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
