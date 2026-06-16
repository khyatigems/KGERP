/**
 * Bulk fix script: backfill hsnCode for inventory items using the category->HSN mapping
 * stored in gpisSettings.categoryHsnJson.
 *
 * Run with:
 *   npx tsx scripts/backfill-hsn-codes.ts                # dry-run (preview changes)
 *   npx tsx scripts/backfill-hsn-codes.ts --apply       # actually update the database
 *   npx tsx scripts/backfill-hsn-codes.ts --apply --fix-invalid  # also fix invalid hsnCode values
 */

import { createClient } from "@libsql/client";
import * as fs from "fs";
import * as path from "path";

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
      // Strip surrounding quotes (single or double)
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      envVars[m[1].trim()] = val;
    }
  });
}

loadEnv(envPath);
loadEnv(envPathLocal);

let url = envVars.DATABASE_URL || envVars.TURSO_DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not found. Provide via .env or .env.local");
  process.exit(1);
}
if (url.startsWith("libsql://libsql://")) url = url.replace("libsql://libsql://", "libsql://");
if (url.startsWith('"') && url.endsWith('"')) url = url.slice(1, -1);
let authToken = envVars.TURSO_AUTH_TOKEN || envVars.DATABASE_AUTH_TOKEN;
if (authToken) {
  if (authToken.startsWith('"') && authToken.endsWith('"')) authToken = authToken.slice(1, -1);
  if (authToken.startsWith("'") && authToken.endsWith("'")) authToken = authToken.slice(1, -1);
}

const client = createClient({ url, authToken });

const args = new Set(process.argv.slice(2));
const APPLY = args.has("--apply");
const FIX_INVALID = args.has("--fix-invalid");

function isInvalidHsn(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return true;
  const trimmed = String(value).trim();
  if (trimmed === "") return true;
  // The literal string "hsnCode" or other placeholders are invalid
  if (trimmed.toLowerCase() === "hsncode") return true;
  if (trimmed.toLowerCase() === "hsn") return true;
  if (trimmed.toLowerCase() === "hsn code") return true;
  return false;
}

function isValidHsn(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return false;
  const trimmed = String(value).trim();
  if (trimmed === "") return false;
  return !isInvalidHsn(trimmed);
}

async function main() {
  console.log(`\nMode: ${APPLY ? "APPLY (will update DB)" : "DRY-RUN (no changes)"}`);
  console.log(`Fix invalid existing values: ${FIX_INVALID ? "YES" : "NO"}\n`);

  // 1. Load category -> HSN mapping
  const settingsResult = await client.execute(
    `SELECT "categoryHsnJson" FROM "gpisSettings" LIMIT 1`
  );
  let categoryHsnMap: Record<string, string> = {};
  if (settingsResult.rows.length > 0) {
    const raw = settingsResult.rows[0].categoryHsnJson as string | null;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          for (const [k, v] of Object.entries(parsed)) {
            if (typeof v === "string" && v.trim()) {
              categoryHsnMap[k] = v.trim();
            }
          }
        }
      } catch (e) {
        console.warn("Failed to parse categoryHsnJson:", e);
      }
    }
  }
  console.log(`Loaded ${Object.keys(categoryHsnMap).length} category->HSN mappings`);

  // 2. Find all IN_STOCK items with missing or invalid hsnCode
  const allItems = await client.execute(
    `SELECT id, sku, category, "hsn_code" FROM "Inventory" WHERE status = 'IN_STOCK'`
  );
  console.log(`Total IN_STOCK items: ${allItems.rows.length}\n`);

  // 3. Categorize items
  let missingCount = 0;
  let invalidCount = 0;
  let fixableCount = 0;
  let unfixableCount = 0;
  const fixes: Array<{ id: string; sku: string; from: string | null; to: string }> = [];

  for (const row of allItems.rows) {
    const id = row.id as string;
    const sku = row.sku as string;
    const category = row.category as string;
    const currentHsn = (row as { hsn_code?: string | null }).hsn_code ?? (row as { hsnCode?: string | null }).hsnCode ?? null;
    const needsFix = isInvalidHsn(currentHsn);

    if (!needsFix) continue;

    if (currentHsn && currentHsn.trim() !== "") {
      invalidCount++;
      if (!FIX_INVALID) continue;
    } else {
      missingCount++;
    }

    const newHsn = category ? categoryHsnMap[category] : undefined;
    if (newHsn && isValidHsn(newHsn)) {
      fixableCount++;
      fixes.push({ id, sku, from: currentHsn, to: newHsn });
    } else {
      unfixableCount++;
    }
  }

  console.log(`=== Analysis ===`);
  console.log(`Items with missing hsnCode: ${missingCount}`);
  console.log(`Items with invalid hsnCode (literal 'hsnCode' or similar): ${invalidCount}`);
  console.log(`Fixable (have category->HSN mapping): ${fixableCount}`);
  console.log(`Unfixable (no mapping for category): ${unfixableCount}`);
  console.log();

  if (fixes.length === 0) {
    console.log("No fixes needed.");
    client.close();
    return;
  }

  // Print first 20 fixes
  console.log(`=== ${APPLY ? "Applying fixes" : "Would fix"} (showing first 20) ===`);
  for (const fix of fixes.slice(0, 20)) {
    console.log(`  ${fix.sku}: ${JSON.stringify(fix.from)} -> ${JSON.stringify(fix.to)}`);
  }
  if (fixes.length > 20) {
    console.log(`  ... and ${fixes.length - 20} more`);
  }
  console.log();

  if (!APPLY) {
    console.log("DRY-RUN: pass --apply to actually update the database");
    client.close();
    return;
  }

  // Apply fixes
  let applied = 0;
  for (const fix of fixes) {
    try {
      await client.execute({
        sql: `UPDATE "Inventory" SET "hsn_code" = ? WHERE id = ?`,
        args: [fix.to, fix.id],
      });
      applied++;
    } catch (e) {
      console.error(`Failed to update ${fix.sku}:`, e);
    }
  }
  console.log(`Applied ${applied} of ${fixes.length} fixes.`);

  client.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
