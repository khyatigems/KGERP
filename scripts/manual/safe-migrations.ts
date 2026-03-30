import { config } from "dotenv";

config({ path: ".env.local", override: true });
config({ path: ".env" });

import { ensureBillfreePhase1Schema, prisma } from "../../lib/prisma";

async function main() {
  console.log("🔧 Running SAFE migrations and schema updates for production DB...");
  
  // 1. Fix LoyaltyLedger schema
  console.log("\n1️⃣ Checking LoyaltyLedger schema...");
  try {
    const columns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
      `PRAGMA table_info("LoyaltyLedger")`
    );
    
    const columnNames = columns.map(c => c.name);
    
    // Add missing columns if needed
    if (!columnNames.includes('date')) {
      console.log("  Adding 'date' column to LoyaltyLedger...");
      await prisma.$executeRawUnsafe(`ALTER TABLE "LoyaltyLedger" ADD COLUMN "date" DATETIME`);
      console.log("  ✅ Added 'date' column");
    }
    
    if (!columnNames.includes('updatedAt')) {
      console.log("  Adding 'updatedAt' column to LoyaltyLedger...");
      await prisma.$executeRawUnsafe(`ALTER TABLE "LoyaltyLedger" ADD COLUMN "updatedAt" DATETIME`);
      console.log("  ✅ Added 'updatedAt' column");
    }
    
    if (!columnNames.includes('invoiceId')) {
      console.log("  Adding 'invoiceId' column to LoyaltyLedger...");
      await prisma.$executeRawUnsafe(`ALTER TABLE "LoyaltyLedger" ADD COLUMN "invoiceId" TEXT`);
      console.log("  ✅ Added 'invoiceId' column");
    }
    
    if (!columnNames.includes('rupeeValue')) {
      console.log("  Adding 'rupeeValue' column to LoyaltyLedger...");
      await prisma.$executeRawUnsafe(`ALTER TABLE "LoyaltyLedger" ADD COLUMN "rupeeValue" REAL DEFAULT 0`);
      console.log("  ✅ Added 'rupeeValue' column");
    }
    
    if (!columnNames.includes('remarks')) {
      console.log("  Adding 'remarks' column to LoyaltyLedger...");
      await prisma.$executeRawUnsafe(`ALTER TABLE "LoyaltyLedger" ADD COLUMN "remarks" TEXT`);
      console.log("  ✅ Added 'remarks' column");
    }
    
  } catch (error) {
    console.log("  ℹ️  LoyaltyLedger table doesn't exist or error:", (error as Error).message);
  }
  
  // 2. Ensure LoyaltySettings exists
  console.log("\n2️⃣ Checking LoyaltySettings...");
  try {
    const settings = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM "LoyaltySettings" WHERE id = 'default'`
    );
    
    if (settings.length === 0) {
      console.log("  Creating default LoyaltySettings...");
      await prisma.$executeRawUnsafe(`
        INSERT OR IGNORE INTO "LoyaltySettings" (
          id, pointsPerRupee, redeemRupeePerPoint, minRedeemPoints, 
          maxRedeemPercent, dobProfilePoints, anniversaryProfilePoints, 
          createdAt, updatedAt
        ) VALUES (
          'default', 0.01, 1.0, 10, 30, 50, 25, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `);
      console.log("  ✅ Created default LoyaltySettings");
    } else {
      console.log("  ✅ LoyaltySettings already exists");
    }
  } catch (error) {
    console.log("  ℹ️  LoyaltySettings table doesn't exist - will be created by schema");
  }
  
  // 3. Run schema migration (safe)
  console.log("\n3️⃣ Running schema migration...");
  try {
    await ensureBillfreePhase1Schema();
    console.log("  ✅ Schema migration completed");
  } catch (error) {
    console.log("  ⚠️  Schema migration issue:", (error as Error).message);
  }
  
  console.log("\n✅ SAFE migrations completed - NO DATA DELETED");
  
  await prisma.$disconnect();
}

main().catch(console.error);
