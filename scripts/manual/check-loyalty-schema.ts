import { config } from "dotenv";

config({ path: ".env.local", override: true });
config({ path: ".env" });

import { ensureBillfreePhase1Schema, prisma } from "../../lib/prisma";

async function main() {
  console.log("Checking LoyaltyLedger table schema...");
  
  try {
    const schema = await prisma.$queryRawUnsafe<Array<{ sql: string }>>(
      `SELECT sql FROM sqlite_master WHERE type="table" AND name="LoyaltyLedger"`
    );
    
    if (schema.length > 0) {
      console.log("LoyaltyLedger table schema:");
      console.log(schema[0].sql);
    } else {
      console.log("LoyaltyLedger table not found");
    }
    
    // Check if invoiceId column exists
    try {
      const columns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
        `PRAGMA table_info("LoyaltyLedger")`
      );
      
      console.log("\nLoyaltyLedger columns:");
      columns.forEach(col => {
        console.log(`  ${col.name}`);
      });
      
      const hasInvoiceId = columns.some(col => col.name === 'invoiceId');
      const hasRupeeValue = columns.some(col => col.name === 'rupeeValue');
      const hasRemarks = columns.some(col => col.name === 'remarks');
      
      console.log(`\nHas invoiceId column: ${hasInvoiceId}`);
      console.log(`Has rupeeValue column: ${hasRupeeValue}`);
      console.log(`Has remarks column: ${hasRemarks}`);
      
      if (!hasInvoiceId) {
        console.log("Adding invoiceId column...");
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "LoyaltyLedger" ADD COLUMN "invoiceId" TEXT`
        );
        console.log("✅ Added invoiceId column");
      }
      
      if (!hasRupeeValue) {
        console.log("Adding rupeeValue column...");
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "LoyaltyLedger" ADD COLUMN "rupeeValue" REAL DEFAULT 0`
        );
        console.log("✅ Added rupeeValue column");
      }
      
      if (!hasRemarks) {
        console.log("Adding remarks column...");
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "LoyaltyLedger" ADD COLUMN "remarks" TEXT`
        );
        console.log("✅ Added remarks column");
      }
    } catch (error) {
      console.error("Error checking columns:", error);
    }
    
  } catch (error) {
    console.error("Error:", error);
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
