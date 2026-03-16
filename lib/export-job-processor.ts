import { prisma } from "@/lib/prisma";
import { getCapitalRotationAnalyticsUncached, getInventoryAgingAnalytics, getReportsAnalyticsSummaryUncached } from "@/lib/reports-analytics";
import { randomUUID } from "crypto";

const EXPORT_WORKER_LOCK_ID = "REPORT_EXPORT_PROCESSOR";
const LEASE_MS = 90_000;
const PROCESSING_STALE_MS = 10 * 60_000;
const ALLOWED_EXPORT_REPORT_TYPES = new Set([
  "inventory",
  "sales",
  "financial",
  "vendor",
  "operations",
  "inventory-aging",
  "capital-rotation"
]);

function parseFilters(filtersJson: string | null) {
  if (!filtersJson) return {};
  try {
    return JSON.parse(filtersJson) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function ensureJobDataIsGeneratable(job: {
  reportType: string;
  filtersJson: string | null;
}) {
  const filters = parseFilters(job.filtersJson);
  switch (job.reportType) {
    case "inventory-aging":
      await getInventoryAgingAnalytics({
        bucket: typeof filters.bucket === "string" ? filters.bucket : undefined,
        category: typeof filters.category === "string" ? filters.category : undefined,
        vendor: typeof filters.vendor === "string" ? filters.vendor : undefined,
        status: typeof filters.status === "string" ? filters.status : "IN_STOCK",
        page: 1,
        pageSize: 100,
      });
      return;
    case "capital-rotation":
      await getCapitalRotationAnalyticsUncached();
      return;
    default:
      await getReportsAnalyticsSummaryUncached();
  }
}

async function processSingleJob(jobId: string) {
  const claimed = await prisma.reportExportJob.updateMany({
    where: { id: jobId, status: "QUEUED" },
    data: { status: "PROCESSING", errorMessage: null }
  });
  if (claimed.count === 0) return false;

  const job = await prisma.reportExportJob.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      reportType: true,
      format: true,
      filtersJson: true
    }
  });
  if (!job) return false;

  try {
    await ensureJobDataIsGeneratable(job);
    await prisma.reportExportJob.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        downloadUrl: `/api/reports/export-jobs/${job.id}/download`,
        errorMessage: null
      }
    });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown export error";
    const trace = error instanceof Error && error.stack ? `\n${error.stack.slice(0, 1000)}` : "";
    console.error(`[export-job:${job.id}] Failed (${job.reportType}/${job.format})`, message, trace);
    await prisma.reportExportJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        errorMessage: `${message}`.slice(0, 500),
      }
    });
    return false;
  }
}

function leaseExpiry(now: Date) {
  return new Date(now.getTime() + LEASE_MS);
}

async function acquireExportWorkerLock(ownerId: string) {
  const now = new Date();
  const expiresAt = leaseExpiry(now);

  try {
    await prisma.workerLockHeartbeat.create({
      data: {
        id: EXPORT_WORKER_LOCK_ID,
        ownerId,
        leaseUntil: expiresAt,
        heartbeatAt: now
      }
    });
    return true;
  } catch {
    const updated = await prisma.workerLockHeartbeat.updateMany({
      where: {
        id: EXPORT_WORKER_LOCK_ID,
        leaseUntil: { lt: now }
      },
      data: {
        ownerId,
        leaseUntil: expiresAt,
        heartbeatAt: now
      }
    });
    return updated.count > 0;
  }
}

async function refreshExportWorkerLock(ownerId: string) {
  const now = new Date();
  const updated = await prisma.workerLockHeartbeat.updateMany({
    where: {
      id: EXPORT_WORKER_LOCK_ID,
      ownerId
    },
    data: {
      leaseUntil: leaseExpiry(now),
      heartbeatAt: now
    }
  });
  return updated.count > 0;
}

async function releaseExportWorkerLock(ownerId: string) {
  await prisma.workerLockHeartbeat.deleteMany({
    where: {
      id: EXPORT_WORKER_LOCK_ID,
      ownerId
    }
  });
}

async function recoverStaleProcessingJobs() {
  const staleBefore = new Date(Date.now() - PROCESSING_STALE_MS);
  const recovered = await prisma.reportExportJob.updateMany({
    where: {
      status: "PROCESSING",
      updatedAt: { lt: staleBefore }
    },
    data: {
      status: "QUEUED",
      errorMessage: "Recovered stale PROCESSING job and re-queued automatically"
    }
  });
  return recovered.count;
}

export async function processQueuedExportJobs(limit = 5) {
  const ownerId = randomUUID();
  const acquired = await acquireExportWorkerLock(ownerId);
  if (!acquired) {
    return { processed: 0, completed: 0, failed: 0, skippedByLock: true };
  }

  const staleRecovered = await recoverStaleProcessingJobs();
  const queued = await prisma.reportExportJob.findMany({
    where: { status: "QUEUED" },
    orderBy: { createdAt: "asc" },
    take: Math.max(1, Math.min(limit, 20)),
    select: { id: true }
  });

  let processed = 0;
  let completed = 0;
  let failed = 0;

  try {
    for (const job of queued) {
      const lockAlive = await refreshExportWorkerLock(ownerId);
      if (!lockAlive) {
        break;
      }
      processed += 1;
      const ok = await processSingleJob(job.id);
      if (ok) completed += 1;
      else failed += 1;
    }
    return { processed, completed, failed, staleRecovered, skippedByLock: false };
  } finally {
    await releaseExportWorkerLock(ownerId);
  }
}

export function isAllowedExportReportType(reportType: string) {
  return ALLOWED_EXPORT_REPORT_TYPES.has(reportType);
}
