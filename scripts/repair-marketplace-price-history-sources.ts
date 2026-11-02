import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { prisma } from "../lib/prisma";

type HistoryRow = { id: string; listingId: string; price: number; changedBy: string; changedAt: string | Date };
const candidatesSql = `SELECT h."id", h."listingId", h."price", h."changedBy", h."changedAt"
  FROM "ListingPriceHistory" h
  JOIN "Listing" l ON l."id" = h."listingId"
  JOIN "MarketplaceShop" s ON s."id" = l."marketplaceShopId"
  WHERE l."platform" = 'ETSY' AND s."marketplace" = 'ETSY'
    AND h."changedBy" IN ('EBAY_SYNC', 'EBAY_SYNC_INITIAL') ORDER BY h."id"`;

async function main() {
  const rows = await prisma.$queryRawUnsafe<HistoryRow[]>(candidatesSql);
  console.log(`Found ${rows.length} Etsy price-history records with legacy eBay sync labels.`);
  if (!rows.length || !process.argv.includes("--apply")) {
    if (rows.length) console.log("Dry run. Use --apply to back up and correct these labels.");
    return;
  }
  const backupDirectory = resolve(process.cwd(), "tmp", "price-history-source-repair");
  await mkdir(backupDirectory, { recursive: true });
  const backupPath = resolve(backupDirectory, `${new Date().toISOString().replaceAll(":", "-")}.json`);
  await writeFile(backupPath, JSON.stringify({ backedUpAt: new Date().toISOString(), rows }, null, 2), { flag: "wx" });
  const migration = await readFile(resolve(process.cwd(), "prisma/migrations/20261102010000_correct_etsy_price_history_sources/migration.sql"), "utf8");
  const changed = await prisma.$transaction(async (tx) => {
    const current = await tx.$queryRawUnsafe<HistoryRow[]>(candidatesSql);
    assert.deepEqual(current, rows, "History changed after backup; rerun the repair.");
    const count = await tx.$executeRawUnsafe(migration);
    assert.equal(count, rows.length, "Unexpected number of corrected source labels.");
    const corrected = await tx.listingPriceHistory.findMany({ where: { id: { in: rows.map((row) => row.id) } }, select: { id: true, listingId: true, price: true, changedBy: true, changedAt: true } });
    const byId = new Map(corrected.map((row) => [row.id, row]));
    for (const old of rows) {
      const updated = byId.get(old.id)!;
      assert.equal(updated.listingId, old.listingId);
      assert.equal(updated.price, old.price);
      assert.equal(updated.changedAt.toISOString(), new Date(old.changedAt).toISOString());
      assert.equal(updated.changedBy, old.changedBy.replace("EBAY_", "ETSY_"));
    }
    return count;
  }, { timeout: 30000 });
  console.log(`Corrected ${changed} source labels. Prices, dates and listing links verified unchanged. Backup: ${backupPath}`);
}
main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
