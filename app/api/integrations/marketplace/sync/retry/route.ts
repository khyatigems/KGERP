import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { ensureMarketplaceFoundationSchema } from "@/lib/marketplace-foundation";
import { logMarketplaceActivity } from "@/lib/marketplace-control-center";

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
  try {
    await prisma.marketplaceSyncJob.createMany({
      data: retryable.map((job) => ({
        marketplaceShopId: job.marketplaceShopId,
        syncType: job.syncType,
        status: "QUEUED",
        progressStep: "Retry queued",
        progressDetail: `Manual retry from saved cursor ${job.cursor || "0"}`,
        cursor: job.cursor,
        requestedById: session.user.id,
        requestedBy: session.user.name || session.user.email || "Unknown",
        batchId,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Could not queue retry: ${message}` }, { status: 409 });
  }

  const jobs = await prisma.marketplaceSyncJob.findMany({
    where: { batchId },
    include: { marketplaceShop: { select: { marketplace: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  await logMarketplaceActivity({
    entityType: "MarketplaceSyncJob",
    entityId: batchId,
    entityIdentifier: batchId,
    actionType: "SYNC_RETRY_QUEUED",
    details: `Manual retry queued for ${jobs.length} marketplace shop job${jobs.length === 1 ? "" : "s"}`,
    userId: session.user.id,
    userName: session.user.name || session.user.email || "Unknown",
    source: "WEB",
    metadata: { retriedJobIds: retryable.map((job) => job.id), retryJobIds: jobs.map((job) => job.id) },
  });

  return NextResponse.json({ success: true, batchId, jobs }, { status: 202 });
}
