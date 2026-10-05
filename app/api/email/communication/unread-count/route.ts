import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ensureMarketplaceFoundationSchema } from "@/lib/marketplace-foundation";
import { prisma } from "@/lib/prisma";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await checkUserPermission(session.user.id, PERMISSIONS.COMMUNICATION_VIEW))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await ensureMarketplaceFoundationSchema();
  const unread = await prisma.emailLog.count({ where: { isRead: false } });
  return NextResponse.json({ unread }, { headers: { "Cache-Control": "private, no-store" } });
}
