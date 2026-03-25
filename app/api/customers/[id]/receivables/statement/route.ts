import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { generateCustomerStatementPDF } from "@/lib/statement-generator";

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, PERMISSIONS.RECEIVABLES_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const customerId = params.id;
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return NextResponse.json({ error: "Not Found" }, { status: 404 });
  const company = await prisma.companySettings.findFirst();
  const today = new Date();
  const invoices = await prisma.invoice.findMany({
    where: { isActive: true, sales: { some: { customerId } } },
    select: { invoiceNumber: true, invoiceDate: true, dueDate: true, totalAmount: true, paidAmount: true },
    orderBy: { invoiceDate: "desc" },
  });
  const rows = invoices.map((inv) => ({
    invoice: inv.invoiceNumber,
    invoiceDate: inv.invoiceDate,
    dueDate: inv.dueDate || null,
    bucket: bucketDays(inv.dueDate || inv.invoiceDate || today),
    amount: inv.totalAmount || 0,
    paid: inv.paidAmount || 0,
    balance: Math.max(0, (inv.totalAmount || 0) - (inv.paidAmount || 0)),
  }));
  const totalDue = rows.reduce((s, r) => s + r.balance, 0);
  const pdf = await generateCustomerStatementPDF({
    company: { name: company?.brandName || "Khyati Gems", address: company?.registeredAddress || undefined, gstin: company?.gstin || undefined },
    customer: { name: customer.name, address: customer.address || undefined },
    period: { from: null, to: today },
    rows,
    totalDue,
  });
  return new NextResponse(Buffer.from(new Uint8Array(pdf)), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="statement_${customer.name.replace(/\s+/g, "_")}.pdf"`,
    },
  });
}

function bucketDays(date: Date) {
  const today = new Date();
  const d = new Date(date);
  const diff = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff <= 30) return "0-30";
  if (diff <= 60) return "31-60";
  if (diff <= 90) return "61-90";
  return "90+";
}

