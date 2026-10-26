import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { hiddenListingInventoryIds, setListingItemHidden } from "../../lib/marketplace/listing-visibility";

async function run() {
  const directory = await mkdtemp(path.join(tmpdir(), "listing-visibility-"));
  const url = `file:${path.join(directory, "test.db").replaceAll("\\", "/")}`;
  let db = new PrismaClient({ datasources: { db: { url } } });
  try {
    await db.$executeRaw`CREATE TABLE "Inventory" ("id" TEXT PRIMARY KEY)`;
    await db.$executeRaw`CREATE TABLE "MarketplaceShop" ("id" TEXT PRIMARY KEY)`;
    await db.$executeRaw`INSERT INTO "Inventory" VALUES ('item-a'), ('item-b')`;
    await db.$executeRaw`INSERT INTO "MarketplaceShop" VALUES ('shop-a'), ('shop-b')`;
    const scope = { inventoryId: "item-a", shopId: "shop-a", marketplace: "ETSY" };
    assert.deepEqual(await hiddenListingInventoryIds(db, "shop-a", "ETSY"), []);
    await setListingItemHidden(db, { ...scope, hidden: true });
    await setListingItemHidden(db, { ...scope, hidden: true });
    assert.deepEqual(await hiddenListingInventoryIds(db, "shop-a", "ETSY"), ["item-a"], "Repeated hide is idempotent");
    assert.deepEqual(await hiddenListingInventoryIds(db, "shop-b", "ETSY"), [], "Other shops remain visible");
    assert.deepEqual(await hiddenListingInventoryIds(db, "shop-a", "EBAY"), [], "Other marketplaces remain visible");
    await db.$disconnect();
    db = new PrismaClient({ datasources: { db: { url } } });
    assert.deepEqual(await hiddenListingInventoryIds(db, "shop-a", "ETSY"), ["item-a"], "Saved exclusions survive reconnecting");
    await setListingItemHidden(db, { ...scope, shopId: "shop-b", hidden: true });
    await setListingItemHidden(db, { ...scope, hidden: false });
    await setListingItemHidden(db, { ...scope, hidden: false });
    assert.deepEqual(await hiddenListingInventoryIds(db, "shop-a", "ETSY"), [], "Unhide restores the item");
    assert.deepEqual(await hiddenListingInventoryIds(db, "shop-b", "ETSY"), ["item-a"], "Restoring in one shop preserves another shop's exclusion");
    await assert.rejects(setListingItemHidden(db, { ...scope, inventoryId: "missing", hidden: true }), "Missing items cannot create orphan exclusions");
    await db.$executeRaw`DELETE FROM "Inventory" WHERE "id" = 'item-a'`;
    assert.deepEqual(await hiddenListingInventoryIds(db, "shop-b", "ETSY"), [], "Deleted inventory cleans up exclusions");
    console.log("Marketplace listing visibility integration tests passed (isolated SQLite database).");
  } finally {
    await db.$disconnect();
    await rm(directory, { recursive: true, force: true });
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
