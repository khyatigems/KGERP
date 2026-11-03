import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { ensureWorkerLockHeartbeatSchema } from "@/lib/report-export-job-schema";
import { retryMarketplaceWrite } from "@/lib/marketplace/database-retry";

// Longer than either sync route's 60-second execution limit. A terminated
// request leaves an expiring lease, rather than allowing overlapping workers.
const LEASE_MS = 5 * 60 * 1000;
export async function withMarketplaceWorkerLease<T>(work: () => Promise<T>): Promise<T | null> {
  await ensureWorkerLockHeartbeatSchema();
  const id = "marketplace-sync-worker";
  const ownerId = crypto.randomUUID();
  const now = new Date();
  const data = { ownerId, heartbeatAt: now, leaseUntil: new Date(now.getTime() + LEASE_MS) };
  let acquired = false;
  try {
    await retryMarketplaceWrite(() => prisma.workerLockHeartbeat.create({ data: { id, ...data } }));
    acquired = true;
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === "P2002")) throw error;
    const claimed = await retryMarketplaceWrite(() => prisma.workerLockHeartbeat.updateMany({
      where: { id, leaseUntil: { lt: now } }, data,
    }));
    acquired = claimed.count === 1;
  }
  if (!acquired) return null;
  try {
    return await work();
  } finally {
    await retryMarketplaceWrite(() => prisma.workerLockHeartbeat.deleteMany({ where: { id, ownerId } }));
  }
}
