import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { ensureReturnsSchema } from "@/lib/returns-schema-ensure";

export const dynamic = "force-dynamic";

type Action = "activate" | "deactivate" | "extend";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await ensureReturnsSchema();

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, PERMISSIONS.RECEIVABLES_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const action = String(body?.action || "").trim() as Action;
  if (!action || !["activate", "deactivate", "extend"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const rows = await prisma.$queryRawUnsafe<
    Array<{ id: string; creditNoteNumber: string; isActive: number; issueDate: string; activeUntil: string | null }>
  >(
    `SELECT id, creditNoteNumber, isActive, issueDate, activeUntil
     FROM CreditNote
     WHERE id = ?
     LIMIT 1`,
    id
  );
  const cn = rows[0];
  if (!cn) return NextResponse.json({ error: "Not Found" }, { status: 404 });

  if (action === "deactivate") {
    await prisma.$executeRawUnsafe(`UPDATE CreditNote SET isActive = 0 WHERE id = ?`, id);
    return NextResponse.json({ success: true });
  }

  if (action === "extend") {
    await prisma.$executeRawUnsafe(
      `UPDATE CreditNote
       SET isActive = 1,
           activeUntil = datetime(CURRENT_TIMESTAMP, '+90 day')
       WHERE id = ?`,
      id
    );
    return NextResponse.json({ success: true });
  }

  const computedUntil = cn.activeUntil ? new Date(cn.activeUntil) : new Date(new Date(cn.issueDate).getTime() + 90 * 86400000);
  const isExpired = computedUntil.getTime() < Date.now();

  if (isExpired || !cn.activeUntil) {
    await prisma.$executeRawUnsafe(
      `UPDATE CreditNote
       SET isActive = 1,
           activeUntil = datetime(CURRENT_TIMESTAMP, '+90 day')
       WHERE id = ?`,
      id
    );
    return NextResponse.json({ success: true });
  }

  await prisma.$executeRawUnsafe(`UPDATE CreditNote SET isActive = 1 WHERE id = ?`, id);
  return NextResponse.json({ success: true });
}
