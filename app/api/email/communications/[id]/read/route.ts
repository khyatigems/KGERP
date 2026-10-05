import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";
import { ensureMarketplaceFoundationSchema } from "@/lib/marketplace-foundation";
import { prisma } from "@/lib/prisma";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await checkUserPermission(session.user.id, PERMISSIONS.COMMUNICATION_VIEW))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json().catch(() => null) as { isRead?: unknown } | null;
  if (!body || typeof body.isRead !== "boolean") {
    return NextResponse.json({ error: "isRead must be a boolean" }, { status: 400 });
  }
  await ensureMarketplaceFoundationSchema();
  const { id } = await params;
  const updated = await prisma.emailLog.updateMany({
    where: { id },
    data: { isRead: body.isRead, readAt: body.isRead ? new Date() : null },
  });
  if (!updated.count) return NextResponse.json({ error: "Communication not found" }, { status: 404 });
  await logActivity({
    module: "communication",
    action: body.isRead ? "email.mark_read" : "email.mark_unread",
    entityType: "EmailLog",
    entityId: id,
    referenceId: id,
    userId: session.user.id,
    userName: session.user.name ?? undefined,
  });
  return NextResponse.json({ success: true, isRead: body.isRead });
}
