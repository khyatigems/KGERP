import { config } from "dotenv";

config({ path: ".env.local", override: true });
config({ path: ".env" });

import { ensureBillfreePhase1Schema, prisma } from "../../lib/prisma";

async function main() {
  console.log("🔧 CREATING MISSING TABLES SAFELY...");
  
  try {
    // Create missing tables using raw SQL
    
    // SerializedUnit table
    console.log("Creating SerializedUnit table...");
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SerializedUnit" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "inventoryId" TEXT NOT NULL,
        "serialNumber" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
        "notes" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE CASCADE
      )
    `);
    
    // SerialActivityLog table
    console.log("Creating SerialActivityLog table...");
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SerialActivityLog" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "serialId" TEXT NOT NULL,
        "activityType" TEXT NOT NULL,
        "description" TEXT,
        "userId" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("serialId") REFERENCES "SerializedUnit"("id") ON DELETE CASCADE
      )
    `);
    
    // GPISSettings table
    console.log("Creating GPISSettings table...");
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "GPISSettings" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "printerType" TEXT NOT NULL DEFAULT 'TSC',
        "printerPort" TEXT,
        "printerBaudRate" INTEGER DEFAULT 9600,
        "labelWidth" REAL DEFAULT 40.0,
        "labelHeight" REAL DEFAULT 25.0,
        "defaultTemplate" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // GPISLayoutPreset table
    console.log("Creating GPISLayoutPreset table...");
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "GPISLayoutPreset" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "layoutConfig" TEXT NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "isDefault" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // GPISSerial table
    console.log("Creating GPISSerial table...");
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "GPISSerial" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "serialNumber" TEXT NOT NULL UNIQUE,
        "status" TEXT NOT NULL DEFAULT 'PRINTED',
        "printJobId" TEXT,
        "printedAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // GPISPrintJob table
    console.log("Creating GPISPrintJob table...");
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "GPISPrintJob" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "jobNumber" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "totalLabels" INTEGER NOT NULL DEFAULT 0,
        "printedLabels" INTEGER NOT NULL DEFAULT 0,
        "failedLabels" INTEGER NOT NULL DEFAULT 0,
        "printerSettings" TEXT,
        "startedAt" DATETIME,
        "completedAt" DATETIME,
        "createdById" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // GPISPrintJobItem table
    console.log("Creating GPISPrintJobItem table...");
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "GPISPrintJobItem" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "printJobId" TEXT NOT NULL,
        "serialNumber" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "printAttempts" INTEGER NOT NULL DEFAULT 0,
        "errorMessage" TEXT,
        "printedAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("printJobId") REFERENCES "GPISPrintJob"("id") ON DELETE CASCADE
      )
    `);
    
    // GPISVerificationLog table
    console.log("Creating GPISVerificationLog table...");
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "GPISVerificationLog" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "serialNumber" TEXT NOT NULL,
        "verificationType" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "details" TEXT,
        "verifiedBy" TEXT,
        "verifiedAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // CertificateCodeToInventory table
    console.log("Creating CertificateCodeToInventory table...");
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "CertificateCodeToInventory" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "inventoryId" TEXT NOT NULL,
        "certificateCodeId" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE CASCADE,
        FOREIGN KEY ("certificateCodeId") REFERENCES "CertificateCode"("id") ON DELETE CASCADE
      )
    `);
    
    // InventoryToRashiCode table
    console.log("Creating InventoryToRashiCode table...");
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "InventoryToRashiCode" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "inventoryId" TEXT NOT NULL,
        "rashiCodeId" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE CASCADE,
        FOREIGN KEY ("rashiCodeId") REFERENCES "RashiCode"("id") ON DELETE CASCADE
      )
    `);
    
    console.log("✅ All missing tables created successfully!");
    
    // Verify tables were created
    const verification = await prisma.$queryRawUnsafe<Array<{ name: string }>>(`
      SELECT name FROM sqlite_master 
      WHERE type = 'table' 
        AND name IN ('SerializedUnit', 'SerialActivityLog', 'GPISSettings', 'GPISLayoutPreset', 'GPISSerial', 'GPISPrintJob', 'GPISPrintJobItem', 'GPISVerificationLog', 'CertificateCodeToInventory', 'InventoryToRashiCode')
      ORDER BY name
    `);
    
    console.log(`\n📊 Verification - Created ${verification.length} tables:`);
    verification.forEach(table => {
      console.log(`  ✅ ${table.name}`);
    });
    
  } catch (error) {
    console.error("❌ Error creating tables:", error);
  }
  
  console.log("\n✅ TABLE CREATION COMPLETED SAFELY");
  
  await prisma.$disconnect();
}

main().catch(console.error);
