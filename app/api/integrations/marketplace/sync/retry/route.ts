import { marketplaceSyncAudit } from "@/lib/marketplace/activity-display";
import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { ensureMarketplaceFoundationSchema } from "@/lib/marketplace-foundation";
import { logMarketplaceActivity } from "@/lib/marketplace-control-center";
import { retryMarketplaceWrite } from "@/lib/marketplace/database-retry";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await checkUserPermission(session.user.id, PERMISSIONS.SETTINGS_MANAGE);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const requestedIds: string[] = Array.isArray(body?.jobIds)
    ? Array.from(new Set<string>(body.jobIds.map((id: unknown) => String(id)).filter((id: string) => Boolean(id)))).slice(0, 100)
    : [];
  if (!requestedIds.length) return NextResponse.json({ error: "jobIds is required" }, { status: 400 });

  await ensureMarketplaceFoundationSchema();
  const failedJobs = await prisma.marketplaceSyncJob.findMany({
    where: { id: { in: requestedIds }, status: { in: ["FAILED", "PARTIAL"] } },
    select: { id: true, marketplaceShopId: true, syncType: true, cursor: true },
  });
  if (!failedJobs.length) return NextResponse.json({ error: "No failed or partial jobs were selected" }, { status: 400 });

  const shops = await prisma.marketplaceShop.findMany({
    where: {
      id: { in: failedJobs.map((job) => job.marketplaceShopId) },
      status: "CONNECTED",
      connection: { status: "CONNECTED" },
    },
    select: { id: true },
  });
  const connectedIds = new Set(shops.map((shop) => shop.id));
  const retryable = failedJobs.filter((job) => connectedIds.has(job.marketplaceShopId));
  if (!retryable.length) {
    return NextResponse.json({ error: "The failed shops are disconnected. Reconnect them before retrying." }, { status: 409 });
  }

  const batchId = crypto.randomUUID();
  const activeJobs = await prisma.marketplaceSyncJob.findMany({
    where: { marketplaceShopId: { in: retryable.map(job => job.marketplaceShopId) }, status: { in: ["QUEUED", "PROCESSING"] } },
    select: { marketplaceShopId: true, syncType: true },
  });
  if (retryable.some(job => activeJobs.some(active => active.marketplaceShopId === job.marketplaceShopId && active.syncType === job.syncType))) {
    return NextResponse.json({ error: "A sync is already active for one of these shops. Wait for it to finish before retrying." }, { status: 409 });
  }
  const uniqueRetries = [...new Map(retryable.map(job => [`${job.marketplaceShopId}:${job.syncType}`, job])).values()];
  try {
    await retryMarketplaceWrite(() => prisma.marketplaceSyncJob.createMany({
      data: uniqueRetries.map((job) => ({
        marketplaceShopId: job.marketplaceShopId,
        syncType: job.syncType,
        status: "QUEUED",
        progressStep: "Retry queued",
        // A new job has a new reconciliation cutoff and no previous counters.
        // Crawl from zero so earlier pages are refreshed and failed rows retried.
        progressDetail: "Manual retry from the first page",
        cursor: null,
        requestedById: session.user.id,
        requestedBy: session.user.name || session.user.email || "Unknown",
        batchId,
      })),
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Could not queue retry: ${message}` }, { status: 409 });
  }

  const jobs = await prisma.marketplaceSyncJob.findMany({
    where: { batchId },
    include: { marketplaceShop: { select: { marketplace: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  const audit = marketplaceSyncAudit(jobs, true);
  await logMarketplaceActivity({
    entityType: "MarketplaceSyncJob",
    entityId: batchId,
    entityIdentifier: audit.entityIdentifier,
    actionType: "SYNC_RETRY_QUEUED",
    details: audit.details,
    userId: session.user.id,
    userName: session.user.name || session.user.email || "Unknown",
    source: "WEB",
    metadata: { ...audit.metadata, retriedJobIds: retryable.map((job) => job.id), retryJobIds: jobs.map((job) => job.id) },
  });

  return NextResponse.json({ success: true, batchId, jobs }, { status: 202 });
}
