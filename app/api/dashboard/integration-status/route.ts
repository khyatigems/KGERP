import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ensureActivityLogSchema, prisma } from "@/lib/prisma";
import { ensureMarketplaceFoundationSchema } from "@/lib/marketplace-foundation";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { ZohoMailConnector } from "@/lib/email/connectors/zoho";
import { loadZohoOAuthTokens } from "@/lib/email/oauth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await checkUserPermission(session.user.id, PERMISSIONS.LISTINGS_VIEW))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await Promise.all([ensureMarketplaceFoundationSchema(), ensureActivityLogSchema()]);
    const [shops, lastInboxSync, zohoTokens] = await Promise.all([
      prisma.marketplaceShop.findMany({
        orderBy: [{ marketplace: "asc" }, { name: "asc" }],
        select: {
          id: true,
          marketplace: true,
          name: true,
          status: true,
          connection: { select: { status: true } },
          syncJobs: {
            orderBy: [{ startedAt: "desc" }, { createdAt: "desc" }],
            take: 1,
            select: { status: true, createdAt: true, startedAt: true, endedAt: true },
          },
          syncLogs: {
            orderBy: { startedAt: "desc" },
            take: 1,
            select: { status: true, createdAt: true, startedAt: true, endedAt: true },
          },
        },
      }),
      prisma.activityLog.findFirst({
        where: { module: "communication", action: "inbox.sync" },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, metadata: true },
      }),
      loadZohoOAuthTokens(),
    ]);
    const zoho = new ZohoMailConnector();
    let inboxSyncStatus: string | null = null;
    if (lastInboxSync?.metadata) {
      try {
        const result = JSON.parse(lastInboxSync.metadata) as { error?: unknown; failed?: unknown };
        inboxSyncStatus = result.error ? "FAILED" : Number(result.failed) > 0 ? "PARTIAL" : "SUCCESS";
      } catch {
        inboxSyncStatus = null;
      }
    }

    const shopsWithLastSync = shops.map((shop) => {
      const lastJob = shop.syncJobs[0];
      const lastLog = shop.syncLogs[0];
      const jobTimestamp = lastJob?.endedAt ?? lastJob?.startedAt ?? lastJob?.createdAt ?? null;
      const logTimestamp = lastLog?.endedAt ?? lastLog?.startedAt ?? lastLog?.createdAt ?? null;
      const useJob = !logTimestamp || (jobTimestamp && jobTimestamp > logTimestamp);
      const lastSync = useJob ? lastJob : lastLog;
      return {
        id: shop.id,
        marketplace: shop.marketplace,
        name: shop.name,
        connected: shop.status === "CONNECTED" && shop.connection.status === "CONNECTED",
        lastSyncStatus: lastSync?.status ?? null,
        lastSyncAt: useJob ? jobTimestamp : logTimestamp,
      };
    });

    return NextResponse.json(
      {
        shops: shopsWithLastSync,
        zoho: {
          configured: zoho.isConfigured(),
          connected: Boolean(zohoTokens?.accessToken),
          lastSyncAt: lastInboxSync?.createdAt ?? null,
          lastSyncStatus: inboxSyncStatus,
        },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("[dashboard-integration-status] Failed to load integration status:", error);
    return NextResponse.json({ error: "Unable to load integration status" }, { status: 500 });
  }
}
