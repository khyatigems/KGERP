/*
  Warnings:

  - You are about to drop the `ApprovalRule` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PublicLinkEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PurchaseItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QuotationAcceptance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QuotationSignature` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `company_settings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payment_settings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sku_media` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `timestamp` on the `ActivityLog` table. All the data in the column will be lost.
  - You are about to drop the column `createdBy` on the `Inventory` table. All the data in the column will be lost.
  - You are about to drop the column `saleId` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `LabelCartItem` table. All the data in the column will be lost.
  - You are about to drop the column `timestamp` on the `LabelPrintJob` table. All the data in the column will be lost.
  - You are about to drop the column `changedAt` on the `PriceOverrideAudit` table. All the data in the column will be lost.
  - You are about to drop the column `changedByUserId` on the `PriceOverrideAudit` table. All the data in the column will be lost.
  - You are about to drop the column `newFinalPrice` on the `PriceOverrideAudit` table. All the data in the column will be lost.
  - You are about to drop the column `newValue` on the `PriceOverrideAudit` table. All the data in the column will be lost.
  - You are about to drop the column `oldFinalPrice` on the `PriceOverrideAudit` table. All the data in the column will be lost.
  - You are about to drop the column `oldValue` on the `PriceOverrideAudit` table. All the data in the column will be lost.
  - You are about to drop the column `quotationItemId` on the `PriceOverrideAudit` table. All the data in the column will be lost.
  - You are about to drop the column `remarks` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `approvedAt` on the `Quotation` table. All the data in the column will be lost.
  - You are about to drop the column `approvedByUserId` on the `Quotation` table. All the data in the column will be lost.
  - You are about to drop the column `createdByUserId` on the `Quotation` table. All the data in the column will be lost.
  - You are about to drop the column `erpBasePrice` on the `QuotationItem` table. All the data in the column will be lost.
  - You are about to drop the column `finalUnitPrice` on the `QuotationItem` table. All the data in the column will be lost.
  - You are about to drop the column `itemName` on the `QuotationItem` table. All the data in the column will be lost.
  - You are about to drop the column `priceOverrideType` on the `QuotationItem` table. All the data in the column will be lost.
  - You are about to drop the column `priceOverrideValue` on the `QuotationItem` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `QuotationItem` table. All the data in the column will be lost.
  - You are about to drop the column `sku` on the `QuotationItem` table. All the data in the column will be lost.
  - You are about to drop the column `subtotal` on the `QuotationItem` table. All the data in the column will be lost.
  - You are about to drop the column `weight` on the `QuotationItem` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Sale` table. All the data in the column will be lost.
  - You are about to drop the column `discount` on the `Sale` table. All the data in the column will be lost.
  - You are about to drop the column `gstAmount` on the `Sale` table. All the data in the column will be lost.
  - You are about to drop the column `gstApplicable` on the `Sale` table. All the data in the column will be lost.
  - You are about to drop the column `paymentMode` on the `Sale` table. All the data in the column will be lost.
  - You are about to drop the column `remarks` on the `Sale` table. All the data in the column will be lost.
  - You are about to drop the column `sellingPrice` on the `Sale` table. All the data in the column will be lost.
  - You are about to drop the column `shippingMethod` on the `Sale` table. All the data in the column will be lost.
  - You are about to drop the column `trackingId` on the `Sale` table. All the data in the column will be lost.
  - You are about to drop the column `erpTotal` on the `SalesMarginAnalytics` table. All the data in the column will be lost.
  - You are about to drop the column `finalTotal` on the `SalesMarginAnalytics` table. All the data in the column will be lost.
  - You are about to drop the column `invoiceId` on the `SalesMarginAnalytics` table. All the data in the column will be lost.
  - You are about to drop the column `marginPercent` on the `SalesMarginAnalytics` table. All the data in the column will be lost.
  - You are about to drop the column `marginValue` on the `SalesMarginAnalytics` table. All the data in the column will be lost.
  - You are about to drop the column `quotationId` on the `SalesMarginAnalytics` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `CategoryCode` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `CollectionCode` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `ColorCode` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `CutCode` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `GemstoneCode` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `RashiCode` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `costPrice` to the `Inventory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sellingPrice` to the `Inventory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Inventory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `discountTotal` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subtotal` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `taxTotal` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalAmount` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `inventoryId` to the `PriceOverrideAudit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `newPrice` to the `PriceOverrideAudit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `originalPrice` to the `PriceOverrideAudit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `PriceOverrideAudit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalAmount` to the `Purchase` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Purchase` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdById` to the `Quotation` table without a default value. This is not possible if the table is not empty.
  - Made the column `customerName` on table `Quotation` required. This step will fail if there are existing NULL values in that column.
  - Made the column `inventoryId` on table `QuotationItem` required. This step will fail if there are existing NULL values in that column.
  - Made the column `quotedPrice` on table `QuotationItem` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `salePrice` to the `Sale` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cost` to the `SalesMarginAnalytics` table without a default value. This is not possible if the table is not empty.
  - Added the required column `endDate` to the `SalesMarginAnalytics` table without a default value. This is not possible if the table is not empty.
  - Added the required column `margin` to the `SalesMarginAnalytics` table without a default value. This is not possible if the table is not empty.
  - Added the required column `period` to the `SalesMarginAnalytics` table without a default value. This is not possible if the table is not empty.
  - Added the required column `revenue` to the `SalesMarginAnalytics` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startDate` to the `SalesMarginAnalytics` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Vendor` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "CategoryCode_status_idx";

-- DropIndex
DROP INDEX "CollectionCode_status_idx";

-- DropIndex
DROP INDEX "ColorCode_status_idx";

-- DropIndex
DROP INDEX "CutCode_status_idx";

-- DropIndex
DROP INDEX "GemstoneCode_status_idx";

-- DropIndex
DROP INDEX "PublicLinkEvent_refId_idx";

-- DropIndex
DROP INDEX "PurchaseItem_purchaseId_idx";

-- DropIndex
DROP INDEX "QuotationAcceptance_quotationId_key";

-- DropIndex
DROP INDEX "QuotationSignature_quotationId_idx";

-- DropIndex
DROP INDEX "RashiCode_status_idx";

-- DropIndex
DROP INDEX "sku_media_sku_id_idx";

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "country" TEXT;
ALTER TABLE "Customer" ADD COLUMN "pan" TEXT;
ALTER TABLE "Customer" ADD COLUMN "pincode" TEXT;

-- AlterTable
ALTER TABLE "Setting" ADD COLUMN "description" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "avatar" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ApprovalRule";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "PublicLinkEvent";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "PurchaseItem";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "QuotationAcceptance";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "QuotationSignature";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "company_settings";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "payment_settings";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "sku_media";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "InventoryMedia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inventoryId" TEXT NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Memo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerName" TEXT NOT NULL,
    "issueDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "notes" TEXT
);

-- CreateTable
CREATE TABLE "MemoItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memoId" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WITH_CLIENT'
);

-- CreateTable
CREATE TABLE "InvoiceVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "reason" TEXT,
    "snapshot" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CompanySettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyName" TEXT NOT NULL,
    "address" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "country" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "gstin" TEXT,
    "pan" TEXT,
    "bankName" TEXT,
    "bankAccountNo" TEXT,
    "bankIfsc" TEXT,
    "bankBranch" TEXT,
    "logoUrl" TEXT,
    "invoiceLogoUrl" TEXT,
    "quotationLogoUrl" TEXT,
    "termsAndConditions" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "InvoiceSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prefix" TEXT NOT NULL DEFAULT 'INV',
    "currencySymbol" TEXT NOT NULL DEFAULT '₹',
    "digitalSignatureUrl" TEXT,
    "terms" TEXT,
    "footerNotes" TEXT,
    "gstEnabled" BOOLEAN NOT NULL DEFAULT false,
    "gstType" TEXT NOT NULL DEFAULT 'CGST_SGST',
    "categoryGstRates" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PaymentSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "upiEnabled" BOOLEAN NOT NULL DEFAULT false,
    "upiId" TEXT,
    "upiPayeeName" TEXT,
    "upiQrUrl" TEXT,
    "bankEnabled" BOOLEAN NOT NULL DEFAULT false,
    "bankName" TEXT,
    "accountNumber" TEXT,
    "ifscCode" TEXT,
    "accountHolder" TEXT,
    "razorpayEnabled" BOOLEAN NOT NULL DEFAULT false,
    "razorpayKeyId" TEXT,
    "razorpayKeySecret" TEXT,
    "razorpayButtonId" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DashboardNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'yellow',
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "entityIdentifier" TEXT,
    "actionType" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT,
    "userEmail" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "source" TEXT,
    "fieldChanges" TEXT,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_ActivityLog" ("actionType", "entityId", "entityIdentifier", "entityType", "fieldChanges", "id", "ipAddress", "source", "userAgent", "userEmail", "userId", "userName") SELECT "actionType", "entityId", "entityIdentifier", "entityType", "fieldChanges", "id", "ipAddress", "source", "userAgent", "userEmail", "userId", "userName" FROM "ActivityLog";
DROP TABLE "ActivityLog";
ALTER TABLE "new_ActivityLog" RENAME TO "ActivityLog";
CREATE TABLE "new_Inventory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sku" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "internalName" TEXT,
    "category" TEXT NOT NULL,
    "gemType" TEXT,
    "description" TEXT,
    "pieces" INTEGER NOT NULL DEFAULT 1,
    "weightValue" REAL DEFAULT 0,
    "weightUnit" TEXT,
    "carats" REAL NOT NULL DEFAULT 0,
    "weightRatti" REAL,
    "costPrice" REAL NOT NULL,
    "sellingPrice" REAL NOT NULL,
    "profit" REAL,
    "status" TEXT NOT NULL DEFAULT 'IN_STOCK',
    "location" TEXT,
    "certificateNo" TEXT,
    "certification" TEXT,
    "lab" TEXT,
    "shape" TEXT,
    "color" TEXT,
    "clarity" TEXT,
    "cut" TEXT,
    "polish" TEXT,
    "symmetry" TEXT,
    "fluorescence" TEXT,
    "measurements" TEXT,
    "dimensionsMm" TEXT,
    "tablePercent" REAL,
    "depthPercent" REAL,
    "ratio" REAL,
    "origin" TEXT,
    "treatment" TEXT,
    "transparency" TEXT,
    "braceletType" TEXT,
    "standardSize" TEXT,
    "beadSizeMm" REAL,
    "beadCount" INTEGER,
    "holeSizeMm" REAL,
    "innerCircumferenceMm" REAL,
    "pricingMode" TEXT NOT NULL DEFAULT 'FIXED',
    "sellingRatePerCarat" REAL,
    "flatSellingPrice" REAL,
    "purchaseRatePerCarat" REAL,
    "flatPurchaseCost" REAL,
    "notes" TEXT,
    "stockLocation" TEXT,
    "purchaseId" TEXT,
    "vendorId" TEXT,
    "batchId" TEXT,
    "imageUrl" TEXT,
    "videoUrl" TEXT,
    "rapPrice" REAL DEFAULT 0,
    "discountPercent" REAL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "categoryCodeId" TEXT,
    "gemstoneCodeId" TEXT,
    "colorCodeId" TEXT,
    "cutCodeId" TEXT,
    "collectionCodeId" TEXT
);
INSERT INTO "new_Inventory" ("beadCount", "beadSizeMm", "braceletType", "category", "categoryCodeId", "certification", "collectionCodeId", "colorCodeId", "createdAt", "cutCodeId", "dimensionsMm", "flatPurchaseCost", "flatSellingPrice", "gemType", "gemstoneCodeId", "holeSizeMm", "id", "innerCircumferenceMm", "internalName", "itemName", "notes", "pricingMode", "profit", "purchaseRatePerCarat", "sellingRatePerCarat", "shape", "sku", "standardSize", "status", "stockLocation", "treatment", "vendorId", "weightRatti", "weightUnit", "weightValue") SELECT "beadCount", "beadSizeMm", "braceletType", "category", "categoryCodeId", "certification", "collectionCodeId", "colorCodeId", "createdAt", "cutCodeId", "dimensionsMm", "flatPurchaseCost", "flatSellingPrice", "gemType", "gemstoneCodeId", "holeSizeMm", "id", "innerCircumferenceMm", "internalName", "itemName", "notes", "pricingMode", "profit", "purchaseRatePerCarat", "sellingRatePerCarat", "shape", "sku", "standardSize", "status", "stockLocation", "treatment", "vendorId", "weightRatti", "weightUnit", "weightValue" FROM "Inventory";
DROP TABLE "Inventory";
ALTER TABLE "new_Inventory" RENAME TO "Inventory";
CREATE UNIQUE INDEX "Inventory_sku_key" ON "Inventory"("sku");
CREATE INDEX "Inventory_purchaseId_idx" ON "Inventory"("purchaseId");
CREATE INDEX "Inventory_status_idx" ON "Inventory"("status");
CREATE INDEX "Inventory_category_idx" ON "Inventory"("category");
CREATE INDEX "Inventory_categoryCodeId_idx" ON "Inventory"("categoryCodeId");
CREATE INDEX "Inventory_gemstoneCodeId_idx" ON "Inventory"("gemstoneCodeId");
CREATE INDEX "Inventory_colorCodeId_idx" ON "Inventory"("colorCodeId");
CREATE INDEX "Inventory_cutCodeId_idx" ON "Inventory"("cutCodeId");
CREATE INDEX "Inventory_collectionCodeId_idx" ON "Inventory"("collectionCodeId");
CREATE TABLE "new_Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNumber" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "quotationId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "dueDate" DATETIME,
    "notes" TEXT,
    "subtotal" REAL NOT NULL,
    "taxTotal" REAL NOT NULL,
    "discountTotal" REAL NOT NULL,
    "totalAmount" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Invoice" ("createdAt", "id", "invoiceNumber", "isActive", "token") SELECT "createdAt", "id", "invoiceNumber", "isActive", "token" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
CREATE UNIQUE INDEX "Invoice_token_key" ON "Invoice"("token");
CREATE INDEX "Invoice_quotationId_idx" ON "Invoice"("quotationId");
CREATE TABLE "new_LabelCartItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_LabelCartItem" ("addedAt", "id", "inventoryId", "userId") SELECT "addedAt", "id", "inventoryId", "userId" FROM "LabelCartItem";
DROP TABLE "LabelCartItem";
ALTER TABLE "new_LabelCartItem" RENAME TO "LabelCartItem";
CREATE INDEX "LabelCartItem_userId_idx" ON "LabelCartItem"("userId");
CREATE INDEX "LabelCartItem_inventoryId_idx" ON "LabelCartItem"("inventoryId");
CREATE UNIQUE INDEX "LabelCartItem_userId_inventoryId_key" ON "LabelCartItem"("userId", "inventoryId");
CREATE TABLE "new_LabelPrintJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "layoutId" TEXT,
    "printerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "printFormat" TEXT,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_LabelPrintJob" ("id", "printFormat", "totalItems", "userId") SELECT "id", "printFormat", "totalItems", "userId" FROM "LabelPrintJob";
DROP TABLE "LabelPrintJob";
ALTER TABLE "new_LabelPrintJob" RENAME TO "LabelPrintJob";
CREATE INDEX "LabelPrintJob_userId_idx" ON "LabelPrintJob"("userId");
CREATE TABLE "new_LabelPrintJobItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "sellingPrice" REAL NOT NULL,
    "priceWithChecksum" TEXT,
    "checksumDigit" INTEGER,
    "checksumMethod" TEXT,
    "encodingVersion" INTEGER
);
INSERT INTO "new_LabelPrintJobItem" ("checksumDigit", "checksumMethod", "encodingVersion", "id", "jobId", "priceWithChecksum", "sellingPrice", "sku") SELECT "checksumDigit", "checksumMethod", "encodingVersion", "id", "jobId", "priceWithChecksum", "sellingPrice", "sku" FROM "LabelPrintJobItem";
DROP TABLE "LabelPrintJobItem";
ALTER TABLE "new_LabelPrintJobItem" RENAME TO "LabelPrintJobItem";
CREATE INDEX "LabelPrintJobItem_jobId_idx" ON "LabelPrintJobItem"("jobId");
CREATE TABLE "new_Listing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inventoryId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "externalId" TEXT,
    "listedPrice" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "listedDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "listingUrl" TEXT,
    "listingRef" TEXT
);
INSERT INTO "new_Listing" ("createdAt", "currency", "id", "inventoryId", "listedDate", "listedPrice", "listingRef", "listingUrl", "platform", "status", "updatedAt") SELECT "createdAt", "currency", "id", "inventoryId", "listedDate", "listedPrice", "listingRef", "listingUrl", "platform", "status", "updatedAt" FROM "Listing";
DROP TABLE "Listing";
ALTER TABLE "new_Listing" RENAME TO "Listing";
CREATE INDEX "Listing_inventoryId_idx" ON "Listing"("inventoryId");
CREATE TABLE "new_PriceOverrideAudit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "originalPrice" REAL NOT NULL,
    "newPrice" REAL NOT NULL,
    "reason" TEXT,
    "approvedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_PriceOverrideAudit" ("id", "reason") SELECT "id", "reason" FROM "PriceOverrideAudit";
DROP TABLE "PriceOverrideAudit";
ALTER TABLE "new_PriceOverrideAudit" RENAME TO "PriceOverrideAudit";
CREATE INDEX "PriceOverrideAudit_userId_idx" ON "PriceOverrideAudit"("userId");
CREATE TABLE "new_Purchase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNo" TEXT,
    "purchaseDate" DATETIME NOT NULL,
    "vendorId" TEXT,
    "totalAmount" REAL NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentMode" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Purchase" ("createdAt", "id", "invoiceNo", "paymentMode", "paymentStatus", "purchaseDate", "vendorId") SELECT "createdAt", "id", "invoiceNo", "paymentMode", coalesce("paymentStatus", 'PENDING') AS "paymentStatus", "purchaseDate", "vendorId" FROM "Purchase";
DROP TABLE "Purchase";
ALTER TABLE "new_Purchase" RENAME TO "Purchase";
CREATE INDEX "Purchase_vendorId_idx" ON "Purchase"("vendorId");
CREATE TABLE "new_Quotation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationNumber" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerMobile" TEXT,
    "customerAddress" TEXT,
    "customerCity" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalAmount" REAL NOT NULL,
    "validUntil" DATETIME,
    "expiryDate" DATETIME,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "approvedById" TEXT
);
INSERT INTO "new_Quotation" ("createdAt", "customerCity", "customerEmail", "customerId", "customerMobile", "customerName", "expiryDate", "id", "quotationNumber", "status", "token", "totalAmount", "updatedAt") SELECT "createdAt", "customerCity", "customerEmail", "customerId", "customerMobile", "customerName", "expiryDate", "id", "quotationNumber", "status", "token", "totalAmount", "updatedAt" FROM "Quotation";
DROP TABLE "Quotation";
ALTER TABLE "new_Quotation" RENAME TO "Quotation";
CREATE UNIQUE INDEX "Quotation_quotationNumber_key" ON "Quotation"("quotationNumber");
CREATE UNIQUE INDEX "Quotation_token_key" ON "Quotation"("token");
CREATE INDEX "Quotation_customerId_idx" ON "Quotation"("customerId");
CREATE INDEX "Quotation_createdById_idx" ON "Quotation"("createdById");
CREATE INDEX "Quotation_approvedById_idx" ON "Quotation"("approvedById");
CREATE TABLE "new_QuotationItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationId" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "quotedPrice" REAL NOT NULL
);
INSERT INTO "new_QuotationItem" ("id", "inventoryId", "quotationId", "quotedPrice") SELECT "id", "inventoryId", "quotationId", "quotedPrice" FROM "QuotationItem";
DROP TABLE "QuotationItem";
ALTER TABLE "new_QuotationItem" RENAME TO "QuotationItem";
CREATE INDEX "QuotationItem_quotationId_idx" ON "QuotationItem"("quotationId");
CREATE INDEX "QuotationItem_inventoryId_idx" ON "QuotationItem"("inventoryId");
CREATE TABLE "new_Sale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT,
    "inventoryId" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "customerAddress" TEXT,
    "customerCity" TEXT,
    "saleDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "salePrice" REAL NOT NULL,
    "taxAmount" REAL NOT NULL DEFAULT 0,
    "discountAmount" REAL NOT NULL DEFAULT 0,
    "netAmount" REAL NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT,
    "platform" TEXT NOT NULL DEFAULT 'OFFLINE',
    "notes" TEXT,
    "invoiceId" TEXT,
    "legacyInvoiceId" TEXT,
    "costPriceSnapshot" REAL,
    "profit" REAL
);
INSERT INTO "new_Sale" ("customerCity", "customerEmail", "customerName", "customerPhone", "id", "inventoryId", "netAmount", "orderId", "paymentStatus", "platform", "profit", "saleDate") SELECT "customerCity", "customerEmail", "customerName", "customerPhone", "id", "inventoryId", "netAmount", "orderId", coalesce("paymentStatus", 'PENDING') AS "paymentStatus", "platform", "profit", "saleDate" FROM "Sale";
DROP TABLE "Sale";
ALTER TABLE "new_Sale" RENAME TO "Sale";
CREATE UNIQUE INDEX "Sale_legacyInvoiceId_key" ON "Sale"("legacyInvoiceId");
CREATE INDEX "Sale_customerId_idx" ON "Sale"("customerId");
CREATE INDEX "Sale_inventoryId_idx" ON "Sale"("inventoryId");
CREATE INDEX "Sale_invoiceId_idx" ON "Sale"("invoiceId");
CREATE INDEX "Sale_legacyInvoiceId_idx" ON "Sale"("legacyInvoiceId");
CREATE TABLE "new_SalesMarginAnalytics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "period" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "revenue" REAL NOT NULL,
    "cost" REAL NOT NULL,
    "margin" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_SalesMarginAnalytics" ("createdAt", "id", "userId") SELECT "createdAt", "id", "userId" FROM "SalesMarginAnalytics";
DROP TABLE "SalesMarginAnalytics";
ALTER TABLE "new_SalesMarginAnalytics" RENAME TO "SalesMarginAnalytics";
CREATE INDEX "SalesMarginAnalytics_userId_idx" ON "SalesMarginAnalytics"("userId");
CREATE TABLE "new_Vendor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "vendorType" TEXT,
    "gstin" TEXT,
    "pan" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Vendor" ("address", "city", "country", "createdAt", "email", "id", "name", "notes", "phone", "state", "status", "vendorType") SELECT "address", "city", "country", "createdAt", "email", "id", "name", "notes", "phone", "state", "status", "vendorType" FROM "Vendor";
DROP TABLE "Vendor";
ALTER TABLE "new_Vendor" RENAME TO "Vendor";
CREATE UNIQUE INDEX "Vendor_name_key" ON "Vendor"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "InventoryMedia_inventoryId_idx" ON "InventoryMedia"("inventoryId");

-- CreateIndex
CREATE INDEX "MemoItem_memoId_idx" ON "MemoItem"("memoId");

-- CreateIndex
CREATE INDEX "MemoItem_inventoryId_idx" ON "MemoItem"("inventoryId");

-- CreateIndex
CREATE INDEX "InvoiceVersion_invoiceId_idx" ON "InvoiceVersion"("invoiceId");

-- CreateIndex
CREATE INDEX "DashboardNote_createdById_idx" ON "DashboardNote"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryCode_name_key" ON "CategoryCode"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionCode_name_key" ON "CollectionCode"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ColorCode_name_key" ON "ColorCode"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CutCode_name_key" ON "CutCode"("name");

-- CreateIndex
CREATE UNIQUE INDEX "GemstoneCode_name_key" ON "GemstoneCode"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RashiCode_name_key" ON "RashiCode"("name");
