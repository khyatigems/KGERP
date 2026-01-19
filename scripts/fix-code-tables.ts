import { createClient } from "@libsql/client";
import * as fs from "fs";
import * as path from "path";

function loadDatabaseUrlFromEnvLocal(): string {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    throw new Error(".env.local not found");
  }

  const envContent = fs.readFileSync(envPath, "utf-8");
  const envVars: Record<string, string> = {};

  envContent.split("\n").forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      let value = match[2].trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      envVars[match[1].trim()] = value;
    }
  });

  const url = envVars.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL not found in .env.local");
  }
  return url;
}

async function main() {
  const fullUrl = loadDatabaseUrlFromEnvLocal();
  const clientUrl = fullUrl.split("?")[0];
  const authToken = new URLSearchParams(fullUrl.split("?")[1]).get("authToken") || undefined;

  const client = createClient({
    url: clientUrl,
    authToken,
  });

  const statements = [
    `ALTER TABLE "CategoryCode" ADD COLUMN "status" TEXT DEFAULT 'ACTIVE'`,
    `CREATE INDEX IF NOT EXISTS "CategoryCode_status_idx" ON "CategoryCode"("status")`,
    `ALTER TABLE "GemstoneCode" ADD COLUMN "status" TEXT DEFAULT 'ACTIVE'`,
    `CREATE INDEX IF NOT EXISTS "GemstoneCode_status_idx" ON "GemstoneCode"("status")`,
    `ALTER TABLE "ColorCode" ADD COLUMN "status" TEXT DEFAULT 'ACTIVE'`,
    `CREATE INDEX IF NOT EXISTS "ColorCode_status_idx" ON "ColorCode"("status")`,
  ];

  for (const sql of statements) {
    try {
      await client.execute(sql);
      console.log("Executed:", sql);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (
        message.includes("duplicate column name") ||
        message.includes("already exists")
      ) {
        console.log("Skipping existing:", sql);
      } else if (message.includes("no such table")) {
        console.error("Missing table while running:", sql);
      } else {
        console.error("Error executing:", sql);
        console.error(message);
      }
    }
  }

  console.log("Code tables fix completed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

