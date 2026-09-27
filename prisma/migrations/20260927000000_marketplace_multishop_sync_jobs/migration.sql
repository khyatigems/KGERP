ALTER TABLE "MarketplaceConnection" ADD COLUMN "externalAccountId" TEXT;
ALTER TABLE "Listing" ADD COLUMN "marketplaceShopId" TEXT;
ALTER TABLE "MarketplaceOrder" ADD COLUMN "marketplaceShopId" TEXT;
ALTER TABLE "MarketplaceSyncLog" ADD COLUMN "marketplaceShopId" TEXT;

DROP INDEX IF EXISTS "MarketplaceConnection_marketplace_key";
DROP INDEX IF EXISTS "MarketplaceOrder_marketplace_marketplaceOrderId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "MarketplaceConnection_marketplace_externalAccountId_key"
  ON "MarketplaceConnection"("marketplace", "externalAccountId");
CREATE INDEX IF NOT EXISTS "MarketplaceConnection_marketplace_idx"
  ON "MarketplaceConnection"("marketplace");
CREATE INDEX IF NOT EXISTS "Listing_marketplaceShopId_externalId_idx"
  ON "Listing"("marketplaceShopId", "externalId");
CREATE UNIQUE INDEX IF NOT EXISTS "Listing_marketplaceShopId_platform_externalId_key"
  ON "Listing"("marketplaceShopId", "platform", "externalId");
CREATE INDEX IF NOT EXISTS "MarketplaceOrder_marketplaceShopId_marketplaceOrderId_idx"
  ON "MarketplaceOrder"("marketplaceShopId", "marketplaceOrderId");
CREATE UNIQUE INDEX IF NOT EXISTS "MarketplaceOrder_marketplaceShopId_marketplace_marketplaceOrderId_key"
  ON "MarketplaceOrder"("marketplaceShopId", "marketplace", "marketplaceOrderId");
CREATE INDEX IF NOT EXISTS "MarketplaceSyncLog_marketplaceShopId_syncType_startedAt_idx"
  ON "MarketplaceSyncLog"("marketplaceShopId", "syncType", "startedAt");

CREATE TABLE "MarketplaceShop" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "connectionId" TEXT NOT NULL,
  "marketplace" TEXT NOT NULL,
  "externalShopId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'CONNECTED',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "MarketplaceShop_marketplace_externalShopId_key"
  ON "MarketplaceShop"("marketplace", "externalShopId");
CREATE INDEX "MarketplaceShop_connectionId_status_idx"
  ON "MarketplaceShop"("connectionId", "status");
CREATE INDEX "MarketplaceShop_marketplace_status_idx"
  ON "MarketplaceShop"("marketplace", "status");

CREATE TABLE "MarketplaceSyncJob" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "marketplaceShopId" TEXT NOT NULL,
  "syncType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "progressStep" TEXT NOT NULL DEFAULT 'Queued',
  "progressDetail" TEXT,
  "cursor" TEXT,
  "recordsScanned" INTEGER NOT NULL DEFAULT 0,
  "recordsCreated" INTEGER NOT NULL DEFAULT 0,
  "recordsUpdated" INTEGER NOT NULL DEFAULT 0,
  "recordsSkipped" INTEGER NOT NULL DEFAULT 0,
  "recordsFailed" INTEGER NOT NULL DEFAULT 0,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "errorDetails" TEXT,
  "requestedById" TEXT,
  "requestedBy" TEXT,
  "batchId" TEXT,
  "startedAt" DATETIME,
  "endedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE INDEX "MarketplaceSyncJob_status_createdAt_idx"
  ON "MarketplaceSyncJob"("status", "createdAt");
CREATE INDEX "MarketplaceSyncJob_batchId_idx"
  ON "MarketplaceSyncJob"("batchId");
CREATE INDEX "MarketplaceSyncJob_marketplaceShopId_syncType_createdAt_idx"
  ON "MarketplaceSyncJob"("marketplaceShopId", "syncType", "createdAt");
CREATE UNIQUE INDEX "MarketplaceSyncJob_active_shop_type_key"
  ON "MarketplaceSyncJob"("marketplaceShopId", "syncType")
  WHERE "status" IN ('QUEUED', 'PROCESSING');

CREATE TABLE "EbayWebhookNotification" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "notificationId" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "ebayUserId" TEXT,
  "ebayUsername" TEXT,
  "signatureValid" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'RECEIVED',
  "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" DATETIME,
  "errorDetails" TEXT
);
CREATE UNIQUE INDEX "EbayWebhookNotification_notificationId_key"
  ON "EbayWebhookNotification"("notificationId");
CREATE INDEX "EbayWebhookNotification_topic_receivedAt_idx"
  ON "EbayWebhookNotification"("topic", "receivedAt");
CREATE INDEX "EbayWebhookNotification_ebayUserId_idx"
  ON "EbayWebhookNotification"("ebayUserId");
CREATE INDEX "EbayWebhookNotification_status_idx"
  ON "EbayWebhookNotification"("status");