-- CreateTable
CREATE TABLE IF NOT EXISTS "MarketplaceProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "isActive" INTEGER NOT NULL DEFAULT 1,
    "isDefault" INTEGER NOT NULL DEFAULT 0,
    "marginType" TEXT NOT NULL DEFAULT 'PERCENT',
    "marginValue" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "MarketplaceProfile_name_key" ON "MarketplaceProfile"("name");

-- CreateTable
CREATE TABLE IF NOT EXISTS "MarketplaceCharge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "chargeKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" INTEGER NOT NULL DEFAULT 1,
    "amountType" TEXT NOT NULL DEFAULT 'PERCENT',
    "amount" REAL NOT NULL DEFAULT 0,
    "countryCode" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketplaceCharge_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "MarketplaceProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MarketplaceCharge_profileId_idx" ON "MarketplaceCharge"("profileId");

-- CreateTable
CREATE TABLE IF NOT EXISTS "CurrencyRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "rateToInr" REAL NOT NULL DEFAULT 0,
    "isBase" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CurrencyRate_code_key" ON "CurrencyRate"("code");

-- AddInternalCostColumns_Invoice
ALTER TABLE "Invoice" ADD COLUMN "internalShippingCost" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN "internalPackagingCost" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN "internalInsuranceCost" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN "internalHandlingCost" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN "internalOtherCharges" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN "internalCostTotal" REAL NOT NULL DEFAULT 0;

-- AddInternalCostColumns_Sale
ALTER TABLE "Sale" ADD COLUMN "internalShippingCost" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Sale" ADD COLUMN "internalPackagingCost" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Sale" ADD COLUMN "internalInsuranceCost" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Sale" ADD COLUMN "internalHandlingCost" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Sale" ADD COLUMN "internalOtherCharges" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Sale" ADD COLUMN "internalCostTotal" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Sale" ADD COLUMN "actualProfit" REAL;

-- PerformanceIndexes
CREATE INDEX IF NOT EXISTS "Inventory_origin_idx" ON "Inventory"("origin");
CREATE INDEX IF NOT EXISTS "Inventory_hsnCode_idx" ON "Inventory"("hsn_code");
CREATE INDEX IF NOT EXISTS "Inventory_hideFromAttention_idx" ON "Inventory"("hideFromAttention");
CREATE INDEX IF NOT EXISTS "Inventory_status_sellingPrice_idx" ON "Inventory"("status", "sellingPrice");
