import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, PERMISSIONS.USERS_MANAGE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { sourceId, targetId } = await req.json().catch(() => ({}));
  if (!sourceId || !targetId || sourceId === targetId) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  try {
    await prisma.$transaction(async (tx) => {
      await tx.sale.updateMany({ where: { customerId: sourceId }, data: { customerId: targetId } });
      await tx.quotation.updateMany({ where: { customerId: sourceId }, data: { customerId: targetId } });
      await tx.creditNote.updateMany({ where: { customerId: sourceId }, data: { customerId: targetId } });

      await tx.activityLog.create({
        data: {
          entityType: "Customer",
          entityId: targetId,
          entityIdentifier: targetId,
          actionType: "MERGE",
          source: "WEB",
          userId: session.user.id,
          userName: session.user.name || session.user.email || "Unknown",
          details: `Merged customer ${sourceId} into ${targetId}`,
          oldData: { sourceId },
          newData: { targetId },
        },
      });
      await tx.customer.delete({ where: { id: sourceId } });
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed to merge" }, { status: 500 });
  }
}

