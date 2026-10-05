import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";
import { performManualEmailAction, type ManualEmailAction } from "@/lib/email/queue";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const ACTIONS: ManualEmailAction[] = ["RETRY", "SEND_NOW", "CANCEL"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await checkUserPermission(session.user.id, PERMISSIONS.COMMUNICATION_MANAGE);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null) as { action?: string } | null;
  if (!body || !ACTIONS.includes(body.action as ManualEmailAction)) {
    return NextResponse.json({ error: "A valid communication action is required" }, { status: 400 });
  }
  const { id } = await params;
  const before = await prisma.emailLog.findUnique({
    where: { id },
    select: { status: true },
  });
  const result = await performManualEmailAction(id, body.action as ManualEmailAction);
  if (result.success && before) {
    const after = await prisma.emailLog.findUnique({
      where: { id },
      select: { status: true },
    });
    await logActivity({
      module: "communication",
      action: `email.${String(body.action).toLowerCase()}`,
      entityType: "EmailLog",
      entityId: id,
      referenceId: id,
      userId: session.user.id,
      userName: session.user.name ?? undefined,
      metadata: {
        previousStatus: before.status,
        newStatus: after?.status ?? null,
      },
    });
  }
  return NextResponse.json(result, { status: result.success ? 200 : 409 });
}
