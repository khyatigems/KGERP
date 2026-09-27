import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getFeatureFlag, FEATURE_FLAG_KEYS } from "@/lib/marketplace/feature-flags";
import { enqueueMarketplaceSyncJobs } from "@/lib/marketplace/sync-jobs";
import { logMarketplaceActivity } from "@/lib/marketplace-control-center";

export const dynamic = "force-dynamic";

async function authorize() {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const allowed = await checkUserPermission(session.user.id, PERMISSIONS.SETTINGS_MANAGE);
  if (!allowed) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { session };
}

export async function GET(request: NextRequest) {
  const authz = await authorize();
  if (authz.error) return authz.error;
  const ids = (request.nextUrl.searchParams.get("ids") || "").split(",").filter(Boolean).slice(0, 100);
  const batchId = request.nextUrl.searchParams.get("batchId");
  if (!ids.length && !batchId) return NextResponse.json({ error: "ids or batchId is required" }, { status: 400 });
  const jobs = await prisma.marketplaceSyncJob.findMany({
    where: ids.length ? { id: { in: ids } } : { batchId: batchId! },
    include: { marketplaceShop: { select: { marketplace: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ jobs });
}

export async function POST(request: NextRequest) {
  const authz = await authorize();
  if (authz.error) return authz.error;
  const session = authz.session;

  const master = await getFeatureFlag(FEATURE_FLAG_KEYS.marketplaceApiSync);
  if (!master) {
    return NextResponse.json({ error: "Marketplace API sync is disabled" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const syncType = String(body?.syncType || "LISTINGS").toUpperCase();
  if (syncType !== "LISTINGS" && syncType !== "ORDERS") {
    return NextResponse.json({ error: "syncType must be LISTINGS or ORDERS" }, { status: 400 });
  }
  try {
    const shopIds = Array.isArray(body?.shopIds)
      ? body.shopIds.map(String)
      : body?.shopId ? [String(body.shopId)] : [];
    if (!shopIds.length) return NextResponse.json({ error: "shopId or shopIds is required" }, { status: 400 });
    const shops = await prisma.marketplaceShop.findMany({
      where: { id: { in: shopIds } },
      select: { id: true, marketplace: true },
    });
    if (shops.length !== new Set(shopIds).size) return NextResponse.json({ error: "Unknown marketplace shop" }, { status: 404 });
    for (const shop of shops) {
      const flag = shop.marketplace === "EBAY" ? FEATURE_FLAG_KEYS.ebaySync : FEATURE_FLAG_KEYS.etsySync;
      if (!(await getFeatureFlag(flag))) {
        return NextResponse.json({ error: `${shop.marketplace} sync is disabled` }, { status: 403 });
      }
    }

    const result = await enqueueMarketplaceSyncJobs({
      shopIds,
      syncType: syncType as "LISTINGS" | "ORDERS",
      requestedById: session.user.id,
      requestedBy: session.user.name || session.user.email || "Unknown",
    });
    await logMarketplaceActivity({
      entityType: "MarketplaceSyncJob",
      entityId: result.batchId,
      entityIdentifier: result.batchId,
      actionType: "SYNC_QUEUED",
      details: `${syncType.toLowerCase()} sync queued for ${result.jobs.length} shop${result.jobs.length === 1 ? "" : "s"}`,
      userId: session.user.id,
      userName: session.user.name || session.user.email || "Unknown",
      source: "WEB",
      metadata: { syncType, shopIds, jobIds: result.jobs.map((job) => job.id) },
    });
    return NextResponse.json({ success: true, ...result }, { status: 202 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
