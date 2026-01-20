import { createClient } from "@libsql/client";
import * as fs from "fs";
import * as path from "path";

// Load env
const envPath = path.resolve(process.cwd(), ".env");
const envVars: Record<string, string> = {};
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf-8").split("\n").forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        let val = match[2].trim();
        if (val.startsWith('"')) val = val.slice(1, -1);
        envVars[match[1].trim()] = val;
    }
  });
}

const url = envVars.DATABASE_URL;
const client = createClient({
  url: url?.split("?")[0] || "",
  authToken: new URLSearchParams(url?.split("?")[1]).get("authToken") || undefined,
});

async function main() {
  try {
    console.log("Inspecting Listing table...");
    const result = await client.execute("PRAGMA table_info(Listing)");
    console.table(result.rows);
    
    // Check for updatedAt
    const hasUpdatedAt = result.rows.some(r => r.name === "updatedAt");
    console.log(`Has updatedAt: ${hasUpdatedAt}`);
    
    if (!hasUpdatedAt) {
        console.log("Adding updatedAt column...");
        // SQLite doesn't support adding a column with a default value that depends on functions like CURRENT_TIMESTAMP easily in one go if it's NOT NULL without default, 
        // but Prisma @updatedAt implies a datetime. 
        // In schema: updatedAt DateTime @updatedAt. 
        // This usually translates to NOT NULL but Prisma handles the value.
        // However, for existing rows, we need a default.
        // We will add it as NULLABLE first or with DEFAULT.
        
        // Actually, Prisma's @updatedAt is handled by the client/middleware, but the column definition is usually just DATETIME.
        // Let's verify what Prisma expects. Usually it expects NOT NULL.
        
        await client.execute("ALTER TABLE Listing ADD COLUMN updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP");
        console.log("Added updatedAt column to Listing.");
    }
    
    // Also check other tables that might be missing it
    const tablesToCheck = ["CategoryCode", "GemstoneCode", "ColorCode", "Setting"];
    for (const table of tablesToCheck) {
        const info = await client.execute(`PRAGMA table_info(${table})`);
        const hasIt = info.rows.some(r => r.name === "updatedAt");
        if (!hasIt) {
            console.log(`Adding updatedAt to ${table}...`);
            await client.execute(`ALTER TABLE ${table} ADD COLUMN updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP`);
        }
    }

  } catch (e) {
    console.error(e);
  }
}

main();
