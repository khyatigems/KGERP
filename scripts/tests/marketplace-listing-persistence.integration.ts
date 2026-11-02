import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { PrismaClient } from "@prisma/client";
import { listingSyncMetadata, readListingDetails } from "@/lib/marketplace/listing-details";
import { priceObservations } from "@/lib/marketplace/price-history";
import { isLiveMarketplaceListing } from "@/lib/marketplace/listing-status";
import type { NormalizedListing } from "@/lib/marketplace/types";

async function main() {
  const directory = await mkdtemp(join(tmpdir(), "marketplace-listing-test-"));
  const db = new PrismaClient({ datasources: { db: { url: `file:${join(directory, "test.db").replaceAll("\\", "/")}` } } });
  try {
    await db.$executeRawUnsafe(`CREATE TABLE Listing (
      id TEXT PRIMARY KEY, inventoryId TEXT, platform TEXT NOT NULL, externalId TEXT, listedPrice REAL NOT NULL, currency TEXT NOT NULL DEFAULT 'USD', status TEXT NOT NULL DEFAULT 'ACTIVE',
      listedDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL,
      listingUrl TEXT, listingRef TEXT, listingSku TEXT, marketplaceTitle TEXT, marketplacePrice REAL, marketplaceQuantity INTEGER, marketplaceViews INTEGER, marketplaceFavorites INTEGER, marketplaceOrders INTEGER,
      marketplaceShopName TEXT, marketplaceShopId TEXT, syncStatus TEXT, syncError TEXT, lastSyncedAt DATETIME, rawMetadata TEXT)`);
    await db.$executeRawUnsafe(`CREATE TABLE ListingPriceHistory (id TEXT PRIMARY KEY, listingId TEXT NOT NULL REFERENCES Listing(id), price REAL NOT NULL, changedBy TEXT NOT NULL, changedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    const migration = await readFile("prisma/migrations/20261102000000_listing_price_history_currency/migration.sql", "utf8");
    await db.$executeRawUnsafe(migration.trim());
    let listing: NormalizedListing = { marketplace: "ETSY", listingId: "123", listingSku: "SKU-1", title: "Ruby", description: null, price: 100, currency: "EUR", quantity: 1, status: "ACTIVE", listingUrl: "https://example.com/123", category: "Ruby", images: ["https://example.com/photo.jpg"], attributes: {}, views: 12, favorites: 3, raw: {} };
    let finished: unknown;
    const dependencies: Record<string, unknown> = {
      "@/lib/prisma": { prisma: { listing: db.listing, marketplaceShop: { findUnique: async () => ({ id: "shop", marketplace: "ETSY", status: "CONNECTED", connectionId: "connection", externalShopId: "external-shop", name: "Test shop", connection: { status: "CONNECTED" } }) } } },
      "@/lib/marketplace/connectors": { getConnector: () => ({ fetchListings: async () => [listing] }) },
      "@/lib/marketplace/sku-matching": { matchListingToInventory: async () => ({ status: "UNKNOWN_SKU", reason: "Unmapped" }) },
      "@/lib/marketplace/sync-log": { startSyncLog: async () => "log", finalizeSyncLog: async (_id: string, result: unknown) => { finished = result; }, failSyncLog: async () => {} },
      "@/lib/marketplace/listing-status": { isLiveMarketplaceListing },
      "@/lib/marketplace/close-listings": { markMarketplaceListingsSold: async () => {} },
      "@/lib/marketplace/listing-details": { listingSyncMetadata },
      "@/lib/marketplace/price-history": { priceObservations },
      "@/lib/marketplace-foundation": { ensureMarketplaceFoundationSchema: async () => {} },
    };
    const source = ts.transpileModule(await readFile("lib/marketplace/sync-listings.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const exports: { syncListingsForPlatform?: (shop: string) => Promise<{ created: number; updated: number; failed: number }> } = {};
    vm.runInNewContext(source, { exports, Date, console, require: (name: string) => { assert.ok(name in dependencies, name); return dependencies[name]; } });
    const sync = () => exports.syncListingsForPlatform!("shop");
    assert.equal((await sync()).created, 1);
    const row = await db.listing.findFirstOrThrow();
    assert.equal((await db.listingPriceHistory.findMany())[0].currency, "EUR");
    assert.equal((await sync()).updated, 1);
    assert.equal(await db.listingPriceHistory.count(), 1, "Repeated sync is idempotent");
    // Simulate a legacy row with no baseline, then a marketplace price drop.
    await db.listingPriceHistory.deleteMany();
    listing = { ...listing, price: 80, views: 0, favorites: 0 };
    assert.equal((await sync()).updated, 1);
    const history = await db.listingPriceHistory.findMany({ orderBy: { changedAt: "asc" } });
    assert.deepEqual(history.map((entry) => entry.price), [100, 80]);
    assert.deepEqual(history.map((entry) => entry.currency), ["EUR", "EUR"]);
    assert.equal(history[1].changedBy, "ETSY_SYNC");
    const zeroMetrics = await db.listing.findUniqueOrThrow({ where: { id: row.id } });
    assert.equal(zeroMetrics.marketplaceViews, 0); assert.equal(zeroMetrics.marketplaceFavorites, 0);
    listing = { ...listing, price: null, images: [], views: null, favorites: null };
    await sync();
    const sparse = await db.listing.findUniqueOrThrow({ where: { id: row.id } });
    assert.equal(sparse.marketplacePrice, 80); assert.equal(sparse.listedPrice, 80);
    assert.equal(sparse.marketplaceViews, 0);
    assert.equal(readListingDetails(sparse.rawMetadata).images[0], "https://example.com/photo.jpg");
    assert.equal(await db.listingPriceHistory.count(), 2);
    // A failed history insert must roll back the listing update as well.
    await db.$executeRawUnsafe("CREATE TRIGGER fail_history BEFORE INSERT ON ListingPriceHistory BEGIN SELECT RAISE(ABORT, 'test history failure'); END");
    listing = { ...listing, price: 70 };
    const originalError = console.error; console.error = () => {};
    let result;
    try { result = await sync(); } finally { console.error = originalError; }
    assert.equal(result.failed, 1);
    assert.equal((await db.listing.findUniqueOrThrow({ where: { id: row.id } })).marketplacePrice, 80);
    assert.equal(await db.listingPriceHistory.count(), 2);
    assert.ok(finished);
    await db.$executeRawUnsafe("DROP TRIGGER fail_history");
    await db.listingPriceHistory.deleteMany();
    await db.listing.update({ where: { id: row.id }, data: { marketplacePrice: null } });
    assert.equal((await sync()).updated, 1);
    assert.deepEqual((await db.listingPriceHistory.findMany({ orderBy: { changedAt: "asc" } })).map((entry) => entry.price), [80, 70], "Legacy imported listings retain listedPrice as their baseline");
    console.log("Marketplace listing persistence integration tests passed (isolated SQLite).");
  } finally { await db.$disconnect(); await rm(directory, { recursive: true, force: true }); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
