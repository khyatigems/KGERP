-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "assignedSalesperson" TEXT;
ALTER TABLE "Customer" ADD COLUMN "budgetRange" TEXT;
ALTER TABLE "Customer" ADD COLUMN "customerType" TEXT DEFAULT 'Retail';
ALTER TABLE "Customer" ADD COLUMN "interestedIn" TEXT;
ALTER TABLE "Customer" ADD COLUMN "preferredContact" TEXT;
ALTER TABLE "Customer" ADD COLUMN "whatsappNumber" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "roleId" TEXT;

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "UserPermission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "allow" BOOLEAN NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT,
    "entityId" TEXT,
    "entityIdentifier" TEXT,
    "actionType" TEXT,
    "userId" TEXT,
    "userName" TEXT,
    "userEmail" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "source" TEXT,
    "fieldChanges" TEXT,
    "details" TEXT,
    "module" TEXT,
    "action" TEXT,
    "referenceId" TEXT,
    "description" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_ActivityLog" ("actionType", "createdAt", "details", "entityId", "entityIdentifier", "entityType", "fieldChanges", "id", "ipAddress", "source", "userAgent", "userEmail", "userId", "userName") SELECT "actionType", "createdAt", "details", "entityId", "entityIdentifier", "entityType", "fieldChanges", "id", "ipAddress", "source", "userAgent", "userEmail", "userId", "userName" FROM "ActivityLog";
DROP TABLE "ActivityLog";
ALTER TABLE "new_ActivityLog" RENAME TO "ActivityLog";
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");
CREATE INDEX "ActivityLog_module_idx" ON "ActivityLog"("module");
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");
CREATE TABLE "new_CreditNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT,
    "invoiceId" TEXT,
    "creditNoteNumber" TEXT NOT NULL,
    "issueDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalAmount" REAL NOT NULL,
    "taxableAmount" REAL NOT NULL DEFAULT 0,
    "igst" REAL NOT NULL DEFAULT 0,
    "cgst" REAL NOT NULL DEFAULT 0,
    "sgst" REAL NOT NULL DEFAULT 0,
    "totalTax" REAL NOT NULL DEFAULT 0,
    "balanceAmount" REAL NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_CreditNote" ("balanceAmount", "cgst", "createdAt", "creditNoteNumber", "customerId", "id", "igst", "invoiceId", "isActive", "issueDate", "sgst", "taxableAmount", "totalAmount", "totalTax") SELECT "balanceAmount", "cgst", "createdAt", "creditNoteNumber", "customerId", "id", "igst", "invoiceId", "isActive", "issueDate", "sgst", "taxableAmount", "totalAmount", "totalTax" FROM "CreditNote";
DROP TABLE "CreditNote";
ALTER TABLE "new_CreditNote" RENAME TO "CreditNote";
CREATE UNIQUE INDEX "CreditNote_creditNoteNumber_key" ON "CreditNote"("creditNoteNumber");
CREATE INDEX "CreditNote_customerId_idx" ON "CreditNote"("customerId");
CREATE INDEX "CreditNote_invoiceId_idx" ON "CreditNote"("invoiceId");
CREATE TABLE "new_FollowUp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT,
    "note" TEXT,
    "promisedDate" DATETIME,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_FollowUp" ("action", "createdAt", "createdBy", "date", "id", "invoiceId", "note", "promisedDate") SELECT "action", "createdAt", "createdBy", "date", "id", "invoiceId", "note", "promisedDate" FROM "FollowUp";
DROP TABLE "FollowUp";
ALTER TABLE "new_FollowUp" RENAME TO "FollowUp";
CREATE INDEX "FollowUp_invoiceId_idx" ON "FollowUp"("invoiceId");
CREATE TABLE "new_GpisSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brandName" TEXT,
    "tagline" TEXT,
    "estYear" TEXT,
    "registeredAddress" TEXT,
    "gstin" TEXT,
    "iec" TEXT,
    "supportEmail" TEXT,
    "supportPhone" TEXT,
    "supportTimings" TEXT,
    "website" TEXT,
    "categoryHsnJson" TEXT,
    "showRegisteredAddress" BOOLEAN NOT NULL DEFAULT true,
    "showGstin" BOOLEAN NOT NULL DEFAULT true,
    "showIec" BOOLEAN NOT NULL DEFAULT true,
    "showSupport" BOOLEAN NOT NULL DEFAULT true,
    "showWatermark" BOOLEAN NOT NULL DEFAULT true,
    "watermarkText" TEXT,
    "watermarkOpacity" INTEGER NOT NULL DEFAULT 6,
    "watermarkRotation" INTEGER NOT NULL DEFAULT -30,
    "watermarkFontSize" INTEGER NOT NULL DEFAULT 16,
    "watermarkFontFamily" TEXT DEFAULT 'helvetica',
    "labelFontFamily" TEXT DEFAULT 'helvetica',
    "microBorderText" TEXT DEFAULT 'KHYATI GEMS AUTHENTIC PRODUCT',
    "toleranceCarat" REAL NOT NULL DEFAULT 0.05,
    "toleranceGram" REAL NOT NULL DEFAULT 0.01,
    "labelVersion" TEXT,
    "logoUrl" TEXT,
    "careInstruction" TEXT,
    "legalMetrologyLine" TEXT,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_GpisSettings" ("brandName", "careInstruction", "categoryHsnJson", "estYear", "gstin", "id", "iec", "labelFontFamily", "labelVersion", "legalMetrologyLine", "logoUrl", "microBorderText", "registeredAddress", "showGstin", "showIec", "showRegisteredAddress", "showSupport", "showWatermark", "supportEmail", "supportPhone", "supportTimings", "tagline", "toleranceCarat", "toleranceGram", "updatedAt", "watermarkFontFamily", "watermarkFontSize", "watermarkOpacity", "watermarkRotation", "watermarkText", "website") SELECT "brandName", "careInstruction", "categoryHsnJson", "estYear", "gstin", "id", "iec", "labelFontFamily", "labelVersion", "legalMetrologyLine", "logoUrl", "microBorderText", "registeredAddress", "showGstin", "showIec", "showRegisteredAddress", "showSupport", "showWatermark", "supportEmail", "supportPhone", "supportTimings", "tagline", "toleranceCarat", "toleranceGram", "updatedAt", "watermarkFontFamily", "watermarkFontSize", "watermarkOpacity", "watermarkRotation", "watermarkText", "website" FROM "GpisSettings";
DROP TABLE "GpisSettings";
ALTER TABLE "new_GpisSettings" RENAME TO "GpisSettings";
CREATE TABLE "new_SalesReturn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "returnNumber" TEXT NOT NULL,
    "returnDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disposition" TEXT NOT NULL,
    "taxableAmount" REAL NOT NULL DEFAULT 0,
    "igst" REAL NOT NULL DEFAULT 0,
    "cgst" REAL NOT NULL DEFAULT 0,
    "sgst" REAL NOT NULL DEFAULT 0,
    "totalTax" REAL NOT NULL DEFAULT 0,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_SalesReturn" ("cgst", "createdAt", "createdById", "disposition", "id", "igst", "invoiceId", "remarks", "returnDate", "returnNumber", "sgst", "taxableAmount", "totalAmount", "totalTax") SELECT "cgst", "createdAt", "createdById", "disposition", "id", "igst", "invoiceId", "remarks", "returnDate", "returnNumber", "sgst", "taxableAmount", "totalAmount", "totalTax" FROM "SalesReturn";
DROP TABLE "SalesReturn";
ALTER TABLE "new_SalesReturn" RENAME TO "SalesReturn";
CREATE UNIQUE INDEX "SalesReturn_returnNumber_key" ON "SalesReturn"("returnNumber");
CREATE INDEX "SalesReturn_invoiceId_idx" ON "SalesReturn"("invoiceId");
CREATE TABLE "new_SalesReturnItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "salesReturnId" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "sellingPrice" REAL NOT NULL,
    "resaleable" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_SalesReturnItem" ("id", "inventoryId", "quantity", "resaleable", "salesReturnId", "sellingPrice") SELECT "id", "inventoryId", "quantity", "resaleable", "salesReturnId", "sellingPrice" FROM "SalesReturnItem";
DROP TABLE "SalesReturnItem";
ALTER TABLE "new_SalesReturnItem" RENAME TO "SalesReturnItem";
CREATE INDEX "SalesReturnItem_salesReturnId_idx" ON "SalesReturnItem"("salesReturnId");
CREATE INDEX "SalesReturnItem_inventoryId_idx" ON "SalesReturnItem"("inventoryId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE INDEX "RolePermission_roleId_idx" ON "RolePermission"("roleId");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");

-- CreateIndex
CREATE INDEX "UserPermission_userId_idx" ON "UserPermission"("userId");

-- CreateIndex
CREATE INDEX "UserPermission_permissionId_idx" ON "UserPermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermission_userId_permissionId_key" ON "UserPermission"("userId", "permissionId");
