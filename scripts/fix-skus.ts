/**
 * Migration script to fix SKUs with incorrect category/gemstone/color codes.
 *
 * The bug: categoryCodeId defaulted to categories[0] (first alphabetically)
 * instead of matching the user's selected category. This caused items saved
 * as "Loose Gemstone" (code LG) to have "BD" (Beads) in their SKU.
 *
 * IMPORTANT: We resolve codes from the NAME fields (category, gemType, color),
 * NOT from the code ID foreign keys — because those IDs are the source of the bug.
 *
 * Usage: npx tsx scripts/fix-skus.ts [DATABASE_URL]
 * If DATABASE_URL is omitted, reads from .env.local or .env
 */

import { createClient } from "@libsql/client";
import * as fs from "fs";
import * as path from "path";

// --- 1. Load Environment ---
const envPathLocal = path.resolve(process.cwd(), ".env.local");
const envPath = path.resolve(process.cwd(), ".env");
const envVars: Record<string, string> = {};

function loadEnv(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf-8");
  content.split("\n").forEach((line) => {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) {
      let val = m[2].trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      envVars[m[1].trim()] = val;
    }
  });
}

loadEnv(envPath);
loadEnv(envPathLocal);

let url = process.argv[2] || envVars.DATABASE_URL || envVars.TURSO_DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not found. Provide as argument or in .env / .env.local");
  process.exit(1);
}
if (url.startsWith("libsql://libsql://")) url = url.replace("libsql://libsql://", "libsql://");

const authToken = envVars.TURSO_AUTH_TOKEN || envVars.DATABASE_AUTH_TOKEN;

console.log("Connecting to database...");

const client = createClient({ url, authToken });

// --- 2. Load Code Maps (name → code) ---
async function loadNameToCodeMap(table: string): Promise<Record<string, string>> {
  const rows = await client.execute(`SELECT name, code FROM "${table}"`);
  const map: Record<string, string> = {};
  for (const row of rows.rows) {
    const name = (row.name as string || "").trim();
    const code = (row.code as string || "").trim();
    if (name && code) {
      map[name.toLowerCase()] = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
    }
  }
  return map;
}

async function main() {
  console.log("Loading code maps (name → code)...");
  const [catNameToCode, gemNameToCode, colNameToCode] = await Promise.all([
    loadNameToCodeMap("CategoryCode"),
    loadNameToCodeMap("GemstoneCode"),
    loadNameToCodeMap("ColorCode"),
  ]);

  console.log(`  CategoryCode: ${Object.keys(catNameToCode).length} entries`);
  console.log(`  GemstoneCode: ${Object.keys(gemNameToCode).length} entries`);
  console.log(`  ColorCode:    ${Object.keys(colNameToCode).length} entries`);

  // Print all category codes for debugging
  console.log("\n  Category codes:");
  for (const [name, code] of Object.entries(catNameToCode)) {
    console.log(`    "${name}" → "${code}"`);
  }

  // --- 3. Fetch All Inventory Items (with NAME fields, not code IDs) ---
  console.log("\nFetching inventory items...");
  const items = await client.execute(`
    SELECT id, sku, category, "gemType", color,
           "weightValue", "weightUnit"
    FROM "Inventory"
    WHERE sku IS NOT NULL AND sku != ''
    ORDER BY "createdAt" ASC
  `);

  console.log(`  Total items with SKU: ${items.rows.length}`);

  // --- 4. Process Each Item ---
  function normalizeCode(code: string): string {
    return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  }

  function formatWeight(value: number): string {
    return value.toFixed(2).replace(".", "");
  }

  function buildExpectedPrefix(
    catCode: string,
    gemCode: string,
    colCode: string,
    weightVal: number
  ): string {
    const cat = normalizeCode(catCode || "XX");
    const gem = normalizeCode(gemCode || "XX");
    const col = normalizeCode(colCode || "XX");
    const wgt = formatWeight(weightVal);
    return `KG${cat}${gem}${col}${wgt}`;
  }

  let fixed = 0;
  let skipped = 0;
  let errors = 0;

  for (const item of items.rows) {
    const id = item.id as string;
    const currentSku = item.sku as string;

    // Parse current serial number (last 5 chars of SKU)
    const seqNum = currentSku.slice(-5);
    if (!/^\d{5}$/.test(seqNum)) {
      skipped++;
      continue;
    }

    // Resolve codes from NAME fields (not code IDs)
    const categoryName = ((item.category as string) || "").trim();
    const gemTypeName = ((item.gemType as string) || "").trim();
    const colorName = ((item.color as string) || "").trim();

    const catCode = catNameToCode[categoryName.toLowerCase()] || undefined;
    const gemCode = gemNameToCode[gemTypeName.toLowerCase()] || undefined;
    const colCode = colNameToCode[colorName.toLowerCase()] || undefined;

    if (!catCode && !gemCode && !colCode) {
      // No codes resolved — skip
      skipped++;
      continue;
    }

    // Build expected prefix
    const weightVal = Number(item.weightValue || 0);
    const weightUnit = (item.weightUnit as string) || "cts";
    let effectiveWeight = weightVal;
    if (weightUnit === "gms") effectiveWeight = weightVal * 5;

    const expectedPrefix = buildExpectedPrefix(
      catCode || "XX",
      gemCode || "XX",
      colCode || "XX",
      effectiveWeight
    );

    const currentPrefix = currentSku.slice(0, -5);
    if (currentPrefix === expectedPrefix) {
      skipped++;
      continue;
    }

    const newSku = `${expectedPrefix}${seqNum}`;

    try {
      await client.execute({
        sql: `UPDATE "Inventory" SET sku = ? WHERE id = ?`,
        args: [newSku, id],
      });
      console.log(`  FIXED: ${currentSku} → ${newSku}  (${categoryName} / ${gemTypeName} / ${colorName})`);
      fixed++;
    } catch (e) {
      console.error(`  ERROR: Failed to update ${currentSku}:`, e);
      errors++;
    }
  }

  // --- 5. Summary ---
  console.log("\n=== Summary ===");
  console.log(`  Total items scanned: ${items.rows.length}`);
  console.log(`  SKUs fixed:          ${fixed}`);
  console.log(`  SKUs skipped:        ${skipped}`);
  console.log(`  Errors:              ${errors}`);

  client.close();
}

main();
