/**
 * Fix SKUs where color codes are HTML hex values (FF0000, 0000FF) instead of
 * proper short codes (RED, BLUE, etc.) from Code Management.
 *
 * Root cause: The ColorCode table has entries like:
 *   { name: "Red",  code: "FF0000" }  ← HTML hex, should be "RED"
 *   { name: "Blue", code: "0000FF" }  ← HTML hex, should be "BLUE"
 *
 * The fix-skus.ts script used these raw hex values when building SKU prefixes,
 * producing SKUs like KGLGRBYFF000075500015 instead of KGLGRBYRED75500015.
 *
 * Steps:
 *   1. Scan ColorCode table for entries with hex-like codes
 *   2. Update them to proper codes
 *   3. Find all inventory SKUs containing hex codes and fix them
 *
 * Usage: npx tsx scripts/fix-ff-color-codes.ts
 * To apply: FIX=1 npx tsx scripts/fix-ff-color-codes.ts
 */

import { createClient } from "@libsql/client";
import * as fs from "fs";
import * as path from "path";

// --- Environment ---
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
const client = createClient({ url, authToken });

// --- Helpers ---

/** Check if a code looks like an HTML hex color (e.g. FF0000, 0000FF, #FF0000) */
function isHexColorCode(code: string): boolean {
  const clean = code.replace(/^#/, "");
  return /^[0-9A-Fa-f]{6}$/.test(clean) || /^[0-9A-Fa-f]{3}$/.test(clean);
}

/** Derive a proper short code from a color name (uppercase, max 5 chars) */
function deriveProperCode(name: string): string {
  // Take first 5 chars uppercase, strip non-alphanumeric
  return name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
}

async function main() {
  console.log("\n=== STEP 1: Inspect ColorCode Table ===");

  const colorRows = await client.execute(`SELECT id, name, code FROM "ColorCode"`);
  const colorEntries: Array<{ id: string; name: string; code: string }> = [];

  for (const row of colorRows.rows) {
    colorEntries.push({
      id: row.id as string,
      name: (row.name as string || "").trim(),
      code: (row.code as string || "").trim(),
    });
  }

  console.log(`  Total ColorCode entries: ${colorEntries.length}\n`);

  // Identify hex-code entries and build fix map
  const hexEntries: Array<{ id: string; name: string; oldCode: string; newCode: string }> = [];
  const codeFixMap: Record<string, string> = {}; // old hex code → new proper code

  for (const e of colorEntries) {
    const isHex = isHexColorCode(e.code);
    const marker = isHex ? "⚠️  HEX CODE" : "   ";
    console.log(`  ${marker}  name="${e.name}"  code="${e.code}"`);

    if (isHex) {
      const newCode = deriveProperCode(e.name);
      if (!newCode) {
        console.log(`         ⚠️  Cannot derive proper code from name "${e.name}" — skipping`);
        continue;
      }
      hexEntries.push({ id: e.id, name: e.name, oldCode: e.code, newCode });
      // Store with normalized key (strip #, uppercase) for matching against SKU
      const normalizedKey = e.code.replace(/^#/, "").toUpperCase();
      codeFixMap[normalizedKey] = newCode;
    }
  }

  // Also check GemstoneCode and CategoryCode for hex codes
  async function checkOtherCodeTable(table: string, label: string) {
    const rows = await client.execute(`SELECT id, name, code FROM "${table}"`);
    for (const row of rows.rows) {
      const code = (row.code as string || "").trim();
      if (isHexColorCode(code)) {
        console.log(`\n  ⚠️  ${label}: name="${(row.name as string).trim()}" code="${code}" — also has hex code!`);
      }
    }
  }

  await checkOtherCodeTable("GemstoneCode", "GemstoneCode");
  await checkOtherCodeTable("CategoryCode", "CategoryCode");

  if (hexEntries.length === 0) {
    console.log("\n  ✅ No hex color codes found in ColorCode. Nothing to fix.");
    await client.close();
    return;
  }

  console.log(`\n  Hex codes to fix:`);
  for (const h of hexEntries) {
    console.log(`    "${h.name}": code "${h.oldCode}" → "${h.newCode}"  (matching SKU pattern: "${h.oldCode.replace(/^#/, "").toUpperCase()}")`);
  }

  // --- STEP 2: Find affected inventory items ---
  console.log("\n=== STEP 2: Find Affected Inventory Items ===");

  const items = await client.execute(`
    SELECT id, sku, category, "gemType", color, "weightValue", "weightUnit"
    FROM "Inventory"
    WHERE sku IS NOT NULL AND sku != ''
    ORDER BY "createdAt" ASC
  `);

  console.log(`  Scanned ${items.rows.length} items with SKU`);

  interface FixItem {
    id: string;
    oldSku: string;
    newSku: string;
    colorName: string;
    oldHexCode: string;
    newCode: string;
  }

  const fixes: FixItem[] = [];

  for (const item of items.rows) {
    const sku = (item.sku as string) || "";
    if (!sku.startsWith("KG") || sku.length < 10) continue;

    // Check if the SKU contains any of the hex codes we identified
    let fixedSku = sku;
    let foundHex = false;
    let matchedCode = "";

    // Sort by length descending so longer codes match first (e.g. FF0000 before FF)
    const sortedHexCodes = Object.keys(codeFixMap).sort((a, b) => b.length - a.length);

    for (const oldHex of sortedHexCodes) {
      if (fixedSku.includes(oldHex)) {
        // Sanity check: the hex should appear as the color code (after KG + cat + gem)
        const idx = fixedSku.indexOf(oldHex);
        // The code should be at least 4 chars from start (after KG + cat/gem minimum)
        if (idx < 2) continue;

        const newCode = codeFixMap[oldHex];
        fixedSku = fixedSku.replace(oldHex, newCode);
        foundHex = true;
        matchedCode = oldHex;
        break; // Only replace one hex per SKU
      }
    }

    if (!foundHex) continue;
    if (fixedSku === sku) continue;

    fixes.push({
      id: item.id as string,
      oldSku: sku,
      newSku: fixedSku,
      colorName: ((item.color as string) || "").trim(),
      oldHexCode: matchedCode,
      newCode: codeFixMap[matchedCode],
    });
  }

  console.log(`  Items with hex codes in SKU: ${fixes.length}\n`);

  if (fixes.length === 0) {
    console.log("  No affected items found.");
    await client.close();
    return;
  }

  console.log("  Affected items:");
  for (const f of fixes) {
    console.log(`    ${f.oldSku}  →  ${f.newSku}  (color="${f.colorName}" hex="${f.oldHexCode}"→"${f.newCode}")`);
  }

  // --- STEP 3: Apply fixes ---
  console.log("\n=== STEP 3: Apply Fixes ===");

  if (!process.env.FIX) {
    console.log("  DRY RUN — no changes made.");
    console.log('  Re-run with FIX=1:  FIX=1 npx tsx scripts/fix-ff-color-codes.ts\n');

    console.log("  Would DELETE duplicate hex entries from ColorCode:");
    for (const h of hexEntries) {
      console.log(`    DELETE "${h.name}" with code "${h.oldCode}" (correct entry "${h.name}" → "${h.newCode}" already exists)`);
    }
    console.log(`  Would update ${fixes.length} inventory SKUs`);
  } else {
    // DELETE duplicate hex entries from ColorCode (correct entries already exist)
    console.log("  Deleting duplicate hex entries from ColorCode...");
    for (const h of hexEntries) {
      await client.execute({
        sql: `DELETE FROM "ColorCode" WHERE id = ?`,
        args: [h.id],
      });
      console.log(`    ✅ Deleted "${h.name}" with code "${h.oldCode}" (keeping correct entry "${h.name}" → "${h.newCode}")`);
    }

    // Update Inventory SKUs
    console.log("\n  Updating inventory SKUs...");
    let count = 0;
    let errors = 0;

    for (const f of fixes) {
      try {
        await client.execute({
          sql: `UPDATE "Inventory" SET sku = ? WHERE id = ?`,
          args: [f.newSku, f.id],
        });
        console.log(`    ✅ ${f.oldSku} → ${f.newSku}`);
        count++;
      } catch (e) {
        console.error(`    ❌ Failed to update ${f.oldSku}:`, e);
        errors++;
      }
    }

    console.log(`\n  Updated: ${count}, Errors: ${errors}`);
  }

  console.log("\n=== Done ===");
  await client.close();
}

main().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
