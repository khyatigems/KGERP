import { config } from "dotenv";

config({ path: ".env.local", override: true });
config({ path: ".env" });

import { ensureBillfreePhase1Schema, prisma } from "../../lib/prisma";

async function main() {
  console.log("🔧 Creating remaining missing GPIS tables...");
  
  try {
    // Check if tables already exist with different case
    const existingTables = await prisma.$queryRawUnsafe<Array<{ name: string }>>(`
      SELECT name FROM sqlite_master 
      WHERE type = 'table' 
        AND (name LIKE '%gpis%' OR name LIKE '%GPIS%')
      ORDER BY name
    `);
    
    console.log("Existing GPIS-related tables:");
    existingTables.forEach(table => {
      console.log(`  📋 ${table.name}`);
    });
    
    // Create missing tables if they don't exist in any form
    const tablesToCreate = [
      {
        name: 'GPISSettings',
        sql: `
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
        `
      },
      {
        name: 'GPISSerial',
        sql: `
          CREATE TABLE IF NOT EXISTS "GPISSerial" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "serialNumber" TEXT NOT NULL UNIQUE,
            "status" TEXT NOT NULL DEFAULT 'PRINTED',
            "printJobId" TEXT,
            "printedAt" DATETIME,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'GPISPrintJob',
        sql: `
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
        `
      },
      {
        name: 'GPISVerificationLog',
        sql: `
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
        `
      }
    ];
    
    for (const table of tablesToCreate) {
      const exists = existingTables.some(t => 
        t.name.toLowerCase() === table.name.toLowerCase() ||
        t.name.toLowerCase().includes(table.name.toLowerCase())
      );
      
      if (!exists) {
        console.log(`Creating ${table.name} table...`);
        await prisma.$executeRawUnsafe(table.sql);
        console.log(`✅ Created ${table.name}`);
      } else {
        console.log(`⏭️  ${table.name} already exists (case variant)`);
      }
    }
    
    // Final verification
    const finalCheck = await prisma.$queryRawUnsafe<Array<{ name: string }>>(`
      SELECT name FROM sqlite_master 
      WHERE type = 'table' 
        AND name IN ('GPISSettings', 'GPISSerial', 'GPISPrintJob', 'GPISVerificationLog',
                     'gpisSettings', 'gpisSerial', 'gpisPrintJob', 'gpisVerificationLog')
      ORDER BY name
    `);
    
    console.log(`\n📊 Final verification - Found ${finalCheck.length} GPIS tables:`);
    finalCheck.forEach(table => {
      console.log(`  ✅ ${table.name}`);
    });
    
    // Check JournalEntry count with raw query
    const journalCount = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
      `SELECT COUNT(*) as count FROM "JournalEntry"`
    );
    
    console.log(`\n📊 Journal Entry count: ${journalCount[0]?.count || 0}`);
    
  } catch (error) {
    console.error("❌ Error creating GPIS tables:", error);
  }
  
  console.log("\n✅ REMAINING TABLES CREATION COMPLETED");
  
  await prisma.$disconnect();
}

main().catch(console.error);
