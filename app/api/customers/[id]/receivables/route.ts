import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

function bucketDays(diff: number) {
  if (diff <= 30) return "0-30";
  if (diff <= 60) return "31-60";
  if (diff <= 90) return "61-90";
  return "90+";
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, PERMISSIONS.RECEIVABLES_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const customerId = params.id;
  const today = new Date();
  const invoices = await prisma.invoice.findMany({
    where: { isActive: true, sales: { some: { customerId } } },
    select: {
      id: true,
      invoiceNumber: true,
      invoiceDate: true,
      dueDate: true,
      totalAmount: true,
      paidAmount: true,
      paymentStatus: true,
    },
    orderBy: { invoiceDate: "desc" },
  });

  const rows = invoices.map((inv) => {
    const due = inv.dueDate || inv.invoiceDate || today;
    const days = Math.floor((today.getTime() - new Date(due).getTime()) / (1000 * 60 * 60 * 24));
    const amount = inv.totalAmount || 0;
    const paid = inv.paidAmount || 0;
    const balance = Math.max(0, amount - paid);
    return {
      id: inv.id,
      invoice: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate,
      dueDate: inv.dueDate || null,
      bucket: bucketDays(days),
      amount,
      paid,
      balance,
      paymentStatus: inv.paymentStatus,
    };
  });

  const totalReceivable = rows.reduce((s, r) => s + r.balance, 0);
  return NextResponse.json({ rows, totalReceivable });
}

