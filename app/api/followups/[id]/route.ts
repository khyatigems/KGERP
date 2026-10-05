import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";
import { ensureFollowUpSchema, prisma } from "@/lib/prisma";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";

const ACTIONS = ["COMPLETE", "RESCHEDULE", "CANCEL", "ADD_NOTE"] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await checkUserPermission(session.user.id, PERMISSIONS.RECEIVABLES_MANAGE))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "A valid follow-up action is required" }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  if (!ACTIONS.includes(input.action as typeof ACTIONS[number])) {
    return NextResponse.json({ error: "Unsupported follow-up action" }, { status: 400 });
  }

  await ensureFollowUpSchema();
  const { id } = await params;
  const followUp = await prisma.followUp.findUnique({ where: { id } });
  if (!followUp) return NextResponse.json({ error: "Follow-up not found" }, { status: 404 });
  if (followUp.status !== "OPEN") {
    return NextResponse.json({ error: "Only open follow-ups can be changed" }, { status: 409 });
  }

  const now = new Date();
  let newFollowUpId: string | null = null;
  try {
    if (input.action === "COMPLETE") {
      await prisma.followUp.update({
        where: { id },
        data: { status: "COMPLETED", completedAt: now },
      });
    } else if (input.action === "CANCEL") {
      await prisma.followUp.update({
        where: { id },
        data: { status: "CANCELLED", cancelledAt: now },
      });
    } else if (input.action === "ADD_NOTE") {
      const note = typeof input.note === "string" ? input.note.trim() : "";
      if (!note) return NextResponse.json({ error: "Enter a note" }, { status: 400 });
      if (note.length > 5000) return NextResponse.json({ error: "Note is too long" }, { status: 413 });
      await prisma.followUp.update({
        where: { id },
        data: { note: [followUp.note, note].filter(Boolean).join("\n") },
      });
    } else {
      if (typeof input.scheduledAt !== "string") {
        return NextResponse.json({ error: "Choose a new follow-up date and time" }, { status: 400 });
      }
      const scheduledAt = new Date(input.scheduledAt);
      if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= now.getTime()) {
        return NextResponse.json({ error: "Reschedule time must be in the future" }, { status: 400 });
      }
      const created = await prisma.$transaction(async (transaction) => {
        await transaction.followUp.update({
          where: { id },
          data: { status: "RESCHEDULED", rescheduledTo: scheduledAt },
        });
        return transaction.followUp.create({
          data: {
            id: crypto.randomUUID(),
            invoiceId: followUp.invoiceId,
            date: scheduledAt,
            channel: followUp.channel,
            action: followUp.action,
            note: typeof input.note === "string" && input.note.trim()
              ? input.note.trim().slice(0, 5000)
              : followUp.note,
            promisedDate: followUp.promisedDate,
            status: "OPEN",
            createdById: session.user.id,
          },
        });
      });
      newFollowUpId = created.id;
    }
  } catch (error) {
    console.error("[follow-up] Failed to apply follow-up action:", error);
    return NextResponse.json({ error: "Could not update follow-up" }, { status: 500 });
  }

  await logActivity({
    module: "communication",
    action: `followup.${String(input.action).toLowerCase()}`,
    entityType: "FollowUp",
    entityId: id,
    referenceId: followUp.invoiceId,
    userId: session.user.id,
    userName: session.user.name ?? undefined,
    metadata: {
      previousStatus: followUp.status,
      newStatus: input.action === "COMPLETE" ? "COMPLETED"
        : input.action === "CANCEL" ? "CANCELLED"
          : input.action === "RESCHEDULE" ? "RESCHEDULED" : "OPEN",
      newFollowUpId,
    },
  });
  return NextResponse.json({ success: true, newFollowUpId });
}
