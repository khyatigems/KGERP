import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";
import { ensureMarketplaceFoundationSchema } from "@/lib/marketplace-foundation";
import { prisma } from "@/lib/prisma";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await checkUserPermission(session.user.id, PERMISSIONS.COMMUNICATION_VIEW))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await ensureMarketplaceFoundationSchema();
  const result = await prisma.emailLog.updateMany({
    where: { isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  if (result.count > 0) {
    await logActivity({
      module: "communication",
      action: "email.mark_all_read",
      userId: session.user.id,
      userName: session.user.name ?? undefined,
      metadata: { updated: result.count },
    });
  }
  return NextResponse.json({ success: true, updated: result.count });
}
