
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
  console.log("Starting manual migration for CutCode...");

  const sqlStatements = [
    // Add column to Inventory
    `ALTER TABLE "Inventory" ADD COLUMN "cutCodeId" TEXT;`,

    // Create CutCode table
    `CREATE TABLE IF NOT EXISTS "CutCode" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "code" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "CutCode_code_key" ON "CutCode"("code");`,
    `CREATE INDEX IF NOT EXISTS "CutCode_status_idx" ON "CutCode"("status");`,
  ];

  for (const sql of sqlStatements) {
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
      }
    }
  }

  console.log("Migration finished.");
}

main();
