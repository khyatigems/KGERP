const { createClient } = require("@libsql/client");
const fs = require("fs");
const path = require("path");

try {
  const dotenv = require("dotenv");
  dotenv.config({ path: path.resolve(__dirname, "..", ".env.local") });
  dotenv.config({ path: path.resolve(__dirname, "..", ".env") });
} catch {}

const url =
  process.env.TURSO_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "";

const authToken =
  process.env.TURSO_AUTH_TOKEN ||
  (() => {
    try {
      const u = new URL(url);
      return u.searchParams.get("authToken") || undefined;
    } catch {
      return undefined;
    }
  })();

if (!url) {
  console.error("ERROR: Set TURSO_DATABASE_URL or DATABASE_URL (libsql://...) before running this script.");
  process.exit(1);
}

const splitSql = (raw) =>
  raw
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

async function exec(client, stmt) {
  const preview = stmt.replace(/\s+/g, " ").slice(0, 90);
  process.stdout.write(`  > ${preview}... `);
  try {
    await client.execute(stmt);
    console.log("ok");
  } catch (err) {
    console.log("FAILED");
    console.error(err.message || err);
    process.exit(1);
  }
}

(async () => {
  const client = createClient({ url, authToken });
  console.log(`Connected to ${url}`);

  const idx = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='ListingOpportunity'"
  );
  const indexNames = idx.rows.map((r) => r.name);
  console.log("Current indexes on ListingOpportunity:");
  for (const n of indexNames) console.log(`  - ${n}`);

  const hasAutoUnique = indexNames.includes("sqlite_autoindex_ListingOpportunity_1");
  const hasOldNamed = indexNames.includes("ListingOpportunity_inventoryId_key");
  const hasNewComposite = indexNames.includes("ListingOpportunity_inventoryId_marketplace_key");

  if (!hasAutoUnique && !hasOldNamed && hasNewComposite) {
    console.log("Schema already correct. Nothing to do.");
    client.close();
    return;
  }

  console.log("\nRebuilding ListingOpportunity to drop the legacy single-column UNIQUE constraint...");

  await exec(
    client,
    `CREATE TABLE "ListingOpportunity_new" (
       "id" TEXT NOT NULL PRIMARY KEY,
       "inventoryId" TEXT NOT NULL,
       "marketplace" TEXT NOT NULL,
       "externalId" TEXT,
       "currentViews" INTEGER NOT NULL DEFAULT 0,
       "currentWatches" INTEGER NOT NULL DEFAULT 0,
       "currentFavourites" INTEGER NOT NULL DEFAULT 0,
       "currentOrders" INTEGER NOT NULL DEFAULT 0,
       "currentRevenue" REAL NOT NULL DEFAULT 0,
       "currency" TEXT NOT NULL DEFAULT 'USD',
       "lastSyncedAt" DATETIME,
       "updatedAt" DATETIME NOT NULL,
       CONSTRAINT "ListingOpportunity_new_inventoryId_fkey"
         FOREIGN KEY ("inventoryId") REFERENCES "Inventory" ("id")
         ON DELETE CASCADE ON UPDATE CASCADE
     )`
  );

  await exec(
    client,
    `INSERT INTO "ListingOpportunity_new"
       ("id", "inventoryId", "marketplace", "externalId",
        "currentViews", "currentWatches", "currentFavourites",
        "currentOrders", "currentRevenue", "currency",
        "lastSyncedAt", "updatedAt")
     SELECT
       "id", "inventoryId", "marketplace", "externalId",
       "currentViews", "currentWatches", "currentFavourites",
       "currentOrders", "currentRevenue", "currency",
       "lastSyncedAt", "updatedAt"
     FROM "ListingOpportunity"`
  );

  await exec(client, `DROP TABLE "ListingOpportunity"`);
  await exec(client, `ALTER TABLE "ListingOpportunity_new" RENAME TO "ListingOpportunity"`);

  await exec(
    client,
    `CREATE INDEX "ListingOpportunity_marketplace_externalId_idx"
       ON "ListingOpportunity"("marketplace", "externalId")`
  );
  await exec(
    client,
    `CREATE INDEX "ListingOpportunity_lastSyncedAt_idx"
       ON "ListingOpportunity"("lastSyncedAt")`
  );
  await exec(
    client,
    `CREATE UNIQUE INDEX "ListingOpportunity_inventoryId_marketplace_key"
       ON "ListingOpportunity"("inventoryId", "marketplace")`
  );

  const verify = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='ListingOpportunity' ORDER BY name"
  );
  console.log("\nIndexes on ListingOpportunity after migration:");
  for (const row of verify.rows) console.log(`  - ${row.name}`);

  console.log("\nMigration applied successfully.");
  client.close();
})();
