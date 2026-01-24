/*
  Warnings:

  - Added the required column `category` to the `Inventory` table without a default value. This is not possible if the table is not empty.
  - Made the column `category` on table `PurchaseItem` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updatedAt` to the `Quotation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN "forceLogoutBefore" DATETIME;
ALTER TABLE "User" ADD COLUMN "lastLogin" DATETIME;
ALTER TABLE "User" ADD COLUMN "lastPasswordChange" DATETIME;

-- CreateTable
CREATE TABLE "LandingPageSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brandTitle" TEXT NOT NULL DEFAULT 'KhyatiGems™ ERP',
    "subtitle" TEXT NOT NULL DEFAULT 'Internal Operations & Management Platform',
    "accessNotice" TEXT NOT NULL DEFAULT 'Authorized internal access only',
    "slideshowEnabled" BOOLEAN NOT NULL DEFAULT true,
    "highlightsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "whatsNewEnabled" BOOLEAN NOT NULL DEFAULT false,
    "highlights" TEXT NOT NULL DEFAULT '[]',
    "whatsNewText" TEXT,
    "whatsNewUpdatedAt" DATETIME,
    "activeVersion" INTEGER NOT NULL DEFAULT 1,
    "updatedByUserId" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LandingPageSlide" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "settingsId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "LandingPageVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "versionNumber" INTEGER NOT NULL,
    "snapshot" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRollback" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "LabelCartItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "LabelPrintJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "printFormat" TEXT NOT NULL,
    "totalItems" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "LabelPrintJobItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "sellingPrice" REAL NOT NULL,
    "priceWithChecksum" TEXT NOT NULL,
    "checksumDigit" INTEGER NOT NULL,
    "checksumMethod" TEXT NOT NULL DEFAULT 'MOD9',
    "encodingVersion" INTEGER NOT NULL DEFAULT 1
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inventoryId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "listingUrl" TEXT,
    "listingRef" TEXT,
    "listedPrice" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "listedDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'LISTED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ListingPriceHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listingId" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "gstin" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PriceOverrideAudit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationItemId" TEXT NOT NULL,
    "oldValue" REAL,
    "newValue" REAL,
    "oldFinalPrice" REAL,
    "newFinalPrice" REAL,
    "changedByUserId" TEXT,
    "reason" TEXT,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ApprovalRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ruleType" TEXT NOT NULL,
    "thresholdValue" REAL NOT NULL,
    "requiresRole" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SalesMarginAnalytics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "quotationId" TEXT,
    "invoiceId" TEXT,
    "erpTotal" REAL NOT NULL,
    "finalTotal" REAL NOT NULL,
    "marginValue" REAL NOT NULL,
    "marginPercent" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "QuotationAcceptance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationId" TEXT NOT NULL,
    "acceptedByName" TEXT NOT NULL,
    "acceptedVia" TEXT NOT NULL,
    "acceptedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT
);

-- CreateTable
CREATE TABLE "QuotationSignature" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationId" TEXT NOT NULL,
    "signerName" TEXT NOT NULL,
    "signerEmail" TEXT NOT NULL,
    "signatureFile" TEXT NOT NULL,
    "signedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signatureHash" TEXT
);

-- CreateTable
CREATE TABLE "CategoryCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GemstoneCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ColorCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CollectionCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CutCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RashiCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityIdentifier" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "fieldChanges" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "userName" TEXT,
    "userEmail" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "source" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_InventoryToRashiCode" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Inventory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sku" TEXT NOT NULL,
    "categoryCodeId" TEXT,
    "gemstoneCodeId" TEXT,
    "colorCodeId" TEXT,
    "collectionCodeId" TEXT,
    "cutCodeId" TEXT,
    "itemName" TEXT NOT NULL,
    "internalName" TEXT,
    "category" TEXT NOT NULL,
    "gemType" TEXT NOT NULL,
    "shape" TEXT,
    "dimensionsMm" TEXT,
    "weightValue" REAL NOT NULL,
    "weightUnit" TEXT NOT NULL,
    "weightRatti" REAL,
    "treatment" TEXT,
    "certification" TEXT,
    "pricingMode" TEXT NOT NULL,
    "purchaseRatePerCarat" REAL,
    "sellingRatePerCarat" REAL,
    "flatPurchaseCost" REAL,
    "flatSellingPrice" REAL,
    "profit" REAL NOT NULL,
    "vendorId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_STOCK',
    "stockLocation" TEXT,
    "notes" TEXT,
    "braceletType" TEXT,
    "beadSizeMm" REAL,
    "beadCount" INTEGER,
    "holeSizeMm" REAL,
    "innerCircumferenceMm" REAL,
    "standardSize" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Inventory" ("certification", "createdAt", "createdBy", "dimensionsMm", "flatPurchaseCost", "flatSellingPrice", "gemType", "id", "internalName", "itemName", "notes", "pricingMode", "profit", "purchaseRatePerCarat", "sellingRatePerCarat", "shape", "sku", "status", "stockLocation", "treatment", "vendorId", "weightUnit", "weightValue") SELECT "certification", "createdAt", "createdBy", "dimensionsMm", "flatPurchaseCost", "flatSellingPrice", "gemType", "id", "internalName", "itemName", "notes", "pricingMode", "profit", "purchaseRatePerCarat", "sellingRatePerCarat", "shape", "sku", "status", "stockLocation", "treatment", "vendorId", "weightUnit", "weightValue" FROM "Inventory";
DROP TABLE "Inventory";
ALTER TABLE "new_Inventory" RENAME TO "Inventory";
CREATE UNIQUE INDEX "Inventory_sku_key" ON "Inventory"("sku");
CREATE INDEX "Inventory_vendorId_idx" ON "Inventory"("vendorId");
CREATE INDEX "Inventory_status_idx" ON "Inventory"("status");
CREATE INDEX "Inventory_sku_idx" ON "Inventory"("sku");
CREATE TABLE "new_PurchaseItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "shape" TEXT,
    "sizeValue" TEXT,
    "sizeUnit" TEXT,
    "beadSizeMm" REAL,
    "weightType" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "costPerUnit" REAL NOT NULL,
    "totalCost" REAL NOT NULL,
    "remarks" TEXT
);
INSERT INTO "new_PurchaseItem" ("beadSizeMm", "category", "costPerUnit", "id", "itemName", "purchaseId", "quantity", "remarks", "shape", "totalCost", "weightType") SELECT "beadSizeMm", "category", "costPerUnit", "id", "itemName", "purchaseId", "quantity", "remarks", "shape", "totalCost", "weightType" FROM "PurchaseItem";
DROP TABLE "PurchaseItem";
ALTER TABLE "new_PurchaseItem" RENAME TO "PurchaseItem";
CREATE INDEX "PurchaseItem_purchaseId_idx" ON "PurchaseItem"("purchaseId");
CREATE TABLE "new_Quotation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT,
    "customerMobile" TEXT,
    "customerEmail" TEXT,
    "customerCity" TEXT,
    "expiryDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalAmount" REAL NOT NULL,
    "token" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "approvedByUserId" TEXT,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Quotation" ("createdAt", "customerCity", "customerEmail", "customerMobile", "customerName", "expiryDate", "id", "quotationNumber", "status", "token", "totalAmount") SELECT "createdAt", "customerCity", "customerEmail", "customerMobile", "customerName", "expiryDate", "id", "quotationNumber", "status", "token", "totalAmount" FROM "Quotation";
DROP TABLE "Quotation";
ALTER TABLE "new_Quotation" RENAME TO "Quotation";
CREATE UNIQUE INDEX "Quotation_quotationNumber_key" ON "Quotation"("quotationNumber");
CREATE UNIQUE INDEX "Quotation_token_key" ON "Quotation"("token");
CREATE TABLE "new_QuotationItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationId" TEXT NOT NULL,
    "inventoryId" TEXT,
    "sku" TEXT,
    "itemName" TEXT NOT NULL,
    "weight" TEXT,
    "erpBasePrice" REAL NOT NULL DEFAULT 0,
    "priceOverrideType" TEXT,
    "priceOverrideValue" REAL,
    "finalUnitPrice" REAL NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "subtotal" REAL NOT NULL DEFAULT 0,
    "quotedPrice" REAL
);
INSERT INTO "new_QuotationItem" ("id", "inventoryId", "itemName", "quotationId", "quotedPrice", "sku", "weight") SELECT "id", "inventoryId", "itemName", "quotationId", "quotedPrice", "sku", "weight" FROM "QuotationItem";
DROP TABLE "QuotationItem";
ALTER TABLE "new_QuotationItem" RENAME TO "QuotationItem";
CREATE INDEX "QuotationItem_quotationId_idx" ON "QuotationItem"("quotationId");
CREATE INDEX "QuotationItem_inventoryId_idx" ON "QuotationItem"("inventoryId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "LandingPageSlide_settingsId_idx" ON "LandingPageSlide"("settingsId");

-- CreateIndex
CREATE INDEX "LandingPageVersion_createdByUserId_idx" ON "LandingPageVersion"("createdByUserId");

-- CreateIndex
CREATE INDEX "LabelCartItem_userId_idx" ON "LabelCartItem"("userId");

-- CreateIndex
CREATE INDEX "LabelCartItem_inventoryId_idx" ON "LabelCartItem"("inventoryId");

-- CreateIndex
CREATE INDEX "LabelPrintJob_userId_idx" ON "LabelPrintJob"("userId");

-- CreateIndex
CREATE INDEX "LabelPrintJobItem_jobId_idx" ON "LabelPrintJobItem"("jobId");

-- CreateIndex
CREATE INDEX "Listing_inventoryId_idx" ON "Listing"("inventoryId");

-- CreateIndex
CREATE INDEX "Listing_platform_idx" ON "Listing"("platform");

-- CreateIndex
CREATE INDEX "Listing_status_idx" ON "Listing"("status");

-- CreateIndex
CREATE INDEX "ListingPriceHistory_listingId_idx" ON "ListingPriceHistory"("listingId");

-- CreateIndex
CREATE INDEX "PriceOverrideAudit_quotationItemId_idx" ON "PriceOverrideAudit"("quotationItemId");

-- CreateIndex
CREATE INDEX "SalesMarginAnalytics_userId_idx" ON "SalesMarginAnalytics"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "QuotationAcceptance_quotationId_key" ON "QuotationAcceptance"("quotationId");

-- CreateIndex
CREATE INDEX "QuotationSignature_quotationId_idx" ON "QuotationSignature"("quotationId");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryCode_code_key" ON "CategoryCode"("code");

-- CreateIndex
CREATE INDEX "CategoryCode_status_idx" ON "CategoryCode"("status");

-- CreateIndex
CREATE UNIQUE INDEX "GemstoneCode_code_key" ON "GemstoneCode"("code");

-- CreateIndex
CREATE INDEX "GemstoneCode_status_idx" ON "GemstoneCode"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ColorCode_code_key" ON "ColorCode"("code");

-- CreateIndex
CREATE INDEX "ColorCode_status_idx" ON "ColorCode"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionCode_code_key" ON "CollectionCode"("code");

-- CreateIndex
CREATE INDEX "CollectionCode_status_idx" ON "CollectionCode"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CutCode_code_key" ON "CutCode"("code");

-- CreateIndex
CREATE INDEX "CutCode_status_idx" ON "CutCode"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RashiCode_code_key" ON "RashiCode"("code");

-- CreateIndex
CREATE INDEX "RashiCode_status_idx" ON "RashiCode"("status");

-- CreateIndex
CREATE INDEX "ActivityLog_entityType_entityId_idx" ON "ActivityLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ActivityLog_timestamp_idx" ON "ActivityLog"("timestamp");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "_InventoryToRashiCode_AB_unique" ON "_InventoryToRashiCode"("A", "B");

-- CreateIndex
CREATE INDEX "_InventoryToRashiCode_B_index" ON "_InventoryToRashiCode"("B");
