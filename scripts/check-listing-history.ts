import { createClient } from "@libsql/client";
import * as fs from "fs";
import * as path from "path";

const envPathLocal = path.resolve(process.cwd(), ".env.local");
const envVars: Record<string, string> = {};
if (fs.existsSync(envPathLocal)) {
  fs.readFileSync(envPathLocal, "utf-8").split("\n").forEach((line) => {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) {
      let v = m[2].trim();
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      envVars[m[1].trim()] = v;
    }
  });
}

let url = envVars.DATABASE_URL;
if (url && url.startsWith('"')) url = url.slice(1, -1);
let tok = envVars.TURSO_AUTH_TOKEN;
if (tok && tok.startsWith('"')) tok = tok.slice(1, -1);
const client = createClient({ url, authToken: tok });

async function main() {
  const sku = "KGBRSUNRCB178600045";

  // 1. Find the listing
  const listing = await client.execute({
    sql: 'SELECT l.id, l."externalId", l."listedPrice", l.status, l."createdAt" FROM Listing l JOIN Inventory i ON i.id = l."inventoryId" WHERE i.sku = ?',
    args: [sku],
  });

  if (listing.rows.length === 0) {
    console.log(`No listing found for SKU: ${sku}`);
    client.close();
    return;
  }

  const row = listing.rows[0];
  const listingId = row.id as string;
  console.log(`\n=== LISTING ===`);
  console.log(`SKU: ${sku}`);
  console.log(`Listing ID: ${listingId}`);
  console.log(`eBay ID: ${row.externalId}`);
  console.log(`Current listedPrice: $${row.listedPrice}`);
  console.log(`Status: ${row.status}`);
  console.log(`Created: ${row.createdAt}`);

  // 2. Check all price history
  const history = await client.execute({
    sql: 'SELECT id, price, changedBy, changedAt FROM ListingPriceHistory WHERE listingId = ? ORDER BY changedAt ASC',
    args: [listingId],
  });

  console.log(`\n=== PRICE HISTORY (${history.rows.length} entries) ===`);
  for (const h of history.rows) {
    console.log(`  $${h.price} | by: ${h.changedBy} | at: ${h.changedAt} | id: ${h.id}`);
  }

  // 3. Check ALL listings for this SKU (in case there are duplicates)
  const allListings = await client.execute({
    sql: 'SELECT l.id, l."externalId", l."listedPrice", l.status, l."createdAt" FROM Listing l JOIN Inventory i ON i.id = l."inventoryId" WHERE i.sku = ?',
    args: [sku],
  });

  console.log(`\n=== ALL LISTINGS FOR SKU (${allListings.rows.length}) ===`);
  for (const l of allListings.rows) {
    console.log(`  id=${l.id}, extId=${l.externalId}, price=$${l.listedPrice}, status=${l.status}, created=${l.createdAt}`);
  }

  // 4. Check price history for ALL listings
  for (const l of allListings.rows) {
    const h = await client.execute({
      sql: 'SELECT id, price, changedBy, changedAt FROM ListingPriceHistory WHERE listingId = ? ORDER BY changedAt ASC',
      args: [l.id as string],
    });
    console.log(`\n  Price history for listing ${l.id}:`);
    for (const r of h.rows) {
      console.log(`    $${r.price} | by: ${r.changedBy} | at: ${r.changedAt}`);
    }
  }

  client.close();
}

main().catch(console.error);
