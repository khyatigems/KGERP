import { NextResponse } from "next/server";
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

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, PERMISSIONS.RECEIVABLES_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const today = new Date();
  const invoices = await prisma.invoice.findMany({
    where: { paymentStatus: { in: ["UNPAID", "PARTIAL"] }, isActive: true },
    select: {
      id: true,
      invoiceNumber: true,
      invoiceDate: true,
      dueDate: true,
      totalAmount: true,
      paidAmount: true,
      paymentStatus: true,
      quotationId: true,
      sales: {
        take: 1,
        select: { customerName: true, customerId: true },
      },
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
      customer: inv.sales?.[0]?.customerName || "Unknown",
      invoice: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate,
      dueDate: inv.dueDate || null,
      bucket: bucketDays(days),
      amount,
      paid,
      balance,
      lastFollowUp: null,
    };
  });

  const totalReceivable = rows.reduce((s, r) => s + r.balance, 0);
  const buckets = ["0-30", "31-60", "61-90", "90+"].map((b) => ({
    bucket: b,
    amount: rows.filter((r) => r.bucket === b).reduce((s, r) => s + r.balance, 0),
  }));

  return NextResponse.json({ totalReceivable, rows, buckets });
}
