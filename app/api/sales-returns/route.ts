import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { computeReturnStockPlacement } from "@/lib/sales-return-rules";

export const dynamic = "force-dynamic";

function nextPrefixedNumber(prefix: string, existing: Array<{ n: string }>) {
  let max = 0;
  for (const r of existing) {
    const n = Number((r.n || "").replace(prefix, ""));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function computeGstSplit(input: { taxable: number; rate: number; companyState: string; placeOfSupply: string }) {
  const totalTax = round2(input.taxable * input.rate);
  const company = (input.companyState || "").trim().toLowerCase();
  const pos = (input.placeOfSupply || "").trim().toLowerCase();
  const interstate = Boolean(company && pos && company !== pos);
  if (interstate) return { igst: totalTax, cgst: 0, sgst: 0, totalTax };
  const half = round2(totalTax / 2);
  const remainder = round2(totalTax - half - half);
  return { igst: 0, cgst: half + remainder, sgst: half, totalTax };
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, PERMISSIONS.SALES_CREATE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const { invoiceId, items, disposition, remarks } = body || {};
  if (!invoiceId || !Array.isArray(items) || !items.length) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const inv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      invoiceDate: true,
      subtotal: true,
      taxTotal: true,
      sales: { take: 1, select: { customerId: true, placeOfSupply: true, customerCity: true } },
    },
  });
  if (!inv) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  const days = Math.floor((Date.now() - new Date(inv.invoiceDate || Date.now()).getTime()) / (1000 * 60 * 60 * 24));

  try {
    const res = await prisma.$transaction(async (tx) => {
      const existingReturns = await tx.$queryRawUnsafe<Array<{ n: string }>>(
        `SELECT returnNumber as n FROM SalesReturn WHERE returnNumber LIKE 'SR-%' ORDER BY returnNumber DESC LIMIT 1000`
      );
      const returnNumber = nextPrefixedNumber("SR-", existingReturns);
      const salesReturnId = crypto.randomUUID();

      const company = await tx.companySettings.findFirst({ select: { state: true } });
      const placeOfSupply = inv.sales?.[0]?.placeOfSupply || inv.sales?.[0]?.customerCity || "";
      const taxableAmount = round2(
        items.reduce((s: number, i: { sellingPrice: number; quantity: number }) => s + Number(i.sellingPrice || 0) * Number(i.quantity || 1), 0)
      );
      const rate = inv.subtotal > 0 ? inv.taxTotal / inv.subtotal : 0;
      const gst = computeGstSplit({ taxable: taxableAmount, rate, companyState: company?.state || "", placeOfSupply });
      const totalAmount = round2(taxableAmount + gst.totalTax);

      await tx.$executeRawUnsafe(
        `INSERT INTO SalesReturn (id, invoiceId, returnNumber, returnDate, disposition, taxableAmount, igst, cgst, sgst, totalTax, totalAmount, remarks, createdById, createdAt)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        salesReturnId,
        invoiceId,
        returnNumber,
        disposition,
        taxableAmount,
        gst.igst,
        gst.cgst,
        gst.sgst,
        gst.totalTax,
        totalAmount,
        remarks || null,
        session.user.id
      );

      for (const it of items as Array<{ inventoryId: string; quantity: number; sellingPrice: number; resaleable: boolean }>) {
        await tx.$executeRawUnsafe(
          `INSERT INTO SalesReturnItem (id, salesReturnId, inventoryId, quantity, sellingPrice, resaleable)
           VALUES (?, ?, ?, ?, ?, ?)`,
          crypto.randomUUID(),
          salesReturnId,
          it.inventoryId,
          it.quantity || 1,
          it.sellingPrice,
          it.resaleable ? 1 : 0
        );
        const placement = computeReturnStockPlacement({ daysSinceInvoice: days, resaleable: Boolean(it.resaleable) });
        await tx.inventory.update({ where: { id: it.inventoryId }, data: placement });
      }

      let creditNoteId: string | undefined;
      let creditNoteNumber: string | undefined;
      if (disposition === "REFUND") {
        const existingCN = await tx.$queryRawUnsafe<Array<{ n: string }>>(
          `SELECT creditNoteNumber as n FROM CreditNote WHERE creditNoteNumber LIKE 'CN-%' ORDER BY creditNoteNumber DESC LIMIT 1000`
        );
        const cnNumber = nextPrefixedNumber("CN-", existingCN);
        const cnId = crypto.randomUUID();
        await tx.$executeRawUnsafe(
          `INSERT INTO CreditNote (id, customerId, invoiceId, creditNoteNumber, issueDate, totalAmount, taxableAmount, igst, cgst, sgst, totalTax, balanceAmount, isActive, createdAt)
           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)`,
          cnId,
          inv.sales?.[0]?.customerId || null,
          invoiceId,
          cnNumber,
          totalAmount,
          taxableAmount,
          gst.igst,
          gst.cgst,
          gst.sgst,
          gst.totalTax,
          totalAmount
        );
        creditNoteId = cnId;
        creditNoteNumber = cnNumber;
      }
      return { success: true, returnNumber, creditNoteId, creditNoteNumber };
    });
    return NextResponse.json(res);
  } catch {
    return NextResponse.json({ error: "Failed to create sales return" }, { status: 500 });
  }
}
