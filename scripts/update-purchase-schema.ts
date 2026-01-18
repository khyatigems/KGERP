import { createClient } from "@libsql/client";
import * as fs from "fs";
import * as path from "path";

const envPath = path.resolve(process.cwd(), ".env.local");
const envVars: Record<string, string> = {};

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
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

const url = envVars.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not found");
  process.exit(1);
}

const clientUrl = url.split("?")[0];
const authToken = new URLSearchParams(url.split("?")[1]).get("authToken") || undefined;

const client = createClient({
  url: clientUrl,
  authToken: authToken,
});

async function main() {
  console.log("Adding columns to PurchaseItem...");
  try {
    await client.execute("ALTER TABLE PurchaseItem ADD COLUMN sizeValue TEXT");
    console.log("Added sizeValue");
  } catch (e) {
    console.log("sizeValue might already exist:", e instanceof Error ? e.message : String(e));
  }

  try {
    await client.execute("ALTER TABLE PurchaseItem ADD COLUMN sizeUnit TEXT");
    console.log("Added sizeUnit");
  } catch (e) {
    console.log("sizeUnit might already exist:", e instanceof Error ? e.message : String(e));
  }
}

main();
