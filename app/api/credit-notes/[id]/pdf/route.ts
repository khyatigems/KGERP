import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { generateCreditNotePDF } from "@/lib/credit-note-generator";

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, PERMISSIONS.RECEIVABLES_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const creditNote = await prisma.creditNote.findUnique({
    where: { id },
    include: {
      customer: true,
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
          salesReturns: {
            take: 1,
            orderBy: { returnDate: "desc" },
            include: {
              items: {
                include: { inventory: { select: { sku: true, itemName: true } } },
              },
            },
          },
        },
      },
    },
  });

  if (!creditNote) return NextResponse.json({ error: "Not Found" }, { status: 404 });

  const company = await prisma.companySettings.findFirst();
  const items = (creditNote.invoice?.salesReturns?.[0]?.items || []).map((it) => ({
    description: `${it.inventory.sku} - ${it.inventory.itemName}`,
    qty: it.quantity,
    price: it.sellingPrice,
  }));

  const pdf = await generateCreditNotePDF({
    company: { name: company?.companyName || "Khyati Gems", gstin: company?.gstin || undefined },
    customer: { name: creditNote.customer?.name || "Customer" },
    creditNoteNumber: creditNote.creditNoteNumber,
    invoiceNumber: creditNote.invoice?.invoiceNumber || undefined,
    issueDate: creditNote.issueDate,
    items: items.length ? items : [{ description: "Return Adjustment", qty: 1, price: creditNote.totalAmount }],
    totalAmount: creditNote.totalAmount,
  });

  return new NextResponse(Buffer.from(new Uint8Array(pdf)), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${creditNote.creditNoteNumber}.pdf"`,
    },
  });
}
