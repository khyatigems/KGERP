import crypto from "crypto";
import { executeDdlBatch, getMissingColumns, buildAddColumnStatements, type DdlStatement } from "@/lib/prisma";

let ensuredFoundation = false;
let ensuringFoundation = false;
let ensureFoundationPromise: Promise<void> | null = null;

const FEATURE_FLAGS: Array<[string, string]> = [
  ["marketplaceApiSyncEnabled", "Master switch for marketplace API synchronization (Phase 2+)"],
  ["ebaySyncEnabled", "Enables eBay read/sync via official API (Phase 3)"],
  ["etsySyncEnabled", "Enables Etsy read/sync via official API (Phase 4)"],
  ["newFulfillmentModelEnabled", "Enables listed-SKU vs fulfillment-SKU fulfillment model (Phase 7+)"],
  ["newEmailEngineEnabled", "Enables the centralized EmailService (Phase 12)"],
  ["gciCertificateIntegrationEnabled", "Enables GCI certificate retrieval integration (Phase 11)"],
];

// Column checks are collected first, resolved with a single batched PRAGMA read
// and then applied â€” 3 round trips total instead of one per statement.
const COLUMN_CHECKS: Array<[string, string, string]> = [
  ["MarketplaceConnection", "externalAccountId", '"externalAccountId" TEXT'],
  ["MarketplaceConnection", "oauthAppProfile", '"oauthAppProfile" TEXT'],
  ["MarketplaceSyncLog", "marketplaceShopId", '"marketplaceShopId" TEXT'],
  ["MarketplaceSyncJob", "attempts", '"attempts" INTEGER NOT NULL DEFAULT 0'],
  ["MarketplaceOrder", "marketplaceShopId", '"marketplaceShopId" TEXT'],
  ["MarketplaceOrder", "marketplaceShopName", '"marketplaceShopName" TEXT'],
  ["MarketplaceOrder", "buyerCountry", '"buyerCountry" TEXT'],
  ["MarketplaceOrder", "buyerCity", '"buyerCity" TEXT'],
  ["MarketplaceOrder", "buyerState", '"buyerState" TEXT'],
  ["MarketplaceOrder", "buyerZip", '"buyerZip" TEXT'],
  ["MarketplaceOrder", "trackingCode", '"trackingCode" TEXT'],
  ["MarketplaceOrder", "carrier", '"carrier" TEXT'],
  ["Listing", "listingSku", '"listingSku" TEXT'],
  ["Listing", "marketplaceTitle", '"marketplaceTitle" TEXT'],
  ["Listing", "marketplacePrice", '"marketplacePrice" REAL'],
  ["Listing", "marketplaceQuantity", '"marketplaceQuantity" INTEGER'],
  ["Listing", "marketplaceViews", '"marketplaceViews" INTEGER'],
  ["Listing", "marketplaceFavorites", '"marketplaceFavorites" INTEGER'],
  ["Listing", "marketplaceOrders", '"marketplaceOrders" INTEGER'],
  ["Listing", "marketplaceShopName", '"marketplaceShopName" TEXT'],
  ["Listing", "marketplaceShopId", '"marketplaceShopId" TEXT'],
  ["Listing", "syncStatus", '"syncStatus" TEXT'],
  ["Listing", "syncError", '"syncError" TEXT'],
  ["Listing", "lastSyncedAt", '"lastSyncedAt" DATETIME'],
  ["Listing", "rawMetadata", '"rawMetadata" TEXT'],
  ["Sale", "listedSku", '"listedSku" TEXT'],
  ["Sale", "fulfillmentSku", '"fulfillmentSku" TEXT'],
  ["Sale", "fulfillmentReason", '"fulfillmentReason" TEXT'],
  ["Sale", "marketplaceOrderItemId", '"marketplaceOrderItemId" TEXT'],
  ["MessageTemplate", "subject", '"subject" TEXT'],
  ["MessageTemplate", "htmlBody", '"htmlBody" TEXT'],
  ["MessageTemplate", "plainTextBody", '"plainTextBody" TEXT'],
  ["EmailLog", "direction", '"direction" TEXT DEFAULT \'OUTBOUND\''],
  ["EmailLog", "bodyHtml", '"bodyHtml" TEXT'],
  ["EmailLog", "bodyText", '"bodyText" TEXT'],
  ["EmailLog", "payloadJson", '"payloadJson" TEXT'],
  ["EmailLog", "retryHistoryJson", '"retryHistoryJson" TEXT'],
  ["EmailLog", "idempotencyKey", '"idempotencyKey" TEXT'],
  ["EmailLog", "threadId", '"threadId" TEXT'],
  ["EmailLog", "messageId", '"messageId" TEXT'],
  ["EmailLog", "inReplyTo", '"inReplyTo" TEXT'],
  ["EmailLog", "referencesJson", '"referencesJson" TEXT'],
  ["EmailLog", "attemptCount", '"attemptCount" INTEGER NOT NULL DEFAULT 0'],
  ["EmailLog", "lastAttemptAt", '"lastAttemptAt" DATETIME'],
  ["EmailLog", "nextRetryAt", '"nextRetryAt" DATETIME'],
  ["EmailLog", "lastError", '"lastError" TEXT'],
  ["EmailLog", "failureCode", '"failureCode" TEXT'],
  ["EmailLog", "processingStartedAt", '"processingStartedAt" DATETIME'],
  ["EmailLog", "queuedAt", '"queuedAt" DATETIME'],
  ["EmailLog", "cancelledAt", '"cancelledAt" DATETIME'],
  ["EmailLog", "bouncedAt", '"bouncedAt" DATETIME'],
  ["EmailLog", "receivedAt", '"receivedAt" DATETIME'],
  ["EmailLog", "isRead", '"isRead" INTEGER NOT NULL DEFAULT 1'],
  ["EmailLog", "readAt", '"readAt" DATETIME'],
];

const CREATE_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS "MarketplaceConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "marketplace" TEXT NOT NULL,
    "externalAccountId" TEXT,
    "name" TEXT,
    "authType" TEXT NOT NULL DEFAULT 'OAUTH2',
    "oauthAppProfile" TEXT,
    "clientId" TEXT,
    "tokenRef" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
    "scopes" TEXT,
    "lastConnectedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE TABLE IF NOT EXISTS "MarketplaceShop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "connectionId" TEXT NOT NULL,
    "marketplace" TEXT NOT NULL,
    "externalShopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONNECTED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS "MarketplaceSyncLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "marketplace" TEXT NOT NULL,
    "syncType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "recordsScanned" INTEGER NOT NULL DEFAULT 0,
    "recordsCreated" INTEGER NOT NULL DEFAULT 0,
    "recordsUpdated" INTEGER NOT NULL DEFAULT 0,
    "recordsSkipped" INTEGER NOT NULL DEFAULT 0,
    "recordsFailed" INTEGER NOT NULL DEFAULT 0,
    "errorDetails" TEXT,
    "triggeredBy" TEXT,
    "marketplaceShopId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE TABLE IF NOT EXISTS "MarketplaceSyncJob" (
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
    "errorDetails" TEXT,
    "requestedById" TEXT,
    "requestedBy" TEXT,
    "batchId" TEXT,
    "startedAt" DATETIME,
    "endedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS "EbayWebhookNotification" (
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
  );`,
  `CREATE TABLE IF NOT EXISTS "MarketplaceOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "marketplace" TEXT NOT NULL,
    "marketplaceOrderId" TEXT NOT NULL,
    "orderNumber" TEXT,
    "marketplaceShopId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IMPORTED',
    "buyerName" TEXT,
    "buyerEmail" TEXT,
    "orderTotal" REAL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "orderDate" DATETIME,
    "rawMetadata" TEXT,
    "lastSyncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE TABLE IF NOT EXISTS "MarketplaceOrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "marketplaceItemId" TEXT,
    "listedSku" TEXT,
    "listedTitle" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" REAL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "fulfillmentSku" TEXT,
    "fulfillmentReason" TEXT,
    "inventoryId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rawMetadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE TABLE IF NOT EXISTS "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT,
    "orderId" TEXT,
    "saleId" TEXT,
    "invoiceId" TEXT,
    "type" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "sizeBytes" INTEGER,
    "storageProvider" TEXT NOT NULL DEFAULT 'CLOUDINARY',
    "storageRef" TEXT,
    "certificateNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE TABLE IF NOT EXISTS "EmailLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT,
    "orderId" TEXT,
    "templateKey" TEXT,
    "recipient" TEXT NOT NULL,
    "cc" TEXT,
    "bcc" TEXT,
    "subject" TEXT NOT NULL,
    "bodyRef" TEXT,
    "bodyHtml" TEXT,
    "bodyText" TEXT,
    "payloadJson" TEXT,
    "retryHistoryJson" TEXT,
    "threadId" TEXT,
    "messageId" TEXT,
    "inReplyTo" TEXT,
    "referencesJson" TEXT,
    "emailType" TEXT,
    "direction" TEXT NOT NULL DEFAULT 'OUTBOUND',
    "provider" TEXT,
    "providerMessageId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" DATETIME,
    "nextRetryAt" DATETIME,
    "lastError" TEXT,
    "failureCode" TEXT,
    "processingStartedAt" DATETIME,
    "queuedAt" DATETIME,
    "sentAt" DATETIME,
    "deliveredAt" DATETIME,
    "openedAt" DATETIME,
    "failedAt" DATETIME,
    "cancelledAt" DATETIME,
    "isRead" INTEGER NOT NULL DEFAULT 1,
    "readAt" DATETIME,
    "errorMessage" TEXT,
    "attachmentsJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE TABLE IF NOT EXISTS "EmailProviderEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "communicationId" TEXT NOT NULL,
    "providerMessageId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
];

// Index changes and setting seeds, kept in their original relative order.
const INDEX_AND_SEED_STATEMENTS: DdlStatement[] = [
  `DROP INDEX IF EXISTS "MarketplaceConnection_marketplace_key";`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "MarketplaceConnection_marketplace_externalAccountId_key" ON "MarketplaceConnection"("marketplace", "externalAccountId");`,
  `CREATE INDEX IF NOT EXISTS "MarketplaceConnection_status_idx" ON "MarketplaceConnection"("status");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "MarketplaceShop_marketplace_externalShopId_key" ON "MarketplaceShop"("marketplace", "externalShopId");`,
  `CREATE INDEX IF NOT EXISTS "MarketplaceShop_connectionId_status_idx" ON "MarketplaceShop"("connectionId", "status");`,
  `CREATE INDEX IF NOT EXISTS "MarketplaceShop_marketplace_status_idx" ON "MarketplaceShop"("marketplace", "status");`,
  `CREATE INDEX IF NOT EXISTS "MarketplaceSyncLog_marketplace_syncType_idx" ON "MarketplaceSyncLog"("marketplace", "syncType");`,
  `CREATE INDEX IF NOT EXISTS "MarketplaceSyncLog_status_idx" ON "MarketplaceSyncLog"("status");`,
  `CREATE INDEX IF NOT EXISTS "MarketplaceSyncLog_startedAt_idx" ON "MarketplaceSyncLog"("startedAt");`,
  `CREATE INDEX IF NOT EXISTS "MarketplaceSyncLog_marketplaceShopId_syncType_startedAt_idx" ON "MarketplaceSyncLog"("marketplaceShopId", "syncType", "startedAt");`,
  `CREATE INDEX IF NOT EXISTS "MarketplaceSyncJob_status_createdAt_idx" ON "MarketplaceSyncJob"("status", "createdAt");`,
  `CREATE INDEX IF NOT EXISTS "MarketplaceSyncJob_batchId_idx" ON "MarketplaceSyncJob"("batchId");`,
  `CREATE INDEX IF NOT EXISTS "MarketplaceSyncJob_marketplaceShopId_syncType_createdAt_idx" ON "MarketplaceSyncJob"("marketplaceShopId", "syncType", "createdAt");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "MarketplaceSyncJob_active_shop_type_key" ON "MarketplaceSyncJob"("marketplaceShopId", "syncType") WHERE "status" IN ('QUEUED', 'PROCESSING');`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "EbayWebhookNotification_notificationId_key" ON "EbayWebhookNotification"("notificationId");`,
  `CREATE INDEX IF NOT EXISTS "EbayWebhookNotification_topic_receivedAt_idx" ON "EbayWebhookNotification"("topic", "receivedAt");`,
  `CREATE INDEX IF NOT EXISTS "EbayWebhookNotification_ebayUserId_idx" ON "EbayWebhookNotification"("ebayUserId");`,
  `CREATE INDEX IF NOT EXISTS "EbayWebhookNotification_status_idx" ON "EbayWebhookNotification"("status");`,
  `DROP INDEX IF EXISTS "MarketplaceOrder_marketplace_marketplaceOrderId_key";`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "MarketplaceOrder_marketplaceShopId_marketplace_marketplaceOrderId_key" ON "MarketplaceOrder"("marketplaceShopId", "marketplace", "marketplaceOrderId");`,
  `CREATE INDEX IF NOT EXISTS "MarketplaceOrder_status_idx" ON "MarketplaceOrder"("status");`,
  `CREATE INDEX IF NOT EXISTS "MarketplaceOrder_orderDate_idx" ON "MarketplaceOrder"("orderDate");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "MarketplaceOrderItem_orderId_marketplaceItemId_key" ON "MarketplaceOrderItem"("orderId", "marketplaceItemId");`,
  `CREATE INDEX IF NOT EXISTS "MarketplaceOrderItem_orderId_idx" ON "MarketplaceOrderItem"("orderId");`,
  `CREATE INDEX IF NOT EXISTS "MarketplaceOrderItem_listedSku_idx" ON "MarketplaceOrderItem"("listedSku");`,
  `CREATE INDEX IF NOT EXISTS "MarketplaceOrderItem_fulfillmentSku_idx" ON "MarketplaceOrderItem"("fulfillmentSku");`,
  `CREATE INDEX IF NOT EXISTS "MarketplaceOrderItem_inventoryId_idx" ON "MarketplaceOrderItem"("inventoryId");`,
  `CREATE INDEX IF NOT EXISTS "Document_orderId_idx" ON "Document"("orderId");`,
  `CREATE INDEX IF NOT EXISTS "Document_saleId_idx" ON "Document"("saleId");`,
  `CREATE INDEX IF NOT EXISTS "Document_invoiceId_idx" ON "Document"("invoiceId");`,
  `CREATE INDEX IF NOT EXISTS "Document_customerId_idx" ON "Document"("customerId");`,
  `CREATE INDEX IF NOT EXISTS "Document_type_idx" ON "Document"("type");`,
  `CREATE INDEX IF NOT EXISTS "Document_certificateNumber_idx" ON "Document"("certificateNumber");`,
  `CREATE INDEX IF NOT EXISTS "EmailLog_customerId_idx" ON "EmailLog"("customerId");`,
  `CREATE INDEX IF NOT EXISTS "EmailLog_orderId_idx" ON "EmailLog"("orderId");`,
  `CREATE INDEX IF NOT EXISTS "EmailLog_status_idx" ON "EmailLog"("status");`,
  `CREATE INDEX IF NOT EXISTS "EmailLog_status_nextRetryAt_idx" ON "EmailLog"("status", "nextRetryAt");`,
  `CREATE INDEX IF NOT EXISTS "EmailLog_threadId_createdAt_idx" ON "EmailLog"("threadId", "createdAt");`,
  `CREATE INDEX IF NOT EXISTS "EmailLog_isRead_direction_createdAt_idx" ON "EmailLog"("isRead", "direction", "createdAt");`,
  `CREATE INDEX IF NOT EXISTS "EmailLog_messageId_idx" ON "EmailLog"("messageId");`,
  `CREATE INDEX IF NOT EXISTS "EmailLog_providerMessageId_idx" ON "EmailLog"("providerMessageId");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "EmailLog_idempotencyKey_key" ON "EmailLog"("idempotencyKey");`,
  `UPDATE "EmailLog" SET "status" = 'RECEIVED'
   WHERE "direction" = 'INBOUND' AND "status" = 'DELIVERED';`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "EmailProviderEvent_eventId_key" ON "EmailProviderEvent"("eventId");`,
  `CREATE INDEX IF NOT EXISTS "EmailProviderEvent_communicationId_occurredAt_idx" ON "EmailProviderEvent"("communicationId", "occurredAt");`,
  `CREATE INDEX IF NOT EXISTS "EmailProviderEvent_providerMessageId_idx" ON "EmailProviderEvent"("providerMessageId");`,
  `CREATE INDEX IF NOT EXISTS "EmailLog_createdAt_idx" ON "EmailLog"("createdAt");`,
  `CREATE INDEX IF NOT EXISTS "Listing_listingSku_idx" ON "Listing"("listingSku");`,
  `CREATE INDEX IF NOT EXISTS "Listing_syncStatus_idx" ON "Listing"("syncStatus");`,
  `CREATE INDEX IF NOT EXISTS "Listing_marketplaceShopId_externalId_idx" ON "Listing"("marketplaceShopId", "externalId");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Listing_marketplaceShopId_platform_externalId_key" ON "Listing"("marketplaceShopId", "platform", "externalId");`,
  ...FEATURE_FLAGS.map(([key, description]): DdlStatement => ({
    sql: `INSERT OR IGNORE INTO "Setting" ("id", "key", "value", "description", "updatedAt")
          VALUES (?, ?, 'false', ?, CURRENT_TIMESTAMP)`,
    args: [crypto.randomUUID(), key, description],
  })),
];

export async function ensureMarketplaceFoundationSchema(): Promise<void> {
  if (ensuredFoundation) return;
  if (ensuringFoundation && ensureFoundationPromise) return ensureFoundationPromise;
  ensuringFoundation = true;
  ensureFoundationPromise = (async () => {
    try {
      // 1) create tables, 2) read existing columns, 3) add columns + indexes + seeds
      await executeDdlBatch(CREATE_STATEMENTS);
      const missing = await getMissingColumns(COLUMN_CHECKS.map(([table, column]) => [table, column]));
      await executeDdlBatch([
        ...buildAddColumnStatements(COLUMN_CHECKS, missing),
        // Preserve legacy Etsy grants as-is while making their app identity
        // explicit. This never reads or rewrites tokenRef values.
        `UPDATE "MarketplaceConnection" SET "oauthAppProfile" = 'ETSY_SELLER_LEGACY'
         WHERE "marketplace" = 'ETSY' AND "oauthAppProfile" IS NULL;`,
        ...INDEX_AND_SEED_STATEMENTS,
      ]);
    } catch (e) {
      console.error("ensureMarketplaceFoundationSchema failed:", e);
    } finally {
      ensuredFoundation = true;
      ensuringFoundation = false;
      ensureFoundationPromise = null;
    }
  })();
  return ensureFoundationPromise;
}
