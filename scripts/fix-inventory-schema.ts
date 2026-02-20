import { createClient } from "@libsql/client";
import * as fs from "fs";
import * as path from "path";

// 1. Load Environment Variables
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
loadEnv(envPathLocal);

// 2. Initialize DB Client
let url = process.argv[2] || envVars.DATABASE_URL;

if (!url) {
  console.error("DATABASE_URL not found. Usage: npx tsx scripts/fix-inventory-schema.ts [CONNECTION_STRING]");
  process.exit(1);
}

// Clean up double protocol if present (common copy-paste error)
if (url.startsWith("libsql://libsql://")) {
  url = url.replace("libsql://libsql://", "libsql://");
}

console.log("Connecting to:", url.split("?")[0] + " (token hidden)");

// Pass the full URL string directly to createClient
// The library handles parsing the authToken from the query string if present
const client = createClient({
  url: url,
});

// 3. Define Expected Columns
const expectedColumns: Record<string, string> = {
  // Core
  "condition": "TEXT DEFAULT 'New'",
  "pieces": "INTEGER DEFAULT 1",
  "status": "TEXT DEFAULT 'IN_STOCK'",
  
  // Weights & Measures
  "weightValue": "REAL DEFAULT 0",
  "weightUnit": "TEXT",
  "carats": "REAL DEFAULT 0",
  "weightRatti": "REAL",
  "weight_grams": "REAL",
  
  // Pricing
  "profit": "REAL",
  "pricingMode": "TEXT DEFAULT 'FIXED'",
  "sellingRatePerCarat": "REAL",
  "flatSellingPrice": "REAL",
  "purchaseRatePerCarat": "REAL",
  "flatPurchaseCost": "REAL",
  "rapPrice": "REAL DEFAULT 0",
  "discountPercent": "REAL DEFAULT 0",
  
  // Certificates & Lab
  "certificateNo": "TEXT",
  "certificate_number": "TEXT",
  "certification": "TEXT",
  "lab": "TEXT",
  "certificate_lab": "TEXT DEFAULT 'GCI'",
  "certificateComments": "TEXT",
  
  // Gem Details
  "gemType": "TEXT",
  "stone_type": "TEXT",
  "shape": "TEXT",
  "color": "TEXT",
  "clarity": "TEXT",
  "clarity_grade": "TEXT",
  "cut": "TEXT",
  "cut_grade": "TEXT",
  "polish": "TEXT",
  "symmetry": "TEXT",
  "fluorescence": "TEXT",
  "measurements": "TEXT",
  "dimensionsMm": "TEXT",
  "tablePercent": "REAL",
  "depthPercent": "REAL",
  "ratio": "REAL",
  "origin": "TEXT",
  "origin_country": "TEXT",
  "treatment": "TEXT",
  "cut_polished_in": "TEXT DEFAULT 'India'",
  "transparency": "TEXT",
  
  // Jewelry
  "braceletType": "TEXT",
  "standardSize": "TEXT",
  "beadSizeMm": "REAL",
  "beadCount": "INTEGER",
  "holeSizeMm": "REAL",
  "innerCircumferenceMm": "REAL",
  
  // Logistics & Metadata
  "qc_code": "TEXT",
  "hsn_code": "TEXT",
  "notes": "TEXT",
  "location": "TEXT",
  "stockLocation": "TEXT",
  "purchaseId": "TEXT",
  "vendorId": "TEXT",
  "batchId": "TEXT",
  "imageUrl": "TEXT",
  "videoUrl": "TEXT",
  
  // Relations (Foreign Keys stored as TEXT in Prisma SQLite)
  "categoryCodeId": "TEXT",
  "gemstoneCodeId": "TEXT",
  "colorCodeId": "TEXT",
  "cutCodeId": "TEXT",
  "collectionCodeId": "TEXT"
};

async function main() {
  console.log(`Checking schema for 'Inventory' table...`);

  try {
    // Get existing columns
    const result = await client.execute("PRAGMA table_info(Inventory)");
    const existingColumns = new Set(result.rows.map((row) => (row as unknown as { name: string }).name));
    
    console.log("Existing columns:", Array.from(existingColumns).sort().join(", "));

    const missingColumns = [];
    
    for (const [colName, colDef] of Object.entries(expectedColumns)) {
      if (!existingColumns.has(colName)) {
        missingColumns.push({ name: colName, def: colDef });
      }
    }

    if (missingColumns.length === 0) {
      console.log("✅ All expected columns are present. No changes needed.");
      return;
    }

    console.log(`⚠️  Found ${missingColumns.length} missing columns:`);
    missingColumns.forEach(c => console.log(` - ${c.name} (${c.def})`));

    console.log("Applying fixes...");
    
    for (const col of missingColumns) {
      const sql = `ALTER TABLE "Inventory" ADD COLUMN "${col.name}" ${col.def};`;
      console.log(`Executing: ${sql}`);
      try {
        await client.execute(sql);
        console.log(`✅ Added column: ${col.name}`);
      } catch (e) {
        console.error(`❌ Failed to add column ${col.name}:`, e);
      }
    }

    console.log("Schema fix complete.");

  } catch (e) {
    console.error("Error checking/fixing schema:", e);
  }
}

main();
