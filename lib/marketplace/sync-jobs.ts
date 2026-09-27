import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { ensureMarketplaceFoundationSchema } from "@/lib/marketplace-foundation";
import { syncListingsForPlatform } from "@/lib/marketplace/sync-listings";
import { syncOrdersForPlatform } from "@/lib/marketplace/sync-orders";

const PAGE_SIZE = 25;
const MAX_ATTEMPTS = 3;
const STALE_AFTER_MS = 2 * 60 * 1000;

export async function enqueueMarketplaceSyncJobs(input: {
  shopIds: string[];
  syncType: "LISTINGS" | "ORDERS";
  requestedById: string;
  requestedBy: string;
}) {
  await ensureMarketplaceFoundationSchema();
  const shopIds = Array.from(new Set(input.shopIds.filter(Boolean)));
  if (!shopIds.length) throw new Error("Select at least one connected marketplace shop.");

  const shops = await prisma.marketplaceShop.findMany({
    where: { id: { in: shopIds }, status: "CONNECTED", connection: { status: "CONNECTED" } },
    select: { id: true },
  });
  if (shops.length !== shopIds.length) throw new Error("One or more selected shops are disconnected.");
  const activeJobs = await prisma.marketplaceSyncJob.findMany({
    where: {
      marketplaceShopId: { in: shopIds },
      syncType: input.syncType,
      status: { in: ["QUEUED", "PROCESSING"] },
    },
    include: { marketplaceShop: { select: { name: true } } },
  });
  if (activeJobs.length) {
    const names = Array.from(new Set(activeJobs.map((job) => job.marketplaceShop.name)));
    throw new Error(`A ${input.syncType.toLowerCase()} sync is already active for: ${names.join(", ")}`);
  }

  const batchId = crypto.randomUUID();
  await prisma.marketplaceSyncJob.createMany({
    data: shops.map((shop) => ({
      marketplaceShopId: shop.id,
      syncType: input.syncType,
      status: "QUEUED",
      progressStep: "Queued",
      progressDetail: "Waiting for the marketplace sync worker",
      requestedById: input.requestedById,
      requestedBy: input.requestedBy,
      batchId,
    })),
  });

  const jobs = await prisma.marketplaceSyncJob.findMany({
    where: { batchId },
    include: { marketplaceShop: { select: { marketplace: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  return { batchId, jobs };
}

async function processOneJob(jobId: string) {
  const now = new Date();
  const claim = await prisma.marketplaceSyncJob.updateMany({
    where: { id: jobId, status: "QUEUED" },
    data: {
      status: "PROCESSING",
      progressStep: "Connecting",
      progressDetail: "Validating shop connection and marketplace token",
      startedAt: now,
    },
  });
  if (!claim.count) return false;

  const job = await prisma.marketplaceSyncJob.findUnique({
    where: { id: jobId },
    include: { marketplaceShop: true },
  });
  if (!job) return false;

  try {
    await prisma.marketplaceSyncJob.update({
      where: { id: job.id },
      data: { progressStep: "Fetching", progressDetail: `Fetching ${job.syncType.toLowerCase()} page` },
    });

    const offset = Math.max(0, Number(job.cursor) || 0);
    const result = job.syncType === "LISTINGS"
      ? await syncListingsForPlatform(job.marketplaceShopId, { limit: PAGE_SIZE, offset })
      : await syncOrdersForPlatform(job.marketplaceShopId, { limit: PAGE_SIZE, offset });

    const nextOffset = offset + result.scanned;
    const hasMore = result.scanned >= PAGE_SIZE;
    const totalFailed = job.recordsFailed + result.failed;
    const pageErrors = result.errors.slice(0, 20).join("\n");
    const errorDetails = [job.errorDetails, pageErrors].filter(Boolean).join("\n").slice(0, 4000) || null;
    await prisma.marketplaceSyncJob.update({
      where: { id: job.id },
      data: {
        status: hasMore ? "QUEUED" : totalFailed > 0 ? "PARTIAL" : "SUCCESS",
        progressStep: hasMore ? "Page saved" : totalFailed > 0 ? "Completed with errors" : "Completed",
        progressDetail: hasMore
          ? `${nextOffset} records processed; next page queued`
          : `${job.recordsScanned + result.scanned} records scanned in total`,
        cursor: hasMore ? String(nextOffset) : job.cursor,
        recordsScanned: { increment: result.scanned },
        recordsCreated: { increment: result.created },
        recordsUpdated: { increment: result.updated },
        recordsSkipped: { increment: result.skipped },
        recordsFailed: { increment: result.failed },
        errorDetails,
        endedAt: hasMore ? null : new Date(),
      },
    });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const attempts = job.attempts + 1;
    const retry = attempts < MAX_ATTEMPTS;
    const errorDetails = [job.errorDetails, message].filter(Boolean).join("\n").slice(0, 4000);
    await prisma.marketplaceSyncJob.update({
      where: { id: job.id },
      data: {
        status: retry ? "QUEUED" : "FAILED",
        progressStep: retry ? "Retry queued" : "Failed",
        progressDetail: message.slice(0, 500),
        errorDetails,
        attempts,
        endedAt: retry ? null : new Date(),
      },
    });
    return false;
  }
}

export async function processQueuedMarketplaceSyncJobs(limit = 5) {
  await ensureMarketplaceFoundationSchema();
  const staleBefore = new Date(Date.now() - STALE_AFTER_MS);
  const staleJobs = await prisma.marketplaceSyncJob.findMany({
    where: { status: "PROCESSING", updatedAt: { lt: staleBefore } },
    select: { id: true, attempts: true, errorDetails: true },
    take: 50,
  });
  let recovered = 0;
  for (const job of staleJobs) {
    const attempts = job.attempts + 1;
    const retry = attempts < MAX_ATTEMPTS;
    const result = await prisma.marketplaceSyncJob.updateMany({
      where: { id: job.id, status: "PROCESSING", updatedAt: { lt: staleBefore } },
      data: {
        status: retry ? "QUEUED" : "FAILED",
        progressStep: retry ? "Recovered" : "Failed",
        progressDetail: retry
          ? "A previous worker stopped before completing this page"
          : "Sync stopped repeatedly before completing a page",
        attempts,
        endedAt: retry ? null : new Date(),
        errorDetails: retry
          ? job.errorDetails
          : [job.errorDetails, "Sync worker timed out repeatedly"].filter(Boolean).join("\n").slice(0, 4000),
      },
    });
    recovered += result.count;
  }
  const queued = await prisma.marketplaceSyncJob.findMany({
    where: { status: "QUEUED" },
    orderBy: { createdAt: "asc" },
    take: Math.max(1, Math.min(limit, 10)),
    select: { id: true },
  });

  let processed = 0;
  for (const job of queued) {
    if (await processOneJob(job.id)) processed += 1;
  }
  return { processed, recovered, considered: queued.length };
}