import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, PERMISSIONS.RECEIVABLES_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const rows = await prisma.$queryRawUnsafe<
    Array<{ id: string; creditNoteNumber: string; issueDate: string; totalAmount: number; balanceAmount: number }>
  >(
    `SELECT id, creditNoteNumber, issueDate, totalAmount, balanceAmount
     FROM CreditNote
     WHERE customerId = ? AND isActive = 1
     ORDER BY issueDate DESC
     LIMIT 200`,
    id
  );
  return NextResponse.json({ items: rows || [] });
}

