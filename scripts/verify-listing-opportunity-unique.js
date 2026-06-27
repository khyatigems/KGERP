const { createClient } = require("@libsql/client");
const path = require("path");
const crypto = require("crypto");

try {
  const dotenv = require("dotenv");
  dotenv.config({ path: path.resolve(__dirname, "..", ".env.local") });
  dotenv.config({ path: path.resolve(__dirname, "..", ".env") });
} catch {}

const url =
  process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || "";
const authToken =
  process.env.TURSO_AUTH_TOKEN ||
  (() => {
    try {
      return new URL(url).searchParams.get("authToken") || undefined;
    } catch {
      return undefined;
    }
  })();

if (!url) {
  console.error("ERROR: Set TURSO_DATABASE_URL or DATABASE_URL (libsql://...) before running this script.");
  process.exit(1);
}

(async () => {
  const client = createClient({ url, authToken });

  // 1) Verify the live UNIQUE behavior with a brand-new inventoryId.
  const invId = crypto.randomUUID();
  const invId2 = crypto.randomUUID();
  console.log(`\n=== Composite UNIQUE live test ===`);
  console.log(`Using fresh inventoryIds: ${invId} and ${invId2}`);

  // We need a real Inventory row to satisfy the FK. Pick the first one and clone
  // the row is overkill — instead, use a real id from the table and add a fresh
  // row with a never-used (inventoryId, marketplace) pair by re-using existing
  // inventoryId but in marketplaces that DO NOT exist for it yet.
  const existing = await client.execute(
    "SELECT inventoryId, GROUP_CONCAT(marketplace) AS marketplaces FROM ListingOpportunity GROUP BY inventoryId"
  );

  let pickedInv = null;
  let missingMarketplaces = [];
  for (const row of existing.rows) {
    const have = new Set((row.marketplaces || "").split(","));
    const missing = ["ETSY", "EBAY", "AMAZON"].filter((m) => !have.has(m));
    if (missing.length >= 2) {
      pickedInv = row.inventoryId;
      missingMarketplaces = missing.slice(0, 2);
      break;
    }
  }

  if (!pickedInv) {
    console.log("  Could not find an inventoryId with two missing marketplaces.");
    console.log("  Falling back to a brand-new test — creating a stub Inventory row first.");
    // Use the very first inventory id and add a unique suffix to avoid any conflict
    const first = await client.execute("SELECT id FROM Inventory LIMIT 1");
    if (first.rows.length === 0) {
      console.log("  No Inventory rows exist; cannot test.");
      client.close();
      return;
    }
    pickedInv = first.rows[0].id;
    missingMarketplaces = ["TEST_MKT_A", "TEST_MKT_B"];
  }

  console.log(`  Using inventoryId=${pickedInv}, marketplaces=${JSON.stringify(missingMarketplaces)}`);

  try {
    await client.batch(
      [
        {
          sql: `INSERT INTO ListingOpportunity (id, inventoryId, marketplace, externalId, currentViews, currentWatches, currentFavourites, currentOrders, currentRevenue, currency, lastSyncedAt, updatedAt)
                VALUES (?, ?, ?, 'verify-etsy', 5, 0, 2, 0, 0, 'USD', datetime('now'), datetime('now'))`,
          args: [crypto.randomUUID(), pickedInv, missingMarketplaces[0]],
        },
        {
          sql: `INSERT INTO ListingOpportunity (id, inventoryId, marketplace, externalId, currentViews, currentWatches, currentFavourites, currentOrders, currentRevenue, currency, lastSyncedAt, updatedAt)
                VALUES (?, ?, ?, 'verify-ebay', 7, 0, 1, 0, 0, 'USD', datetime('now'), datetime('now'))`,
          args: [crypto.randomUUID(), pickedInv, missingMarketplaces[1]],
        },
      ],
      "write"
    );
    console.log("  ✅ Both inserts succeeded → composite UNIQUE working as intended");
  } catch (err) {
    console.log(`  ❌ Insert failed: ${err.message || err}`);
  } finally {
    await client.execute(
      "DELETE FROM ListingOpportunity WHERE externalId IN ('verify-etsy', 'verify-ebay')"
    );
  }

  // 2) Now try a SAME-marketplace duplicate to confirm the composite UNIQUE still enforces its own side
  console.log(`\n=== Composite UNIQUE enforcement test (same inventoryId + same marketplace) ===`);
  try {
    await client.batch(
      [
        {
          sql: `INSERT INTO ListingOpportunity (id, inventoryId, marketplace, externalId, currentViews, currentWatches, currentFavourites, currentOrders, currentRevenue, currency, lastSyncedAt, updatedAt)
                VALUES (?, ?, 'TEST_DUP_MKT', 'dup-a', 0,0,0,0,0,'USD', datetime('now'), datetime('now'))`,
          args: [crypto.randomUUID(), pickedInv],
        },
        {
          sql: `INSERT INTO ListingOpportunity (id, inventoryId, marketplace, externalId, currentViews, currentWatches, currentFavourites, currentOrders, currentRevenue, currency, lastSyncedAt, updatedAt)
                VALUES (?, ?, 'TEST_DUP_MKT', 'dup-b', 0,0,0,0,0,'USD', datetime('now'), datetime('now'))`,
          args: [crypto.randomUUID(), pickedInv],
        },
      ],
      "write"
    );
    console.log("  ❌ Both inserts succeeded — composite UNIQUE is NOT enforced (bug)");
  } catch (err) {
    console.log(`  ✅ Second insert rejected as expected: ${(err.message || err).split(":").slice(-1)[0].trim()}`);
  } finally {
    await client.execute(
      "DELETE FROM ListingOpportunity WHERE externalId IN ('dup-a','dup-b')"
    );
  }

  // 3) Purge the orphan sqlite_autoindex_ListingOpportunity_1 if it has no real SQL behind it
  console.log(`\n=== Cleaning up orphan auto-index ===`);
  const orphan = await client.execute(
    "SELECT name, sql FROM sqlite_master WHERE type='index' AND name='sqlite_autoindex_ListingOpportunity_1'"
  );
  if (orphan.rows.length === 0) {
    console.log("  Not present (already clean).");
  } else {
    const row = orphan.rows[0];
    if (row.sql) {
      console.log(`  Has a real SQL definition (${row.sql.slice(0, 80)}...), skipping purge.`);
    } else {
      try {
        await client.execute("PRAGMA writable_schema = 1");
        await client.execute(
          "DELETE FROM sqlite_master WHERE type='index' AND name='sqlite_autoindex_ListingOpportunity_1'"
        );
        await client.execute("PRAGMA writable_schema = 0");
        console.log("  ✅ Orphan auto-index removed.");
      } catch (err) {
        console.log(`  ❌ Failed to remove orphan: ${err.message || err}`);
      }
    }
  }

  console.log(`\n=== Final indexes on ListingOpportunity ===`);
  const final = await client.execute(
    "SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='ListingOpportunity' ORDER BY name"
  );
  for (const row of final.rows) {
    console.log(`  - ${row.name}${row.sql ? "" : " (orphan / no SQL)"}`);
  }

  client.close();
})();
