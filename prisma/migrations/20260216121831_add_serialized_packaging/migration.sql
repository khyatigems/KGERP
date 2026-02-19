-- CreateTable
CREATE TABLE "SerializedUnit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inventoryId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "fullHash" TEXT NOT NULL,
    "shortHash" TEXT NOT NULL,
    "packagingStatus" TEXT NOT NULL DEFAULT 'GENERATED',
    "printCount" INTEGER NOT NULL DEFAULT 0,
    "qrScanCount" INTEGER NOT NULL DEFAULT 0,
    "firstScanAt" DATETIME,
    "lastScanAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "printedAt" DATETIME,
    "printedById" TEXT,
    "soldAt" DATETIME,
    "returnedAt" DATETIME,
    "voidReason" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "SerialActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serialId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "userId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "SerializedUnit_serialNumber_key" ON "SerializedUnit"("serialNumber");

-- CreateIndex
CREATE INDEX "SerializedUnit_inventoryId_idx" ON "SerializedUnit"("inventoryId");

-- CreateIndex
CREATE INDEX "SerializedUnit_sku_idx" ON "SerializedUnit"("sku");

-- CreateIndex
CREATE INDEX "SerializedUnit_packagingStatus_idx" ON "SerializedUnit"("packagingStatus");

-- CreateIndex
CREATE INDEX "SerializedUnit_createdAt_idx" ON "SerializedUnit"("createdAt");

-- CreateIndex
CREATE INDEX "SerialActivityLog_serialId_idx" ON "SerialActivityLog"("serialId");

-- CreateIndex
CREATE INDEX "SerialActivityLog_timestamp_idx" ON "SerialActivityLog"("timestamp");
