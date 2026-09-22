import crypto from "crypto";
import { prisma } from "@/lib/prisma";

let ensuredFoundation = false;
let ensuringFoundation = false;
let ensureFoundationPromise: Promise<void> | null = null;

async function ensureColumnIfMissing(
  tableName: string,
  columnName: string,
  columnDefinition: string
) {
  try {
    const columns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
      `PRAGMA table_info("${tableName}")`
    );
    const hasColumn = Array.isArray(columns) && columns.some((col) => col.name === columnName);
    if (!hasColumn) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "${tableName}" ADD COLUMN ${columnDefinition};`);
    }
  } catch {
    // Swallow to preserve idempotent behaviour during safe deploys.
  }
}

const FEATURE_FLAGS: Array<[string, string]> = [
  ["marketplaceApiSyncEnabled", "Master switch for marketplace API synchronization (Phase 2+)"],
  ["ebaySyncEnabled", "Enables eBay read/sync via official API (Phase 3)"],
  ["etsySyncEnabled", "Enables Etsy read/sync via official API (Phase 4)"],
  ["newFulfillmentModelEnabled", "Enables listed-SKU vs fulfillment-SKU fulfillment model (Phase 7+)"],
  ["newEmailEngineEnabled", "Enables the centralized EmailService (Phase 12)"],
  ["gciCertificateIntegrationEnabled", "Enables GCI certificate retrieval integration (Phase 11)"],
];

export async function ensureMarketplaceFoundationSchema(): Promise<void> {
  if (ensuredFoundation) return;
  if (ensuringFoundation && ensureFoundationPromise) return ensureFoundationPromise;
  ensuringFoundation = true;
  ensureFoundationPromise = (async () => {
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "MarketplaceConnection" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "marketplace" TEXT NOT NULL,
          "name" TEXT,
          "authType" TEXT NOT NULL DEFAULT 'OAUTH2',
          "clientId" TEXT,
          "tokenRef" TEXT,
          "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
          "scopes" TEXT,
          "lastConnectedAt" DATETIME,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "MarketplaceConnection_marketplace_key" ON "MarketplaceConnection"("marketplace");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MarketplaceConnection_status_idx" ON "MarketplaceConnection"("status");`);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "MarketplaceSyncLog" (
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
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MarketplaceSyncLog_marketplace_syncType_idx" ON "MarketplaceSyncLog"("marketplace", "syncType");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MarketplaceSyncLog_status_idx" ON "MarketplaceSyncLog"("status");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MarketplaceSyncLog_startedAt_idx" ON "MarketplaceSyncLog"("startedAt");`);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "MarketplaceOrder" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "marketplace" TEXT NOT NULL,
          "marketplaceOrderId" TEXT NOT NULL,
          "orderNumber" TEXT,
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
        );
      `);
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "MarketplaceOrder_marketplace_marketplaceOrderId_key" ON "MarketplaceOrder"("marketplace", "marketplaceOrderId");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MarketplaceOrder_status_idx" ON "MarketplaceOrder"("status");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MarketplaceOrder_orderDate_idx" ON "MarketplaceOrder"("orderDate");`);
      await ensureColumnIfMissing("MarketplaceOrder", "marketplaceShopName", '"marketplaceShopName" TEXT');
      for (const [col, def] of [
        ["buyerCountry", '"buyerCountry" TEXT'],
        ["buyerCity", '"buyerCity" TEXT'],
        ["buyerState", '"buyerState" TEXT'],
        ["buyerZip", '"buyerZip" TEXT'],
        ["trackingCode", '"trackingCode" TEXT'],
        ["carrier", '"carrier" TEXT'],
      ] as Array<[string, string]>) {
        await ensureColumnIfMissing("MarketplaceOrder", col, def);
      }

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "MarketplaceOrderItem" (
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
        );
      `);
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "MarketplaceOrderItem_orderId_marketplaceItemId_key" ON "MarketplaceOrderItem"("orderId", "marketplaceItemId");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MarketplaceOrderItem_orderId_idx" ON "MarketplaceOrderItem"("orderId");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MarketplaceOrderItem_listedSku_idx" ON "MarketplaceOrderItem"("listedSku");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MarketplaceOrderItem_fulfillmentSku_idx" ON "MarketplaceOrderItem"("fulfillmentSku");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MarketplaceOrderItem_inventoryId_idx" ON "MarketplaceOrderItem"("inventoryId");`);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Document" (
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
        );
      `);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Document_orderId_idx" ON "Document"("orderId");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Document_saleId_idx" ON "Document"("saleId");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Document_invoiceId_idx" ON "Document"("invoiceId");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Document_customerId_idx" ON "Document"("customerId");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Document_type_idx" ON "Document"("type");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Document_certificateNumber_idx" ON "Document"("certificateNumber");`);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "EmailLog" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "customerId" TEXT,
          "orderId" TEXT,
          "templateKey" TEXT,
          "recipient" TEXT NOT NULL,
          "cc" TEXT,
          "bcc" TEXT,
          "subject" TEXT NOT NULL,
          "bodyRef" TEXT,
          "emailType" TEXT,
          "direction" TEXT NOT NULL DEFAULT 'OUTBOUND',
          "provider" TEXT,
          "providerMessageId" TEXT,
          "status" TEXT NOT NULL DEFAULT 'DRAFT',
          "sentAt" DATETIME,
          "deliveredAt" DATETIME,
          "openedAt" DATETIME,
          "failedAt" DATETIME,
          "errorMessage" TEXT,
          "attachmentsJson" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "EmailLog_customerId_idx" ON "EmailLog"("customerId");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "EmailLog_orderId_idx" ON "EmailLog"("orderId");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "EmailLog_status_idx" ON "EmailLog"("status");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "EmailLog_providerMessageId_idx" ON "EmailLog"("providerMessageId");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "EmailLog_createdAt_idx" ON "EmailLog"("createdAt");`);

      for (const [col, def] of [
        ["listingSku", '"listingSku" TEXT'],
        ["marketplaceTitle", '"marketplaceTitle" TEXT'],
        ["marketplacePrice", '"marketplacePrice" REAL'],
        ["marketplaceQuantity", '"marketplaceQuantity" INTEGER'],
        ["marketplaceViews", '"marketplaceViews" INTEGER'],
        ["marketplaceFavorites", '"marketplaceFavorites" INTEGER'],
        ["marketplaceOrders", '"marketplaceOrders" INTEGER'],
        ["marketplaceShopName", '"marketplaceShopName" TEXT'],
        ["syncStatus", '"syncStatus" TEXT'],
        ["syncError", '"syncError" TEXT'],
        ["lastSyncedAt", '"lastSyncedAt" DATETIME'],
        ["rawMetadata", '"rawMetadata" TEXT'],
      ] as Array<[string, string]>) {
        await ensureColumnIfMissing("Listing", col, def);
      }
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Listing_listingSku_idx" ON "Listing"("listingSku");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Listing_syncStatus_idx" ON "Listing"("syncStatus");`);

      for (const [col, def] of [
        ["listedSku", '"listedSku" TEXT'],
        ["fulfillmentSku", '"fulfillmentSku" TEXT'],
        ["fulfillmentReason", '"fulfillmentReason" TEXT'],
        ["marketplaceOrderItemId", '"marketplaceOrderItemId" TEXT'],
      ] as Array<[string, string]>) {
        await ensureColumnIfMissing("Sale", col, def);
      }

      for (const [col, def] of [
        ["subject", '"subject" TEXT'],
        ["htmlBody", '"htmlBody" TEXT'],
        ["plainTextBody", '"plainTextBody" TEXT'],
      ] as Array<[string, string]>) {
        await ensureColumnIfMissing("MessageTemplate", col, def);
      }

      await ensureColumnIfMissing("EmailLog", "direction", '"direction" TEXT DEFAULT \'OUTBOUND\'');

      for (const [key, description] of FEATURE_FLAGS) {
        await prisma.$executeRawUnsafe(
          `INSERT OR IGNORE INTO "Setting" ("id", "key", "value", "description", "updatedAt")
           VALUES (?, ?, 'false', ?, CURRENT_TIMESTAMP)`,
          crypto.randomUUID(),
          key,
          description
        );
      }
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
