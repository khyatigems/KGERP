/**
 * Backfill categoryCodeId, gemstoneCodeId, colorCodeId, cutCodeId
 * on Inventory rows by matching text name fields against the code tables.
 *
 * Usage: npx tsx scripts/backfill-inventory-code-fks.ts [DATABASE_URL]
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

async function loadCodeMap(table: string) {
  const rows = await client.execute(`SELECT id, name FROM "${table}"`);
  const map: Record<string, string> = {};
  const names: string[] = [];
  for (const row of rows.rows) {
    const name = (row.name as string || "").trim().toLowerCase();
    const id = row.id as string;
    if (name && id) {
      map[name] = id;
      names.push(name);
    }
  }
  return [map, names] as const;
}

function findBestMatch(
  input: string,
  map: Record<string, string>,
  allNames: string[]
): string | null {
  if (!input) return null;
  if (map[input]) return map[input];

  // Partial match: find a gemstone name that includes the input (or vice versa)
  const match = allNames.find(
    (n) => n.includes(input) || input.includes(n)
  );
  if (match && map[match]) return map[match];

  return null;
}

async function main() {
  console.log("Loading code maps...");
  const [[catMap, catNames], [gemMap, gemNames], [colMap, colNames], [cutMap, cutNames]] = await Promise.all([
    loadCodeMap("CategoryCode"),
    loadCodeMap("GemstoneCode"),
    loadCodeMap("ColorCode"),
    loadCodeMap("CutCode"),
  ]);
  console.log(`  CategoryCode: ${Object.keys(catMap).length}`);
  console.log(`  GemstoneCode: ${Object.keys(gemMap).length}`);
  console.log(`  ColorCode:    ${Object.keys(colMap).length}`);
  console.log(`  CutCode:      ${Object.keys(cutMap).length}`);

  console.log("\nFetching inventory items...");
  const items = await client.execute(`
    SELECT id, category, "gemType", color, cut,
           "categoryCodeId", "gemstoneCodeId", "colorCodeId", "cutCodeId"
    FROM "Inventory"
    ORDER BY "createdAt" ASC
  `);
  console.log(`  Total items: ${items.rows.length}`);

  let updated = 0;
  let skipped = 0;

  for (const item of items.rows) {
    const id = item.id as string;
    const categoryName = ((item.category as string) || "").trim().toLowerCase();
    const gemTypeName = ((item.gemType as string) || "").trim().toLowerCase();
    const colorName = ((item.color as string) || "").trim().toLowerCase();
    const cutName = ((item.cut as string) || "").trim().toLowerCase();

    const newCatId = catMap[categoryName] || null;
    const newGemId = findBestMatch(gemTypeName, gemMap, gemNames);
    const newColId = findBestMatch(colorName, colMap, colNames);
    const newCutId = findBestMatch(cutName, cutMap, cutNames);

    const currentCatId = item.categoryCodeId as string | null;
    const currentGemId = item.gemstoneCodeId as string | null;
    const currentColId = item.colorCodeId as string | null;
    const currentCutId = item.cutCodeId as string | null;

    const needsUpdate =
      (newCatId && newCatId !== currentCatId) ||
      (newGemId && newGemId !== currentGemId) ||
      (newColId && newColId !== currentColId) ||
      (newCutId && newCutId !== currentCutId);

    if (!needsUpdate) {
      skipped++;
      continue;
    }

    const sets: string[] = [];
    const args: unknown[] = [];
    if (newCatId && newCatId !== currentCatId) { sets.push('"categoryCodeId" = ?'); args.push(newCatId); }
    if (newGemId && newGemId !== currentGemId) { sets.push('"gemstoneCodeId" = ?'); args.push(newGemId); }
    if (newColId && newColId !== currentColId) { sets.push('"colorCodeId" = ?'); args.push(newColId); }
    if (newCutId && newCutId !== currentCutId) { sets.push('"cutCodeId" = ?'); args.push(newCutId); }

    if (sets.length === 0) { skipped++; continue; }

    args.push(id);
    await client.execute({
      sql: `UPDATE "Inventory" SET ${sets.join(", ")} WHERE id = ?`,
      args: args as any,
    });

    const changes: string[] = [];
    if (newCatId && newCatId !== currentCatId) changes.push(`categoryCodeId: ${currentCatId || "NULL"} → ${newCatId}`);
    if (newGemId && newGemId !== currentGemId) changes.push(`gemstoneCodeId: ${currentGemId || "NULL"} → ${newGemId}`);
    if (newColId && newColId !== currentColId) changes.push(`colorCodeId: ${currentColId || "NULL"} → ${newColId}`);
    if (newCutId && newCutId !== currentCutId) changes.push(`cutCodeId: ${currentCutId || "NULL"} → ${newCutId}`);

    console.log(`  UPDATED: ${id} (${categoryName} / ${gemTypeName} / ${colorName}) — ${changes.join(", ")}`);
    updated++;
  }

  console.log("\n=== Summary ===");
  console.log(`  Total items: ${items.rows.length}`);
  console.log(`  Updated:     ${updated}`);
  console.log(`  Skipped:     ${skipped}`);

  client.close();
}

main();
