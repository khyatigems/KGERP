import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, PERMISSIONS.RECEIVABLES_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string; date: string; action: string | null; note: string | null; promisedDate: string | null; createdBy: string | null }>>(
    `SELECT id, date, action, note, promisedDate, createdBy FROM FollowUp WHERE invoiceId = ? ORDER BY date DESC`,
    id
  );
  return NextResponse.json({ items: rows || [] });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, PERMISSIONS.RECEIVABLES_MANAGE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { date, action, note, promisedDate } = body || {};
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO FollowUp (id, invoiceId, date, action, note, promisedDate, createdBy, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      crypto.randomUUID(),
      id,
      date || new Date().toISOString(),
      action || null,
      note || null,
      promisedDate || null,
      session.user.id
    );
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to add follow-up" }, { status: 500 });
  }
}
