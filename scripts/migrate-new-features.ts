import { createClient } from "@libsql/client";
import * as fs from "fs";
import * as path from "path";

// Simple env parser to support .env and .env.local
const envPathLocal = path.resolve(process.cwd(), ".env.local");
const envPath = path.resolve(process.cwd(), ".env");

const envVars: Record<string, string> = {};

function loadEnv(filePath: string) {
  if (fs.existsSync(filePath)) {
    const envContent = fs.readFileSync(filePath, "utf-8");
    envContent.split("\n").forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        let value = match[2].trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        envVars[match[1].trim()] = value;
      }
    });
  }
}

loadEnv(envPath);
loadEnv(envPathLocal); // Override with local if exists

// Allow overriding via command line arg for production
let url = process.argv[2] || envVars.DATABASE_URL;

if (url && url.startsWith("libsql://libsql://")) {
  url = url.replace("libsql://libsql://", "libsql://");
  console.log("Corrected malformed URL (removed double protocol prefix).");
}

if (!url) {
  console.error("DATABASE_URL not found in .env or .env.local and not provided as argument");
  console.error("Usage: npx tsx scripts/migrate-new-features.ts [CONNECTION_STRING]");
  process.exit(1);
}

// Extract auth token if present in URL
const clientUrl = url.split("?")[0];
const authToken = new URLSearchParams(url.split("?")[1]).get("authToken") || undefined;

const client = createClient({
  url: clientUrl,
  authToken: authToken,
});

async function main() {
  console.log(`Starting manual migration for new features on DB: ${clientUrl}...`);

  const sqlStatements = [
    // 1. New Code Tables
    `CREATE TABLE IF NOT EXISTS "CertificateCode" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "code" TEXT NOT NULL,
        "remarks" TEXT,
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "CertificateCode_name_key" ON "CertificateCode"("name");`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "CertificateCode_code_key" ON "CertificateCode"("code");`,

    `CREATE TABLE IF NOT EXISTS "RashiCode" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "code" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "RashiCode_name_key" ON "RashiCode"("name");`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "RashiCode_code_key" ON "RashiCode"("code");`,

    `CREATE TABLE IF NOT EXISTS "CollectionCode" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "code" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "CollectionCode_name_key" ON "CollectionCode"("name");`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "CollectionCode_code_key" ON "CollectionCode"("code");`,

    // 2. Add columns to Inventory (Safe additions)
    `ALTER TABLE "Inventory" ADD COLUMN "categoryCodeId" TEXT;`,
    `ALTER TABLE "Inventory" ADD COLUMN "gemstoneCodeId" TEXT;`,
    `ALTER TABLE "Inventory" ADD COLUMN "colorCodeId" TEXT;`,
    `ALTER TABLE "Inventory" ADD COLUMN "cutCodeId" TEXT;`,
    `ALTER TABLE "Inventory" ADD COLUMN "collectionCodeId" TEXT;`,
    `ALTER TABLE "Inventory" ADD COLUMN "certificateComments" TEXT;`,
    
    // 3. Junction Tables for M-N Relations (Prisma style, no foreign keys due to relationMode="prisma")
    // Inventory <-> RashiCode
    `CREATE TABLE IF NOT EXISTS "_InventoryToRashiCode" (
        "A" TEXT NOT NULL,
        "B" TEXT NOT NULL
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "_InventoryToRashiCode_AB_unique" ON "_InventoryToRashiCode"("A", "B");`,
    `CREATE INDEX IF NOT EXISTS "_InventoryToRashiCode_B_index" ON "_InventoryToRashiCode"("B");`,

    // Inventory <-> CertificateCode
    `CREATE TABLE IF NOT EXISTS "_CertificateCodeToInventory" (
        "A" TEXT NOT NULL,
        "B" TEXT NOT NULL
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "_CertificateCodeToInventory_AB_unique" ON "_CertificateCodeToInventory"("A", "B");`,
    `CREATE INDEX IF NOT EXISTS "_CertificateCodeToInventory_B_index" ON "_CertificateCodeToInventory"("B");`,
    
    // 4. Indexing for new columns
    `CREATE INDEX IF NOT EXISTS "Inventory_categoryCodeId_idx" ON "Inventory"("categoryCodeId");`,
    `CREATE INDEX IF NOT EXISTS "Inventory_gemstoneCodeId_idx" ON "Inventory"("gemstoneCodeId");`,
    `CREATE INDEX IF NOT EXISTS "Inventory_colorCodeId_idx" ON "Inventory"("colorCodeId");`,
    `CREATE INDEX IF NOT EXISTS "Inventory_cutCodeId_idx" ON "Inventory"("cutCodeId");`,
    `CREATE INDEX IF NOT EXISTS "Inventory_collectionCodeId_idx" ON "Inventory"("collectionCodeId");`,

    // 5. GPIS Packaging Module Tables
    `CREATE TABLE IF NOT EXISTS "GpisSettings" (
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
        "watermarkFontFamily" TEXT DEFAULT 'helvetica',
        "labelFontFamily" TEXT DEFAULT 'helvetica',
        "microBorderText" TEXT DEFAULT 'KHYATI GEMS AUTHENTIC PRODUCT',
        "toleranceCarat" REAL NOT NULL DEFAULT 0.05,
        "toleranceGram" REAL NOT NULL DEFAULT 0.01,
        "labelVersion" TEXT,
        "logoUrl" TEXT,
        "careInstruction" TEXT,
        "legalMetrologyLine" TEXT,
        "categoryHsnJson" TEXT,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS "gpis_layout_presets" (
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
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "gpis_layout_presets_name_key" ON "gpis_layout_presets"("name");`,

    `CREATE TABLE IF NOT EXISTS "GpisSerial" (
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
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "GpisSerial_serialNumber_key" ON "GpisSerial"("serialNumber");`,
    `CREATE INDEX IF NOT EXISTS "GpisSerial_sku_idx" ON "GpisSerial"("sku");`,
    `CREATE INDEX IF NOT EXISTS "GpisSerial_status_idx" ON "GpisSerial"("status");`,
    `CREATE INDEX IF NOT EXISTS "GpisSerial_serialNumber_idx" ON "GpisSerial"("serialNumber");`,

    `CREATE TABLE IF NOT EXISTS "GpisPrintJob" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "printJobId" TEXT NOT NULL,
        "sku" TEXT,
        "startSerial" TEXT,
        "endSerial" TEXT,
        "totalLabels" INTEGER,
        "printerType" TEXT,
        "printedBy" TEXT,
        "printedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "status" TEXT,
        "supersededAt" DATETIME,
        "supersededById" TEXT
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "GpisPrintJob_printJobId_key" ON "GpisPrintJob"("printJobId");`,
    `CREATE INDEX IF NOT EXISTS "GpisPrintJob_printJobId_idx" ON "GpisPrintJob"("printJobId");`,
    `CREATE INDEX IF NOT EXISTS "GpisPrintJob_sku_idx" ON "GpisPrintJob"("sku");`,

    `CREATE TABLE IF NOT EXISTS "gpis_print_job_items" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "printJobId" TEXT NOT NULL,
        "serialId" TEXT NOT NULL,
        "serialNumber" TEXT NOT NULL,
        "sku" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE INDEX IF NOT EXISTS "gpis_print_job_items_serialNumber_idx" ON "gpis_print_job_items"("serialNumber");`,
    `CREATE INDEX IF NOT EXISTS "gpis_print_job_items_sku_idx" ON "gpis_print_job_items"("sku");`,
    `CREATE INDEX IF NOT EXISTS "gpis_print_job_items_printJobId_idx" ON "gpis_print_job_items"("printJobId");`,
    `CREATE INDEX IF NOT EXISTS "gpis_print_job_items_serialId_idx" ON "gpis_print_job_items"("serialId");`,

    `CREATE TABLE IF NOT EXISTS "GpisVerificationLog" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "serialNumber" TEXT NOT NULL,
        "scannedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "ipAddress" TEXT,
        "userAgent" TEXT
    );`,
    `CREATE INDEX IF NOT EXISTS "GpisVerificationLog_serialNumber_idx" ON "GpisVerificationLog"("serialNumber");`,
    `CREATE INDEX IF NOT EXISTS "GpisVerificationLog_scannedAt_idx" ON "GpisVerificationLog"("scannedAt");`,

    `CREATE TABLE IF NOT EXISTS "PackagingCartItem" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "inventoryId" TEXT NOT NULL,
        "quantity" INTEGER NOT NULL DEFAULT 1,
        "location" TEXT,
        "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE INDEX IF NOT EXISTS "PackagingCartItem_userId_idx" ON "PackagingCartItem"("userId");`,
    `CREATE INDEX IF NOT EXISTS "PackagingCartItem_inventoryId_idx" ON "PackagingCartItem"("inventoryId");`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "PackagingCartItem_userId_inventoryId_key" ON "PackagingCartItem"("userId", "inventoryId");`,

    // 6. Missing Columns in Inventory for GPIS
    `ALTER TABLE "Inventory" ADD COLUMN "stone_type" TEXT;`,
    `ALTER TABLE "Inventory" ADD COLUMN "weight_grams" REAL;`,
    `ALTER TABLE "Inventory" ADD COLUMN "certificate_number" TEXT;`,
    `ALTER TABLE "Inventory" ADD COLUMN "certificate_lab" TEXT DEFAULT 'GCI';`,
    `ALTER TABLE "Inventory" ADD COLUMN "clarity_grade" TEXT;`,
    `ALTER TABLE "Inventory" ADD COLUMN "cut_grade" TEXT;`,
    `ALTER TABLE "Inventory" ADD COLUMN "origin_country" TEXT;`,
    `ALTER TABLE "Inventory" ADD COLUMN "cut_polished_in" TEXT DEFAULT 'India';`,
    `ALTER TABLE "Inventory" ADD COLUMN "qc_code" TEXT;`,
    `ALTER TABLE "Inventory" ADD COLUMN "hsn_code" TEXT;`
  ];

  for (const sql of sqlStatements) {
    try {
      console.log(`Executing: ${sql.slice(0, 80)}...`);
      await client.execute(sql);
      console.log("Success.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("duplicate column name")) {
        console.log("Column already exists, skipping.");
      } else if (msg.includes("already exists")) {
        console.log("Table/Index already exists, skipping.");
      } else {
        console.error("Error executing SQL:", msg);
      }
    }
  }

  console.log("Migration finished successfully.");
}

main();
