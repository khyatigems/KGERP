import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { PrismaClient } from "@prisma/client";
import { retryMarketplaceWrite } from "../../lib/marketplace/database-retry";

type Lease = <T>(work: () => Promise<T>) => Promise<T | null>;
async function load<T>(file: string, dependencies: Record<string, unknown>): Promise<T> {
  const source = ts.transpileModule(await readFile(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, Date, console, require: (name: string) => {
    assert.ok(name in dependencies, name);
    return dependencies[name];
  } });
  return exports as T;
}

async function main() {
  const directory = await mkdtemp(join(tmpdir(), "marketplace-worker-"));
  const options = { datasources: { db: { url: `file:${join(directory, "test.db").replaceAll("\\", "/")}` } } };
  const db = new PrismaClient(options);
  const other = new PrismaClient(options);
  try {
    await db.$executeRawUnsafe(`CREATE TABLE WorkerLockHeartbeat (id TEXT PRIMARY KEY, ownerId TEXT NOT NULL, leaseUntil DATETIME NOT NULL, heartbeatAt DATETIME NOT NULL, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL)`);
    const crypto = await import("node:crypto");
    const lease = async (client: PrismaClient) => (await load<{ withMarketplaceWorkerLease: Lease }>("lib/marketplace/worker-lease.ts", {
      "node:crypto": crypto,
      "@/lib/prisma": { prisma: client },
      "@/lib/report-export-job-schema": { ensureWorkerLockHeartbeatSchema: async () => {} },
      "@/lib/marketplace/database-retry": { retryMarketplaceWrite },
    })).withMarketplaceWorkerLease;
    const first = await lease(db), second = await lease(other);
    await first(async () => {
      let ran = false;
      assert.equal(await second(async () => { ran = true; }), null);
      assert.equal(ran, false, "A different database connection cannot start an overlapping worker");
    });
    assert.equal(await second(async () => "released"), "released");
    await assert.rejects(first(async () => { throw new Error("worker failed"); }), /worker failed/);
    assert.equal(await second(async () => "recovered"), "recovered", "Exceptions release the lease");
    await db.workerLockHeartbeat.create({ data: { id: "marketplace-sync-worker", ownerId: "dead-worker", heartbeatAt: new Date(0), leaseUntil: new Date(0) } });
    assert.equal(await second(async () => "expired lease recovered"), "expired lease recovered");

    let job: Record<string, unknown>;
    let closed = 0, fetched = 0;
    let busy = true;
    const jobs = await load<{ processQueuedMarketplaceSyncJobs: (limit: number) => Promise<unknown> }>("lib/marketplace/sync-jobs.ts", {
      "node:crypto": crypto,
      "@/lib/prisma": { prisma: { marketplaceSyncJob: {
        findMany: async (args: { where: { status: string } }) => args.where.status === "PROCESSING" ? [] : [{ id: job.id }],
        findUnique: async () => ({ ...job }),
        updateMany: async ({ data }: { data: Record<string, unknown> }) => { Object.assign(job, data); return { count: 1 }; },
        update: async ({ data }: { data: Record<string, unknown> }) => {
          for (const [key, value] of Object.entries(data)) {
            if (value && typeof value === "object" && "increment" in value) job[key] = Number(job[key]) + Number(value.increment);
            else job[key] = value;
          }
          return job;
        },
      } } },
      "@/lib/marketplace-foundation": { ensureMarketplaceFoundationSchema: async () => {} },
      "@/lib/marketplace/sync-listings": { syncListingsForPlatform: async () => {
        fetched++;
        if (busy) throw new Error("SQLITE_BUSY: database is locked");
        return { scanned: 1, updated: 1, created: 0, skipped: 0, failed: 0, errors: [] };
      } },
      "@/lib/marketplace/sync-orders": {},
      "@/lib/marketplace/close-listings": { closeListingsMissingFromActiveSync: async () => { closed++; return 0; } },
      "@/lib/notifications": {},
      "@/lib/notification-routing": { routeNotification: () => "none" },
      "@/lib/marketplace/worker-lease": { withMarketplaceWorkerLease: first },
      "@/lib/marketplace/database-retry": { retryMarketplaceWrite },
    });
    const fresh = () => ({ id: "job", marketplaceShopId: "shop", marketplaceShop: { name: "Test", marketplace: "ETSY" }, syncType: "LISTINGS", status: "QUEUED", cursor: null, recordsScanned: 0, recordsFailed: 0, recordsUpdated: 0, recordsCreated: 0, recordsSkipped: 0, attempts: 0, createdAt: new Date() });
    job = fresh();
    await jobs.processQueuedMarketplaceSyncJobs(1);
    assert.equal(job.status, "QUEUED");
    assert.equal(job.cursor, null);
    assert.equal(job.recordsScanned, 0);
    assert.equal(closed, 0, "A locked page cannot reconcile missing listings");
    busy = false;
    await jobs.processQueuedMarketplaceSyncJobs(1);
    assert.equal(job.status, "SUCCESS");
    assert.equal(job.recordsScanned, 1);
    assert.equal(closed, 1);
    job = { ...fresh(), cursor: "100" };
    const previousFetched = fetched;
    await jobs.processQueuedMarketplaceSyncJobs(1);
    assert.equal(fetched, previousFetched, "An inherited cursor without earlier progress cannot run");
    assert.equal(closed, 1, "An incomplete crawl cannot hide earlier listings");
    console.log("Marketplace worker integration tests passed (isolated SQLite).");
  } finally {
    await Promise.all([db.$disconnect(), other.$disconnect()]);
    await rm(directory, { recursive: true, force: true });
  }
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
