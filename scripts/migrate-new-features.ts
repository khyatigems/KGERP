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

const url = envVars.DATABASE_URL;

if (!url) {
  console.error("DATABASE_URL not found in .env or .env.local");
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
  console.log("Starting manual migration for new features...");

  const sqlStatements = [
    // Add column to Inventory
    `ALTER TABLE "Inventory" ADD COLUMN "collectionCodeId" TEXT;`,

    // Create RashiCode table
    `CREATE TABLE IF NOT EXISTS "RashiCode" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "code" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "RashiCode_code_key" ON "RashiCode"("code");`,
    `CREATE INDEX IF NOT EXISTS "RashiCode_status_idx" ON "RashiCode"("status");`,

    // Create CollectionCode table
    `CREATE TABLE IF NOT EXISTS "CollectionCode" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "code" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "CollectionCode_code_key" ON "CollectionCode"("code");`,
    `CREATE INDEX IF NOT EXISTS "CollectionCode_status_idx" ON "CollectionCode"("status");`,
    
    // Add implicit relation table for Inventory <-> RashiCode (Wait, RashiCode[] in Inventory?)
    // In schema.prisma:
    // model Inventory { ... rashiCodes RashiCode[] }
    // model RashiCode { ... inventory Inventory[] }
    // This is a Many-to-Many relation.
    // Prisma creates a join table like "_InventoryToRashiCode".
  ];

  // Need to check the implicit m-n table name and structure Prisma expects.
  // Standard naming: "_InventoryToRashiCode" (A: Inventory id, B: RashiCode id)
  // Let's assume standard Prisma convention.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const manyToManySql = [
      `CREATE TABLE IF NOT EXISTS "_InventoryToRashiCode" (
          "A" TEXT NOT NULL,
          "B" TEXT NOT NULL,
          FOREIGN KEY ("A") REFERENCES "Inventory" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          FOREIGN KEY ("B") REFERENCES "RashiCode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "_InventoryToRashiCode_AB_unique" ON "_InventoryToRashiCode"("A", "B");`,
      `CREATE INDEX IF NOT EXISTS "_InventoryToRashiCode_B_index" ON "_InventoryToRashiCode"("B");`
  ];

  // However, `relationMode = "prisma"` means NO FOREIGN KEYS in DB.
  // So the join table should be:
  const manyToManySqlNoFK = [
      `CREATE TABLE IF NOT EXISTS "_InventoryToRashiCode" (
          "A" TEXT NOT NULL,
          "B" TEXT NOT NULL
      );`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "_InventoryToRashiCode_AB_unique" ON "_InventoryToRashiCode"("A", "B");`,
      `CREATE INDEX IF NOT EXISTS "_InventoryToRashiCode_B_index" ON "_InventoryToRashiCode"("B");`
  ];
  
  // Combine
  const allStatements = [...sqlStatements, ...manyToManySqlNoFK];

  for (const sql of allStatements) {
    try {
      console.log(`Executing: ${sql}`);
      await client.execute(sql);
      console.log("Success.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("duplicate column name")) {
        console.log("Column already exists, skipping.");
      } else {
        console.error("Error executing SQL:", msg);
        // Continue? Yes, to ensure others are created.
      }
    }
  }

  console.log("Migration finished.");
}

main();
