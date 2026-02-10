
import { prisma } from "../lib/prisma";

async function main() {
  console.log("Applying Accounting Schema...");

  try {
    // 1. Account Table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Account" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "code" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "type" TEXT NOT NULL,
          "subtype" TEXT,
          "description" TEXT,
          "isActive" BOOLEAN NOT NULL DEFAULT 1,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL
      );
    `);
    console.log("Created Account table");

    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Account_code_key" ON "Account"("code");
    `);
    console.log("Created Account indices");

    // 2. JournalEntry Table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "JournalEntry" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "date" DATETIME NOT NULL,
          "description" TEXT NOT NULL,
          "referenceType" TEXT,
          "referenceId" TEXT,
          "createdById" TEXT NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "JournalEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `);
    console.log("Created JournalEntry table");

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "JournalEntry_date_idx" ON "JournalEntry"("date");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "JournalEntry_referenceId_idx" ON "JournalEntry"("referenceId");
    `);
    console.log("Created JournalEntry indices");

    // 3. JournalLine Table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "JournalLine" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "journalEntryId" TEXT NOT NULL,
          "accountId" TEXT NOT NULL,
          "debit" REAL NOT NULL DEFAULT 0,
          "credit" REAL NOT NULL DEFAULT 0,
          "description" TEXT,
          CONSTRAINT "JournalLine_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "JournalLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `);
    console.log("Created JournalLine table");

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "JournalLine_journalEntryId_idx" ON "JournalLine"("journalEntryId");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "JournalLine_accountId_idx" ON "JournalLine"("accountId");
    `);
    console.log("Created JournalLine indices");

    console.log("Schema applied successfully.");
  } catch (e) {
    console.error("Error applying schema:", e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
