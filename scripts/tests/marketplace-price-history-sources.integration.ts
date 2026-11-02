import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

async function main() {
  const directory = await mkdtemp(join(tmpdir(), "price-source-repair-test-"));
  const db = new PrismaClient({ datasources: { db: { url: `file:${join(directory, "test.db").replaceAll("\\", "/")}` } } });
  try {
    await db.$executeRawUnsafe('CREATE TABLE "MarketplaceShop" (id TEXT PRIMARY KEY, marketplace TEXT)');
    await db.$executeRawUnsafe('CREATE TABLE "Listing" (id TEXT PRIMARY KEY, platform TEXT, marketplaceShopId TEXT)');
    await db.$executeRawUnsafe('CREATE TABLE "ListingPriceHistory" (id TEXT PRIMARY KEY, listingId TEXT, price REAL, changedBy TEXT, changedAt TEXT)');
    await db.$executeRawUnsafe("INSERT INTO MarketplaceShop VALUES ('etsy-shop', 'ETSY'), ('ebay-shop', 'EBAY')");
    await db.$executeRawUnsafe("INSERT INTO Listing VALUES ('etsy', 'ETSY', 'etsy-shop'), ('ebay', 'EBAY', 'ebay-shop'), ('manual', 'ETSY', NULL), ('mismatch', 'ETSY', 'ebay-shop')");
    const cases = [
      ["etsy-sync", "etsy", "EBAY_SYNC", "ETSY_SYNC"],
      ["etsy-initial", "etsy", "EBAY_SYNC_INITIAL", "ETSY_SYNC_INITIAL"],
      ["ebay-sync", "ebay", "EBAY_SYNC", "EBAY_SYNC"],
      ["ebay-initial", "ebay", "EBAY_SYNC_INITIAL", "EBAY_SYNC_INITIAL"],
      ["manual-etsy", "manual", "EBAY_SYNC", "EBAY_SYNC"],
      ["mismatch", "mismatch", "EBAY_SYNC", "EBAY_SYNC"],
      ["human-edit", "etsy", "user-123", "user-123"],
      ["extension", "etsy", "Chrome Extension", "Chrome Extension"],
      ["correct-etsy", "etsy", "ETSY_SYNC", "ETSY_SYNC"],
    ];
    for (const [id, listing, source] of cases) await db.$executeRawUnsafe("INSERT INTO ListingPriceHistory VALUES (?, ?, 10900, ?, '2026-10-15T14:52:47.040Z')", id, listing, source);
    const migration = await readFile("prisma/migrations/20261102010000_correct_etsy_price_history_sources/migration.sql", "utf8");
    assert.equal(await db.$executeRawUnsafe(migration), 2);
    const rows = await db.$queryRawUnsafe<Array<{ id: string; listingId: string; price: number; changedBy: string; changedAt: string }>>('SELECT * FROM ListingPriceHistory');
    assert.equal(rows.length, cases.length);
    for (const [id, listing, , expected] of cases) {
      const row = rows.find((row) => row.id === id)!;
      assert.equal(row.changedBy, expected, id);
      assert.equal(row.listingId, listing);
      assert.equal(row.price, 10900);
      assert.equal(row.changedAt, "2026-10-15T14:52:47.040Z");
    }
    assert.equal(await db.$executeRawUnsafe(migration), 0, "Repair is safe to run repeatedly");
    console.log("Marketplace price-history source repair tests passed (isolated SQLite).");
  } finally { await db.$disconnect(); await rm(directory, { recursive: true, force: true }); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
