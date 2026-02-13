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
const url = process.argv[2] || envVars.DATABASE_URL;

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
    `CREATE INDEX IF NOT EXISTS "Inventory_collectionCodeId_idx" ON "Inventory"("collectionCodeId");`
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
