/*
  Warnings:

  - You are about to drop the `PackagingLayoutPreset` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "PackagingLayoutPreset_name_key";

-- AlterTable
ALTER TABLE "GpisPrintJob" ADD COLUMN "supersededAt" DATETIME;
ALTER TABLE "GpisPrintJob" ADD COLUMN "supersededById" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "PackagingLayoutPreset";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "gpis_layout_presets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'MM',
    "pageWidthMm" REAL NOT NULL DEFAULT 210,
    "pageHeightMm" REAL NOT NULL DEFAULT 297,
    "cols" INTEGER NOT NULL DEFAULT 2,
    "rows" INTEGER NOT NULL DEFAULT 5,
    "labelWidthMm" REAL NOT NULL DEFAULT 100,
    "labelHeightMm" REAL NOT NULL DEFAULT 50,
    "marginLeftMm" REAL NOT NULL DEFAULT 5,
    "marginTopMm" REAL NOT NULL DEFAULT 23.5,
    "gapXmm" REAL NOT NULL DEFAULT 0,
    "gapYmm" REAL NOT NULL DEFAULT 0,
    "offsetXmm" REAL NOT NULL DEFAULT 0,
    "offsetYmm" REAL NOT NULL DEFAULT 0,
    "startPosition" INTEGER NOT NULL DEFAULT 1,
    "selectedFieldsJson" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "gpis_print_job_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "printJobId" TEXT NOT NULL,
    "serialId" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GpisSerial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sku" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "categoryCode" TEXT NOT NULL,
    "yearMonth" TEXT,
    "runningNumber" INTEGER,
    "hashFragment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "inventoryLocation" TEXT,
    "qcCode" TEXT,
    "packedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "packing_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reprintCount" INTEGER NOT NULL DEFAULT 0,
    "label_version" TEXT,
    "unit_quantity" INTEGER NOT NULL DEFAULT 1,
    "made_in" TEXT NOT NULL DEFAULT 'India',
    "declared_original" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_GpisSerial" ("categoryCode", "createdAt", "createdBy", "hashFragment", "id", "inventoryLocation", "packedAt", "qcCode", "reprintCount", "runningNumber", "serialNumber", "sku", "status", "yearMonth") SELECT "categoryCode", "createdAt", "createdBy", "hashFragment", "id", "inventoryLocation", "packedAt", "qcCode", "reprintCount", "runningNumber", "serialNumber", "sku", "status", "yearMonth" FROM "GpisSerial";
DROP TABLE "GpisSerial";
ALTER TABLE "new_GpisSerial" RENAME TO "GpisSerial";
CREATE UNIQUE INDEX "GpisSerial_serialNumber_key" ON "GpisSerial"("serialNumber");
CREATE INDEX "GpisSerial_sku_idx" ON "GpisSerial"("sku");
CREATE INDEX "GpisSerial_status_idx" ON "GpisSerial"("status");
CREATE INDEX "GpisSerial_serialNumber_idx" ON "GpisSerial"("serialNumber");
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
    "showRegisteredAddress" BOOLEAN NOT NULL DEFAULT true,
    "showGstin" BOOLEAN NOT NULL DEFAULT true,
    "showIec" BOOLEAN NOT NULL DEFAULT true,
    "showSupport" BOOLEAN NOT NULL DEFAULT true,
    "showWatermark" BOOLEAN NOT NULL DEFAULT true,
    "watermarkText" TEXT,
    "watermarkOpacity" INTEGER NOT NULL DEFAULT 6,
    "watermarkRotation" INTEGER NOT NULL DEFAULT -30,
    "watermarkFontSize" INTEGER NOT NULL DEFAULT 16,
    "microBorderText" TEXT DEFAULT 'KHYATI GEMS AUTHENTIC PRODUCT',
    "toleranceCarat" REAL NOT NULL DEFAULT 0.01,
    "toleranceGram" REAL NOT NULL DEFAULT 0.01,
    "labelVersion" TEXT,
    "logoUrl" TEXT,
    "careInstruction" TEXT,
    "legalMetrologyLine" TEXT,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_GpisSettings" ("brandName", "careInstruction", "estYear", "gstin", "id", "iec", "labelVersion", "legalMetrologyLine", "logoUrl", "registeredAddress", "supportEmail", "supportPhone", "supportTimings", "tagline", "updatedAt", "watermarkOpacity", "watermarkText", "website") SELECT "brandName", "careInstruction", "estYear", "gstin", "id", "iec", "labelVersion", "legalMetrologyLine", "logoUrl", "registeredAddress", "supportEmail", "supportPhone", "supportTimings", "tagline", "updatedAt", "watermarkOpacity", "watermarkText", "website" FROM "GpisSettings";
DROP TABLE "GpisSettings";
ALTER TABLE "new_GpisSettings" RENAME TO "GpisSettings";
CREATE TABLE "new_Inventory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sku" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "internalName" TEXT,
    "category" TEXT NOT NULL,
    "gemType" TEXT,
    "stone_type" TEXT,
    "description" TEXT,
    "pieces" INTEGER NOT NULL DEFAULT 1,
    "weightValue" REAL DEFAULT 0,
    "weightUnit" TEXT,
    "carats" REAL NOT NULL DEFAULT 0,
    "weightRatti" REAL,
    "weight_grams" REAL,
    "costPrice" REAL NOT NULL,
    "sellingPrice" REAL NOT NULL,
    "profit" REAL,
    "condition" TEXT NOT NULL DEFAULT 'New',
    "status" TEXT NOT NULL DEFAULT 'IN_STOCK',
    "location" TEXT,
    "certificateNo" TEXT,
    "certificate_number" TEXT,
    "certification" TEXT,
    "lab" TEXT,
    "certificate_lab" TEXT DEFAULT 'GCI',
    "shape" TEXT,
    "color" TEXT,
    "clarity" TEXT,
    "clarity_grade" TEXT,
    "cut" TEXT,
    "cut_grade" TEXT,
    "polish" TEXT,
    "symmetry" TEXT,
    "fluorescence" TEXT,
    "measurements" TEXT,
    "dimensionsMm" TEXT,
    "tablePercent" REAL,
    "depthPercent" REAL,
    "ratio" REAL,
    "origin" TEXT,
    "origin_country" TEXT,
    "treatment" TEXT,
    "cut_polished_in" TEXT DEFAULT 'India',
    "qc_code" TEXT,
    "hsn_code" TEXT,
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
    "certificateComments" TEXT,
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
INSERT INTO "new_Inventory" ("batchId", "beadCount", "beadSizeMm", "braceletType", "carats", "category", "categoryCodeId", "certificateComments", "certificateNo", "certification", "clarity", "collectionCodeId", "color", "colorCodeId", "costPrice", "createdAt", "cut", "cutCodeId", "depthPercent", "description", "dimensionsMm", "discountPercent", "flatPurchaseCost", "flatSellingPrice", "fluorescence", "gemType", "gemstoneCodeId", "holeSizeMm", "id", "imageUrl", "innerCircumferenceMm", "internalName", "itemName", "lab", "location", "measurements", "notes", "origin", "pieces", "polish", "pricingMode", "profit", "purchaseId", "purchaseRatePerCarat", "rapPrice", "ratio", "sellingPrice", "sellingRatePerCarat", "shape", "sku", "standardSize", "status", "stockLocation", "symmetry", "tablePercent", "transparency", "treatment", "updatedAt", "vendorId", "videoUrl", "weightRatti", "weightUnit", "weightValue") SELECT "batchId", "beadCount", "beadSizeMm", "braceletType", "carats", "category", "categoryCodeId", "certificateComments", "certificateNo", "certification", "clarity", "collectionCodeId", "color", "colorCodeId", "costPrice", "createdAt", "cut", "cutCodeId", "depthPercent", "description", "dimensionsMm", "discountPercent", "flatPurchaseCost", "flatSellingPrice", "fluorescence", "gemType", "gemstoneCodeId", "holeSizeMm", "id", "imageUrl", "innerCircumferenceMm", "internalName", "itemName", "lab", "location", "measurements", "notes", "origin", "pieces", "polish", "pricingMode", "profit", "purchaseId", "purchaseRatePerCarat", "rapPrice", "ratio", "sellingPrice", "sellingRatePerCarat", "shape", "sku", "standardSize", "status", "stockLocation", "symmetry", "tablePercent", "transparency", "treatment", "updatedAt", "vendorId", "videoUrl", "weightRatti", "weightUnit", "weightValue" FROM "Inventory";
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
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "gpis_layout_presets_name_key" ON "gpis_layout_presets"("name");

-- CreateIndex
CREATE INDEX "gpis_print_job_items_serialNumber_idx" ON "gpis_print_job_items"("serialNumber");

-- CreateIndex
CREATE INDEX "gpis_print_job_items_sku_idx" ON "gpis_print_job_items"("sku");

-- CreateIndex
CREATE INDEX "gpis_print_job_items_printJobId_idx" ON "gpis_print_job_items"("printJobId");

-- CreateIndex
CREATE INDEX "gpis_print_job_items_serialId_idx" ON "gpis_print_job_items"("serialId");
