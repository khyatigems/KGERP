import { config } from "dotenv";

config({ path: ".env.local", override: true });
config({ path: ".env" });

import { ensureBillfreePhase1Schema, prisma } from "../../lib/prisma";
import crypto from "crypto";

async function main() {
  console.log("🔧 SAFELY fixing JournalEntry schema...");
  
  try {
    // Check current schema
    const columns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
      `PRAGMA table_info("JournalEntry")`
    );
    
    const columnNames = columns.map(c => c.name);
    console.log("Current JournalEntry columns:", columnNames);
    
    // Add missing isReversed column if needed
    if (!columnNames.includes('isReversed')) {
      console.log("Adding 'isReversed' column to JournalEntry...");
      await prisma.$executeRawUnsafe(`ALTER TABLE "JournalEntry" ADD COLUMN "isReversed" BOOLEAN DEFAULT FALSE`);
      console.log("✅ Added 'isReversed' column");
    } else {
      console.log("✅ 'isReversed' column already exists");
    }
    
  } catch (error) {
    console.error("❌ Error fixing JournalEntry schema:", error);
  }
  
  console.log("✅ JournalEntry schema fix completed");
  
  await prisma.$disconnect();
}

main().catch(console.error);
