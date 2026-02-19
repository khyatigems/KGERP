-- CreateTable
CREATE TABLE "GpisSettings" (
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
    "watermarkText" TEXT,
    "watermarkOpacity" INTEGER NOT NULL DEFAULT 6,
    "labelVersion" TEXT,
    "logoUrl" TEXT,
    "careInstruction" TEXT,
    "legalMetrologyLine" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GpisSerial" (
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
    "reprintCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "GpisPrintJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "printJobId" TEXT NOT NULL,
    "sku" TEXT,
    "startSerial" TEXT,
    "endSerial" TEXT,
    "totalLabels" INTEGER,
    "printerType" TEXT,
    "printedBy" TEXT,
    "printedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT
);

-- CreateTable
CREATE TABLE "GpisVerificationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serialNumber" TEXT NOT NULL,
    "scannedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "GpisSerial_serialNumber_key" ON "GpisSerial"("serialNumber");

-- CreateIndex
CREATE INDEX "GpisSerial_sku_idx" ON "GpisSerial"("sku");

-- CreateIndex
CREATE INDEX "GpisSerial_status_idx" ON "GpisSerial"("status");

-- CreateIndex
CREATE INDEX "GpisSerial_serialNumber_idx" ON "GpisSerial"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "GpisPrintJob_printJobId_key" ON "GpisPrintJob"("printJobId");

-- CreateIndex
CREATE INDEX "GpisPrintJob_printJobId_idx" ON "GpisPrintJob"("printJobId");

-- CreateIndex
CREATE INDEX "GpisPrintJob_sku_idx" ON "GpisPrintJob"("sku");

-- CreateIndex
CREATE INDEX "GpisVerificationLog_serialNumber_idx" ON "GpisVerificationLog"("serialNumber");

-- CreateIndex
CREATE INDEX "GpisVerificationLog_scannedAt_idx" ON "GpisVerificationLog"("scannedAt");
