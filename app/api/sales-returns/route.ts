import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { computeReturnStockPlacement } from "@/lib/sales-return-rules";

export const dynamic = "force-dynamic";

function nextReturnNumber(existing: Array<{ returnNumber: string }>) {
  let max = 0;
  for (const r of existing) {
    const n = Number((r.returnNumber || "").replace("SR-", ""));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `SR-${String(max + 1).padStart(4, "0")}`;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, PERMISSIONS.SALES_MANAGE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const { invoiceId, items, disposition, remarks } = body || {};
  if (!invoiceId || !Array.isArray(items) || !items.length) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const inv = await prisma.invoice.findUnique({ where: { id: invoiceId }, select: { invoiceDate: true, sales: { select: { customerId: true } } } });
  if (!inv) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  const days = Math.floor((Date.now() - new Date(inv.invoiceDate || Date.now()).getTime()) / (1000 * 60 * 60 * 24));

  try {
    const res = await prisma.$transaction(async (tx) => {
      const existing = await tx.salesReturn.findMany({ select: { returnNumber: true } });
      const returnNumber = nextReturnNumber(existing);
      const sr = await tx.salesReturn.create({
        data: {
          id: crypto.randomUUID(),
          invoiceId,
          returnNumber,
          disposition,
          remarks: remarks || null,
          createdById: session.user.id,
        },
      });
      for (const it of items) {
        await tx.salesReturnItem.create({
          data: {
            id: crypto.randomUUID(),
            salesReturnId: sr.id,
            inventoryId: it.inventoryId,
            quantity: it.quantity || 1,
            sellingPrice: it.sellingPrice,
            resaleable: it.resaleable ? 1 : 0,
          },
        });
        const placement = computeReturnStockPlacement({ daysSinceInvoice: days, resaleable: Boolean(it.resaleable) });
        await tx.inventory.update({
          where: { id: it.inventoryId },
          data: placement,
        });
      }
      let creditNoteId: string | undefined;
      let creditNoteNumber: string | undefined;
      if (disposition === "REFUND") {
        const totalAmount = items.reduce((s: number, i: { sellingPrice: number; quantity: number }) => s + Number(i.sellingPrice || 0) * Number(i.quantity || 1), 0);
        const cnExisting = await tx.creditNote.findMany({ select: { creditNoteNumber: true } });
        let maxCN = 0;
        for (const r of cnExisting) {
          const n = Number((r.creditNoteNumber || "").replace("CN-", ""));
          if (Number.isFinite(n) && n > maxCN) maxCN = n;
        }
        const cnNumber = `CN-${String(maxCN + 1).padStart(4, "0")}`;
        const cnId = crypto.randomUUID();
        await tx.creditNote.create({
          data: {
            id: cnId,
            customerId: inv.sales?.[0]?.customerId || null,
            invoiceId,
            creditNoteNumber: cnNumber,
            totalAmount,
            balanceAmount: totalAmount,
            isActive: 1,
          },
        });
        creditNoteId = cnId;
        creditNoteNumber = cnNumber;
      }
      return { success: true, returnNumber: sr.returnNumber, creditNoteId, creditNoteNumber };
    });
    return NextResponse.json(res);
  } catch {
    return NextResponse.json({ error: "Failed to create sales return" }, { status: 500 });
  }
}
