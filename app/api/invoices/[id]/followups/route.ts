import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";
import { ensureFollowUpSchema, prisma } from "@/lib/prisma";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";

const CHANNELS = ["CALL", "EMAIL", "WHATSAPP"] as const;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await checkUserPermission(session.user.id, PERMISSIONS.RECEIVABLES_VIEW))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await ensureFollowUpSchema();
  const { id } = await params;
  const items = await prisma.followUp.findMany({
    where: { invoiceId: id },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: { createdBy: { select: { name: true } } },
  });
  return NextResponse.json({
    items: items.map((item) => ({
      id: item.id,
      date: item.date,
      channel: item.channel,
      action: item.action,
      note: item.note,
      promisedDate: item.promisedDate,
      status: item.status,
      completedAt: item.completedAt,
      cancelledAt: item.cancelledAt,
      rescheduledTo: item.rescheduledTo,
      createdBy: item.createdBy?.name ?? null,
    })),
  });
}

export async function POST(
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
    return NextResponse.json({ error: "A valid follow-up is required" }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const channel = typeof input.action === "string" ? input.action.toUpperCase() : "CALL";
  if (!CHANNELS.includes(channel as typeof CHANNELS[number])) {
    return NextResponse.json({ error: "Choose CALL, EMAIL, or WHATSAPP" }, { status: 400 });
  }
  const note = typeof input.note === "string" ? input.note.trim() : "";
  if (note.length > 5000) return NextResponse.json({ error: "Follow-up notes are too long" }, { status: 413 });
  const date = typeof input.date === "string" ? new Date(input.date) : new Date();
  const promisedDate = typeof input.promisedDate === "string" && input.promisedDate
    ? new Date(input.promisedDate)
    : null;
  if (Number.isNaN(date.getTime()) || (promisedDate && Number.isNaN(promisedDate.getTime()))) {
    return NextResponse.json({ error: "Follow-up dates must be valid" }, { status: 400 });
  }

  await ensureFollowUpSchema();
  const { id: invoiceId } = await params;
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId }, select: { id: true } });
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const followUp = await prisma.followUp.create({
    data: {
      id: crypto.randomUUID(),
      invoiceId,
      date,
      channel,
      action: channel,
      note: note || null,
      promisedDate,
      status: "OPEN",
      createdById: session.user.id,
    },
  });
  await logActivity({
    module: "communication",
    action: "followup.create",
    entityType: "FollowUp",
    entityId: followUp.id,
    referenceId: invoiceId,
    userId: session.user.id,
    userName: session.user.name ?? undefined,
    description: JSON.stringify({ channel, status: "OPEN", invoiceId }),
  });
  return NextResponse.json({ success: true, item: followUp }, { status: 201 });
}
