import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { retryMarketplaceWrite } from "../../lib/marketplace/database-retry";

async function main() {
  let attempts = 0;
  assert.equal(await retryMarketplaceWrite(async () => {
    if (++attempts < 3) throw new Error("SQLITE_BUSY: database is locked");
    return "saved";
  }), "saved");
  assert.equal(attempts, 3);
  attempts = 0;
  await assert.rejects(retryMarketplaceWrite(async () => {
    attempts++;
    throw new Error("Unique constraint failed");
  }), /Unique constraint/);
  assert.equal(attempts, 1);
  attempts = 0;
  await assert.rejects(retryMarketplaceWrite(async () => {
    attempts++;
    throw new Error("SQLITE_BUSY");
  }), /SQLITE_BUSY/);
  assert.equal(attempts, 5);

  // A retry job cannot inherit the end cursor of a PARTIAL crawl: doing so
  // skips failed rows and reconciles earlier pages against a new timestamp.
  const route = readFileSync("app/api/integrations/marketplace/sync/retry/route.ts", "utf8");
  assert.match(route, /cursor: null/);
  assert.doesNotMatch(route, /cursor: job\.cursor/);
  const sync = readFileSync("lib/marketplace/sync-listings.ts", "utf8");
  assert.doesNotMatch(sync, /existing\?\.status\?\.toUpperCase\(\) === "SOLD"/, "Locally sold listings must still refresh from the active marketplace feed");
  console.log("Marketplace sync retry tests passed.");
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
