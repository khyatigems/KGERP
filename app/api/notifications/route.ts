import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { backfillRecentActivityNotifications, ensureNotificationSchema } from "@/lib/notifications";

export const dynamic = "force-dynamic";

type SessionIdentity = { user?: { id?: string } } | null;
type IdentifyUser = () => Promise<SessionIdentity>;

async function currentUserId(identify: IdentifyUser) {
  const session = await identify();
  return session?.user?.id || null;
}

export async function handleNotificationsGet(request: NextRequest, identify: IdentifyUser = auth) {
  const userId = await currentUserId(identify);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limit = Math.min(50, Math.max(1, Math.floor(Number(request.nextUrl.searchParams.get("limit")) || 20)));
  const offset = Math.min(500, Math.max(0, Math.floor(Number(request.nextUrl.searchParams.get("offset")) || 0)));
  const rawCursor = request.nextUrl.searchParams.get("cursor");
  let cursor: { id: string; createdAt: Date } | null = null;
  if (rawCursor) {
    try {
      if (rawCursor.length > 300) throw new Error();
      const parsed = JSON.parse(rawCursor);
      if (typeof parsed.id !== "string" || !parsed.id || parsed.id.length > 100 || typeof parsed.createdAt !== "string" || !Number.isFinite(Date.parse(parsed.createdAt))) throw new Error();
      cursor = { id: parsed.id, createdAt: new Date(parsed.createdAt) };
    } catch { return NextResponse.json({ error: "Invalid notification cursor" }, { status: 400 }); }
  }
  try {
    await ensureNotificationSchema();
    await backfillRecentActivityNotifications(userId);
    const [rows, unreadCount] = await Promise.all([
      prisma.notification.findMany({ where: { userId, ...(cursor ? { OR: [{ createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: cursor.id } }] } : {}) }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: cursor ? 0 : offset, take: limit + 1 }),
      prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    const canRetryMarketplaceSync = await checkUserPermission(userId, PERMISSIONS.SETTINGS_MANAGE).catch(() => false);
    const items = rows.slice(0, limit);
    const last = items.at(-1);
    return NextResponse.json({ items, hasMore: rows.length > limit, nextCursor: last ? JSON.stringify({ id: last.id, createdAt: last.createdAt.toISOString() }) : null, unreadCount, canRetryMarketplaceSync });
  } catch {
    return NextResponse.json({ error: "Notifications are temporarily unavailable" }, { status: 503 });
  }
}

export async function handleNotificationsPatch(request: NextRequest, identify: IdentifyUser = auth) {
  const userId = await currentUserId(identify);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { id?: string; all?: boolean } | null;
  try {
    await ensureNotificationSchema();
    if (body?.all === true) {
      await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
    } else if (typeof body?.id === "string" && body.id.length < 100) {
      await prisma.notification.updateMany({ where: { id: body.id, userId, readAt: null }, data: { readAt: new Date() } });
    } else {
      return NextResponse.json({ error: "A notification id or all=true is required" }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Could not update notification state" }, { status: 503 });
  }
}

export async function GET(request: NextRequest) {
  return handleNotificationsGet(request);
}

export async function PATCH(request: NextRequest) {
  return handleNotificationsPatch(request);
}
