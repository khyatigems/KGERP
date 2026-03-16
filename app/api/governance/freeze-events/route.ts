import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, PERMISSIONS.SETTINGS_MANAGE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const limitRaw = Number(request.nextUrl.searchParams.get("limit") || 50);
  const limit = Math.min(200, Math.max(1, limitRaw));
  const events = await prisma.activityLog.findMany({
    where: {
      entityType: "Governance",
      actionType: "FREEZE_BLOCKED"
    },
    orderBy: { createdAt: "desc" },
    take: limit
  });
  return NextResponse.json({ events });
}
