import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { generateCreditNotePDF } from "@/lib/credit-note-generator";
import { ensureReturnsSchema } from "@/lib/returns-schema-ensure";

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await ensureReturnsSchema();
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, PERMISSIONS.RECEIVABLES_VIEW) && !hasPermission(session.user.role, PERMISSIONS.SALES_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      creditNoteNumber: string;
      issueDate: string;
      activeUntil: string | null;
      totalAmount: number;
      taxableAmount: number;
      igst: number;
      cgst: number;
      sgst: number;
      totalTax: number;
      balanceAmount: number;
      invoiceId: string | null;
      invoiceNumber: string | null;
      customerName: string | null;
      customerId: string | null;
    }>
  >(
    `SELECT cn.id,
            cn.creditNoteNumber,
            cn.issueDate,
            cn.activeUntil,
            cn.totalAmount,
            cn.taxableAmount,
            cn.igst,
            cn.cgst,
            cn.sgst,
            cn.totalTax,
            cn.balanceAmount,
            cn.invoiceId,
            i.invoiceNumber as invoiceNumber,
            c.name as customerName,
            cn.customerId as customerId
     FROM CreditNote cn
     LEFT JOIN Invoice i ON i.id = cn.invoiceId
     LEFT JOIN Customer c ON c.id = cn.customerId
     WHERE cn.id = ?
     LIMIT 1`,
    id
  );
  const creditNote = rows[0];
  if (!creditNote) return NextResponse.json({ error: "Not Found" }, { status: 404 });

  const company = await prisma.companySettings.findFirst();
  const invoiceSettings = await prisma.invoiceSettings.findFirst();
  const creditNoteTermsRow = await prisma.setting.findUnique({ where: { key: "credit_note_terms" } }).catch(() => null);
  const creditNoteTerms = creditNoteTermsRow?.value || "";
  const primarySale = creditNote.invoiceId
    ? await prisma.sale.findFirst({
        where: { invoiceId: creditNote.invoiceId },
        orderBy: { saleDate: "desc" },
        select: {
          customerName: true,
          customerAddress: true,
          billingAddress: true,
          customerCity: true,
          customerPhone: true,
          customerEmail: true,
        },
      })
    : null;
  const customerName = creditNote.customerName || primarySale?.customerName || "Customer";
  const customerAddress = primarySale?.billingAddress || primarySale?.customerAddress || primarySale?.customerCity || "";
  const customerCode = await (async () => {
    try {
      if (!creditNote.customerId) return null;
      const r = await prisma.$queryRawUnsafe<Array<{ code: string }>>(
        `SELECT code FROM CustomerCode WHERE customerId = ? LIMIT 1`,
        creditNote.customerId
      );
      return r[0]?.code || null;
    } catch {
      return null;
    }
  })();

  const items = creditNote.invoiceId
    ? await prisma.$queryRawUnsafe<Array<{ description: string; qty: number; price: number }>>(
        `SELECT (inv.sku || ' - ' || inv.itemName) as description,
                sri.quantity as qty,
                sri.sellingPrice as price
         FROM SalesReturn sr
         JOIN SalesReturnItem sri ON sri.salesReturnId = sr.id
         JOIN Inventory inv ON inv.id = sri.inventoryId
         WHERE sr.invoiceId = ?
         ORDER BY sr.returnDate DESC
         LIMIT 50`,
        creditNote.invoiceId
      )
    : [];

  const logoUrl =
    company?.invoiceLogoUrl ||
    company?.otherDocsLogoUrl ||
    company?.logoUrl ||
    company?.quotationLogoUrl ||
    undefined;
  const expiryDate = creditNote.activeUntil
    ? new Date(creditNote.activeUntil)
    : new Date(new Date(creditNote.issueDate).getTime() + 90 * 86400000);

  const pdf = await generateCreditNotePDF({
    company: {
      name: company?.companyName || "Khyati Gems",
      address: company?.address || "",
      email: company?.email || "",
      phone: company?.phone || "",
      website: company?.website || "",
      gstin: company?.gstin || undefined,
      logoUrl,
    },
    customer: { name: customerName, customerCode: customerCode || undefined, address: customerAddress, phone: primarySale?.customerPhone || "", email: primarySale?.customerEmail || "" },
    creditNoteNumber: creditNote.creditNoteNumber,
    invoiceNumber: creditNote.invoiceNumber || undefined,
    issueDate: new Date(creditNote.issueDate),
    expiryDate,
    items: items.length ? items : [{ description: "Return Adjustment", qty: 1, price: creditNote.totalAmount }],
    taxableAmount: creditNote.taxableAmount,
    igst: creditNote.igst,
    cgst: creditNote.cgst,
    sgst: creditNote.sgst,
    totalTax: creditNote.totalTax,
    totalAmount: creditNote.totalAmount,
    balanceAmount: creditNote.balanceAmount,
    signatureUrl: invoiceSettings?.digitalSignatureUrl || undefined,
    terms: creditNoteTerms || undefined,
  });

  return new NextResponse(Buffer.from(new Uint8Array(pdf)), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${creditNote.creditNoteNumber}.pdf"`,
    },
  });
}
