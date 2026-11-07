import { khyraSavedDialogue } from "@/lib/khyra/live";
import type { Prisma } from "@prisma/client";
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
    const q = (request.nextUrl.searchParams.get("q") || "").trim().slice(0, 200);
    const state = request.nextUrl.searchParams.get("state");
    const severity = request.nextUrl.searchParams.get("severity");
    const category = request.nextUrl.searchParams.get("category");
    const conditions: Prisma.NotificationWhereInput[] = [{ userId }];
    if (q) conditions.push({ OR: [{ title: { contains: q } }, { message: { contains: q } }, { eventKey: { contains: q } }] });
    if (state === "unread") conditions.push({ readAt: null });
    if (state === "acknowledged") conditions.push({ acknowledgedAt: { not: null } });
    if (state === "resolved") conditions.push({ resolvedAt: { not: null } });
    if (state === "attention") conditions.push({ type: { in: ["warning", "error"] }, resolvedAt: null });
    if (severity && ["info", "success", "warning", "error"].includes(severity)) conditions.push({ type: severity });
    if (category && ["marketplace-sync", "report-export", "inventory", "sale", "purchase", "quotation"].includes(category)) conditions.push(category === "sale" ? { OR: [{ eventKey: { startsWith: "sale" } }, { eventKey: { startsWith: "invoice" } }] } : { eventKey: { startsWith: category } });
    if (cursor) conditions.push({ OR: [{ createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: cursor.id } }] });
    const [rows, unreadCount] = await Promise.all([
      prisma.notification.findMany({ where: { AND: conditions }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: cursor ? 0 : offset, take: limit + 1 }),
      prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    const canRetryMarketplaceSync = await checkUserPermission(userId, PERMISSIONS.SETTINGS_MANAGE).catch(() => false);
    const items = rows.slice(0, limit);
    const last = items.at(-1);
    return NextResponse.json({ items: items.map(item => ({ ...item, dialogue: khyraSavedDialogue(item) })), hasMore: rows.length > limit, nextCursor: last ? JSON.stringify({ id: last.id, createdAt: last.createdAt.toISOString() }) : null, unreadCount, canRetryMarketplaceSync });
  } catch {
    return NextResponse.json({ error: "Notifications are temporarily unavailable" }, { status: 503 });
  }
}

export async function handleNotificationsPatch(request: NextRequest, identify: IdentifyUser = auth) {
  const userId = await currentUserId(identify);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { id?: string; ids?: string[]; all?: boolean; action?: string; minutes?: number } | null;
  try {
    await ensureNotificationSchema();
    if (!body || typeof body !== "object" || Array.isArray(body) || (body.all !== undefined && typeof body.all !== "boolean")) return NextResponse.json({ error: "Invalid review request" }, { status: 400 });
    const action = body.action ?? "read";
    if (!["read", "acknowledge", "snooze"].includes(action)) return NextResponse.json({ error: "Unsupported review action" }, { status: 400 });
    const ids = body?.ids;
    if (ids !== undefined && (!Array.isArray(ids) || !ids.length || ids.length > 100 || ids.some(id => typeof id !== "string" || !id || id.length > 100))) return NextResponse.json({ error: "Invalid notification selection" }, { status: 400 });
    if (!body?.all && !ids && (typeof body?.id !== "string" || !body.id || body.id.length > 100)) return NextResponse.json({ error: "A notification id or all=true is required" }, { status: 400 });
    if (body?.all && action !== "read") return NextResponse.json({ error: "Select notifications for this action" }, { status: 400 });
    const now = new Date();
    const where: Prisma.NotificationWhereInput = { userId, ...(body?.all ? {} : { id: ids ? { in: ids } : body!.id }) };
    if (action === "read") {
      await prisma.notification.updateMany({ where: { ...where, readAt: null }, data: { readAt: now } });
    } else if (action === "acknowledge") {
      await prisma.$transaction([
        prisma.notification.updateMany({ where: { ...where, readAt: null }, data: { readAt: now } }),
        prisma.notification.updateMany({ where: { ...where, acknowledgedAt: null }, data: { acknowledgedAt: now } }),
      ]);
    } else {
      if (!Number.isInteger(body?.minutes) || body!.minutes! < 1 || body!.minutes! > 10080) return NextResponse.json({ error: "Snooze must be between 1 minute and 7 days" }, { status: 400 });
      await prisma.notification.updateMany({ where, data: { snoozedUntil: new Date(now.getTime() + body!.minutes! * 60000) } });
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
