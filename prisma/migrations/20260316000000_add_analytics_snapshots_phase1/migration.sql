CREATE TABLE "AnalyticsDailySnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "snapshotDate" DATETIME NOT NULL,
    "inventoryCount" INTEGER NOT NULL,
    "inventoryValueCost" REAL NOT NULL,
    "inventoryValueSell" REAL NOT NULL,
    "salesCount" INTEGER NOT NULL,
    "salesRevenue" REAL NOT NULL,
    "profitAmount" REAL NOT NULL,
    "invoiceCount" INTEGER NOT NULL,
    "pendingInvoices" INTEGER NOT NULL,
    "paymentReceived" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "AnalyticsDailySnapshot_snapshotDate_key" ON "AnalyticsDailySnapshot"("snapshotDate");
CREATE INDEX "AnalyticsDailySnapshot_snapshotDate_idx" ON "AnalyticsDailySnapshot"("snapshotDate");

CREATE TABLE "AnalyticsInventorySnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inventoryId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "purchaseCost" REAL NOT NULL,
    "sellingPrice" REAL NOT NULL,
    "daysInStock" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "ageBucket" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "AnalyticsInventorySnapshot_inventoryId_key" ON "AnalyticsInventorySnapshot"("inventoryId");
CREATE INDEX "AnalyticsInventorySnapshot_category_idx" ON "AnalyticsInventorySnapshot"("category");
CREATE INDEX "AnalyticsInventorySnapshot_vendorName_idx" ON "AnalyticsInventorySnapshot"("vendorName");
CREATE INDEX "AnalyticsInventorySnapshot_status_idx" ON "AnalyticsInventorySnapshot"("status");
CREATE INDEX "AnalyticsInventorySnapshot_daysInStock_idx" ON "AnalyticsInventorySnapshot"("daysInStock");
CREATE INDEX "AnalyticsInventorySnapshot_ageBucket_idx" ON "AnalyticsInventorySnapshot"("ageBucket");

CREATE TABLE "AnalyticsVendorSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendorId" TEXT NOT NULL,
    "snapshotDate" DATETIME NOT NULL,
    "vendorName" TEXT NOT NULL,
    "totalItemsSupplied" INTEGER NOT NULL,
    "totalPurchaseValue" REAL NOT NULL,
    "inventoryInStock" INTEGER NOT NULL,
    "inventoryValue" REAL NOT NULL,
    "lastPurchaseDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "AnalyticsVendorSnapshot_vendorId_snapshotDate_key" ON "AnalyticsVendorSnapshot"("vendorId", "snapshotDate");
CREATE INDEX "AnalyticsVendorSnapshot_vendorId_idx" ON "AnalyticsVendorSnapshot"("vendorId");
CREATE INDEX "AnalyticsVendorSnapshot_snapshotDate_idx" ON "AnalyticsVendorSnapshot"("snapshotDate");

CREATE TABLE "AnalyticsSalesSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saleId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "purchaseCost" REAL NOT NULL,
    "sellingPrice" REAL NOT NULL,
    "profitAmount" REAL NOT NULL,
    "saleDate" DATETIME NOT NULL,
    "saleCycleDays" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "AnalyticsSalesSnapshot_saleId_key" ON "AnalyticsSalesSnapshot"("saleId");
CREATE INDEX "AnalyticsSalesSnapshot_saleDate_idx" ON "AnalyticsSalesSnapshot"("saleDate");
CREATE INDEX "AnalyticsSalesSnapshot_category_idx" ON "AnalyticsSalesSnapshot"("category");
CREATE INDEX "AnalyticsSalesSnapshot_saleCycleDays_idx" ON "AnalyticsSalesSnapshot"("saleCycleDays");

CREATE TABLE "AnalyticsLabelSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "printedBy" TEXT NOT NULL,
    "labelsPrinted" INTEGER NOT NULL,
    "printedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "AnalyticsLabelSnapshot_jobId_idx" ON "AnalyticsLabelSnapshot"("jobId");
CREATE INDEX "AnalyticsLabelSnapshot_printedBy_idx" ON "AnalyticsLabelSnapshot"("printedBy");
CREATE INDEX "AnalyticsLabelSnapshot_printedAt_idx" ON "AnalyticsLabelSnapshot"("printedAt");

CREATE INDEX "Inventory_vendorId_idx" ON "Inventory"("vendorId");
CREATE INDEX "Sale_saleDate_idx" ON "Sale"("saleDate");
CREATE INDEX "Invoice_paymentStatus_idx" ON "Invoice"("paymentStatus");
