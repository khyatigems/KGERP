import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ensureSalesReturnReplacementSchema, prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getInvoiceDisplayDate } from "@/lib/invoice-date";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, ExternalLink, History, FileClock } from "lucide-react";
import { PaymentStatusSelect } from "@/components/invoices/payment-status-select";
import { PaymentHistory } from "@/components/invoices/payment-history";
import { DownloadPdfButton } from "@/components/invoice/download-pdf-button";
import { UPIQr } from "@/components/invoice/upi-qr";
import { InvoiceData } from "@/lib/invoice-generator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { buildWhatsappUrl } from "@/lib/whatsapp";
import { buildUpiUri } from "@/lib/upi";
import { selfHealInvoicePaymentOnLoad } from "@/lib/invoice-billing";
import { aggregateInvoicePayments, getPaymentMethodLabel } from "@/lib/payment-breakdown";
import { computeInvoiceGst } from "@/lib/invoice-gst";
import { ensureReturnsSchema } from "@/lib/returns-schema-ensure";
import { sanitizeNumberText } from "@/lib/number-formatting";

export const dynamic = "force-dynamic";

type PrismaRecord = Record<string, unknown>;
type PackagingSettingsRow = { categoryHsnJson?: string | null };
type PackagingSettingsDelegate = {
  findFirst: (args?: PrismaRecord) => Promise<PackagingSettingsRow | null>;
};
type PackagingPrismaClient = typeof prisma & {
  gpisSettings: PackagingSettingsDelegate;
};
const packagingPrisma = prisma as unknown as PackagingPrismaClient;

function parseCategoryHsnJson(input: unknown): Record<string, string> {
  if (typeof input !== "string" || !input.trim()) return {};
  try {
    const parsed = JSON.parse(input) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof k !== "string") continue;
      if (typeof v !== "string") continue;
      const key = k.trim();
      const val = v.trim();
      if (!key || !val) continue;
      out[key] = val;
    }
    return out;
  } catch {
    return {};
  }
}

type InvoicePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function InvoiceDetailPage({ params }: InvoicePageProps) {
  const { id } = await params;
  await ensureReturnsSchema();
  await ensureSalesReturnReplacementSchema();

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      sales: {
        include: { inventory: true }
      },
      legacySale: {
        include: { inventory: true }
      },
      quotation: true,
      versions: {
        orderBy: { versionNumber: "desc" }
      },
      payments: {
        orderBy: { date: "desc" }
      }
    },
  });

  if (!invoice) {
    const byToken = await prisma.invoice.findUnique({ where: { token: id }, select: { token: true } });
    if (byToken?.token) redirect(`/invoice/${byToken.token}`);

    const sale = await prisma.sale.findUnique({
      where: { id },
      select: { invoiceId: true, legacyInvoiceId: true },
    });
    const nextId = sale?.invoiceId || sale?.legacyInvoiceId;
    if (nextId) redirect(`/invoices/${nextId}`);

    const salesReturn = await prisma.salesReturn.findUnique({
      where: { id },
      select: { id: true, invoiceId: true, disposition: true, returnNumber: true },
    });
    if (salesReturn?.invoiceId) {
      if (salesReturn.disposition === "REPLACEMENT") {
        const rep = await prisma
          .$queryRawUnsafe<Array<{ invoiceId: string }>>(
            `SELECT invoiceId FROM "SalesReturnReplacement" WHERE salesReturnId = ? LIMIT 1`,
            salesReturn.id
          )
          .catch(() => []);
        const repId = rep?.[0]?.invoiceId;
        if (repId) {
          const inv = await prisma.invoice.findUnique({ where: { id: repId }, select: { id: true, token: true } });
          if (inv?.token) redirect(`/invoice/${inv.token}`);
          if (inv?.id) redirect(`/invoices/${inv.id}`);
        }
      }
      redirect(`/invoices/${salesReturn.invoiceId}`);
    }

    const replacementLink = await prisma.$queryRawUnsafe<Array<{ invoiceId: string; salesReturnId: string }>>(
      `SELECT invoiceId, salesReturnId FROM "SalesReturnReplacement"
       WHERE invoiceId = ? OR memoId = ? OR salesReturnId = ?
       LIMIT 1`,
      id,
      id,
      id
    ).catch(() => []);
    const mappedInvoiceId = replacementLink?.[0]?.invoiceId;
    const mappedSalesReturnId = replacementLink?.[0]?.salesReturnId;
    if (mappedInvoiceId) {
      const inv = await prisma.invoice.findUnique({ where: { id: mappedInvoiceId }, select: { id: true, token: true } });
      if (inv?.token) redirect(`/invoice/${inv.token}`);
      if (inv?.id) redirect(`/invoices/${inv.id}`);

      if (mappedSalesReturnId) {
        const sr = await prisma.salesReturn.findUnique({ where: { id: mappedSalesReturnId }, select: { returnNumber: true } });
        const rn = String(sr?.returnNumber || "").trim();
        if (rn) {
          const legacy = await prisma.invoice.findFirst({
            where: { status: "REPLACEMENT", notes: { contains: rn } },
            select: { id: true, token: true },
            orderBy: { createdAt: "desc" },
          });
          if (legacy?.token) redirect(`/invoice/${legacy.token}`);
          if (legacy?.id) redirect(`/invoices/${legacy.id}`);
        }
      }
    }

    notFound();
  }

  // Normalize sales data
  const salesItems = invoice.sales.length > 0 ? invoice.sales : (invoice.legacySale ? [invoice.legacySale] : []);
  const primarySale = salesItems[0];
  
  if (!primarySale) {
    return <div>Invalid Invoice: No linked sales found.</div>;
  }

  // Calculate totals
  const subtotal = salesItems.reduce((sum, item) => sum + item.salePrice, 0);
  const baseDiscount = salesItems.reduce((sum, item) => sum + (item.discountAmount || 0), 0);
  const gstAmount = salesItems.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
  const total = subtotal - baseDiscount + gstAmount;

  // Determine Payment Status
  const allPaid = salesItems.every(s => s.paymentStatus === "PAID");
  // const anyPaidOrPartial = salesItems.some(s => s.paymentStatus === "PAID" || s.paymentStatus === "PARTIAL");
  
  let paymentStatus = invoice.paymentStatus;
  // Fallback for legacy data: if invoice status is UNPAID (default) but all sales are PAID
  if (paymentStatus === "UNPAID" && allPaid && salesItems.length > 0) {
    paymentStatus = "PAID";
  }

  // Calculate Balance
  // Use invoice.totalAmount if available, else calculated total
  const finalTotalAmount = invoice.totalAmount > 0 ? invoice.totalAmount : total;
  const paymentSummary = aggregateInvoicePayments(invoice.payments || []);
  
  let amountPaid = paymentSummary.rows.length > 0 ? paymentSummary.netReceived : (invoice.paidAmount || 0);
  // Fallback: If status is PAID but amountPaid is 0, assume full payment (legacy)
  if (paymentStatus === "PAID" && amountPaid === 0) {
    amountPaid = finalTotalAmount;
  }
  
  let balanceDue = Math.max(0, finalTotalAmount - amountPaid);

  // Fetch Settings for PDF
  const companySettings = await prisma.companySettings.findFirst();
  const invoiceSettings = await prisma.invoiceSettings.findFirst();
  const paymentSettings = await prisma.paymentSettings.findFirst();
  const packagingSettings = await packagingPrisma.gpisSettings.findFirst();
  const categoryHsnMap = parseCategoryHsnJson(packagingSettings?.categoryHsnJson);

  const displayLogo = companySettings?.quotationLogoUrl || companySettings?.logoUrl;

  // Parse GST Rates
  let gstRates: Record<string, string> = {};
  try {
    if (invoiceSettings?.categoryGstRates) {
      gstRates = JSON.parse(invoiceSettings.categoryGstRates);
    }
  } catch (e) {
    console.error("Failed to parse GST rates", e);
  }

  let displayOptions = {
    showWeight: true,
    showRatti: true,
    showDimensions: true,
    showGemType: true,
    showCategory: true,
    showColor: true,
    showShape: true,
    showRashi: true,
    showCertificates: true,
    showSku: true,
    showPrice: true,
    showShippingCharge: false,
    shippingCharge: 0,
    showAdditionalCharge: false,
    additionalCharge: 0,
    invoiceDiscountType: "AMOUNT",
    invoiceDiscountValue: 0,
  };

  if (invoice.displayOptions) {
    try {
      const parsed = JSON.parse(invoice.displayOptions);
      displayOptions = { ...displayOptions, ...parsed };
    } catch {}
  }

  const gstCalc = computeInvoiceGst({
    items: salesItems,
    gstRates,
    displayOptions,
  });
  const processedItems = gstCalc.processedItems;
  const subtotalBase = gstCalc.taxableTotal;
  const totalGst = gstCalc.gstTotal;
  const saleShippingCharge = (primarySale as { shippingCharge?: number | null }).shippingCharge || 0;
  const saleAdditionalCharge = (primarySale as { additionalCharge?: number | null }).additionalCharge || 0;
  const showShippingCharge = typeof displayOptions.showShippingCharge === "boolean"
    ? displayOptions.showShippingCharge
    : saleShippingCharge > 0;
  const showAdditionalCharge = typeof displayOptions.showAdditionalCharge === "boolean"
    ? displayOptions.showAdditionalCharge
    : saleAdditionalCharge > 0;
  const shippingCharge = showShippingCharge ? Number(displayOptions.shippingCharge || saleShippingCharge || 0) : 0;
  const additionalCharge = showAdditionalCharge ? Number(displayOptions.additionalCharge || saleAdditionalCharge || 0) : 0;
  const totalBeforeExtras = gstCalc.finalTotal;
  const pdfTotal = totalBeforeExtras + (Number.isFinite(shippingCharge) ? shippingCharge : 0) + (Number.isFinite(additionalCharge) ? additionalCharge : 0);
  const discount = gstCalc.discountTotal;
  const healResult = await selfHealInvoicePaymentOnLoad({
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    persistedTotalAmount: invoice.totalAmount || 0,
    computedTotalAmount: pdfTotal,
    paidAmount: amountPaid,
    currentPaymentStatus: invoice.paymentStatus || paymentStatus,
    currentStatus: invoice.status || "ISSUED"
  });
  paymentStatus = healResult.paymentStatus;
  balanceDue = healResult.balanceDue;
  const paymentBreakdownRows = (() => {
    const map = new Map<string, { method: string; amount: number }>();
    for (const p of invoice.payments || []) {
      const method = String(p.method || "OTHER");
      const ref = String(p.reference || "").trim();
      const label =
        method === "CREDIT_NOTE" && ref
          ? `${getPaymentMethodLabel(method)} ${ref}`
          : getPaymentMethodLabel(method);
      const key = method === "CREDIT_NOTE" && ref ? `${method}:${ref}` : method;
      const existing = map.get(key) || { method: label, amount: 0 };
      existing.amount += Number(p.amount || 0);
      map.set(key, existing);
    }
    return Array.from(map.values())
      .filter((row) => Math.abs(row.amount) > 0.009)
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  })();
  const latestPaymentDate = (invoice.payments || [])
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.date;

  const creditNotes = await (async () => {
    try {
      return await prisma.$queryRawUnsafe<
        Array<{
              id: string;
          creditNoteNumber: string;
          issueDate: string;
          activeUntil: string | null;
          totalAmount: number;
          balanceAmount: number;
          isActive: number;
        }>
      >(
            `SELECT id, creditNoteNumber, issueDate, activeUntil, totalAmount, balanceAmount, isActive
         FROM CreditNote
         WHERE invoiceId = ?
         ORDER BY issueDate DESC
         LIMIT 50`,
        invoice.id
      );
    } catch {
      return [];
    }
  })();
  const creditNoteText = (creditNotes || [])
    .filter((cn) => (cn.creditNoteNumber || "").trim())
    .map((cn) => {
      const total = sanitizeNumberText(formatCurrency(Number(cn.totalAmount || 0)).replace("₹", "Rs. "));
      const bal = sanitizeNumberText(formatCurrency(Number(cn.balanceAmount || 0)).replace("₹", "Rs. "));
      return `${cn.creditNoteNumber} (Total ${total}, Balance ${bal})`;
    })
    .join(", ");

  const isPaid = paymentStatus === "PAID";
  const isReplacement = invoice.status === "REPLACEMENT" || paymentStatus === "REPLACEMENT";
  // const balanceDue = isPaid ? 0 : pdfTotal; // Already calculated above

  const customerCode = await (async () => {
    try {
      const customerId = (primarySale as { customerId?: string | null }).customerId || invoice.quotation?.customerId || null;
      if (!customerId) return null;
      const rows = await prisma.$queryRawUnsafe<Array<{ code: string }>>(
        `SELECT code FROM CustomerCode WHERE customerId = ? LIMIT 1`,
        customerId
      );
      return rows[0]?.code || null;
    } catch {
      return null;
    }
  })();

  const pdfData: InvoiceData = {
    invoiceNumber: invoice.invoiceNumber,
    date: getInvoiceDisplayDate(invoice),
    documentTitle: isReplacement ? "REPLACEMENT INVOICE" : undefined,
    documentRightTag: isReplacement ? "REPLACEMENT" : undefined,
    documentNumberLabel: isReplacement ? "Replacement #" : undefined,
    documentDateLabel: isReplacement ? "Date" : undefined,
    showPaymentSection: isReplacement ? false : undefined,
    showBankDetailsSection: isReplacement ? false : undefined,
    company: {
      name: companySettings?.companyName || "KhyatiGems",
      address: companySettings?.address || "",
      email: companySettings?.email || "",
      phone: companySettings?.phone || "",
      website: companySettings?.website || "",
      gstin: companySettings?.gstin || undefined,
      logoUrl: displayLogo || undefined,
    },
    customer: {
      name: primarySale.customerName || "Walk-in Customer",
      customerCode: customerCode || undefined,
      address: primarySale.customerAddress || primarySale.customerCity || "",
      phone: primarySale.customerPhone || "",
      email: primarySale.customerEmail || "",
    },
    billingAddress: (primarySale as { billingAddress?: string | null }).billingAddress || primarySale.customerAddress || primarySale.customerCity || "",
    shippingAddress: (primarySale as { shippingAddress?: string | null }).shippingAddress || (primarySale as { billingAddress?: string | null }).billingAddress || primarySale.customerAddress || primarySale.customerCity || "",
    placeOfSupply: (primarySale as { placeOfSupply?: string | null }).placeOfSupply || primarySale.customerCity || primarySale.customerAddress || "-",
    items: processedItems.map((item) => {
      const qtyLabel = item.inventory.weightRatti
        ? `${item.inventory.weightRatti} Ratti`
        : item.inventory.weightValue
        ? `${item.inventory.weightValue} ${item.inventory.weightUnit}`
        : "1";
      const detailLines: string[] = [];
      const unit = item.inventory.weightUnit || "cts";
      const label = unit.toLowerCase().includes("ct") ? "Carat" : "Weight";
      if (displayOptions.showWeight) detailLines.push(`${label}: ${item.inventory.weightValue} ${unit}`);
      if (displayOptions.showRatti && item.inventory.weightRatti) detailLines.push(`Ratti: ${item.inventory.weightRatti}`);
      if (displayOptions.showPrice) {
        const rateValue = item.inventory.pricingMode === "PER_CARAT"
          ? item.inventory.sellingRatePerCarat
          : item.inventory.flatSellingPrice;
        const rateFallback = rateValue ?? item.basePrice ?? 0;
        detailLines.push(`Rate: Rs. ${Number(rateFallback || 0).toFixed(2)}`);
      }
      const description = [item.inventory.itemName, ...detailLines].join("\n");
      return {
        sku: displayOptions.showSku ? item.inventory.sku : "",
        hsn: item.inventory.category ? categoryHsnMap[item.inventory.category] : undefined,
        description,
        quantity: 1,
        displayQty: qtyLabel,
        unitPrice: displayOptions.showPrice ? item.basePrice : 0,
        gstRate: item.gstRate,
        gstAmount: item.calculatedGst,
        total: item.finalTotal
      };
    }),
    grossTotal: gstCalc.grossTotal,
    subtotal: subtotalBase,
    discount,
    tax: totalGst,
    shippingCharge: Number.isFinite(shippingCharge) ? shippingCharge : 0,
    additionalCharge: Number.isFinite(additionalCharge) ? additionalCharge : 0,
    total: isReplacement ? 0 : pdfTotal,
    amountPaid: isReplacement ? 0 : amountPaid, 
    balanceDue: isReplacement ? 0 : balanceDue,
    status: isReplacement ? "REPLACEMENT" : paymentStatus,
    paymentStatus: isReplacement ? "REPLACEMENT" : (creditNoteText ? `${paymentStatus} (CN Issued)` : paymentStatus),
    paymentMethod: isReplacement ? undefined : (paymentBreakdownRows.length === 1 ? paymentBreakdownRows[0].method : (primarySale.paymentMethod || undefined)),
    paidAt: isReplacement ? undefined : (latestPaymentDate || primarySale.saleDate || undefined),
    paymentBreakdown: isReplacement ? [] : paymentBreakdownRows,
    terms: invoiceSettings?.terms || undefined,
    notes: [invoiceSettings?.footerNotes, invoice.notes || "", creditNoteText ? `Credit Note(s): ${creditNoteText}` : ""].filter(Boolean).join("\n") || undefined,
    signatureUrl: invoiceSettings?.digitalSignatureUrl || undefined,
    bankDetails: isReplacement ? undefined : (paymentSettings?.bankEnabled ? {
      bankName: paymentSettings.bankName || "",
      accountNumber: paymentSettings.accountNumber || "",
      ifsc: paymentSettings.ifscCode || "",
      holder: paymentSettings.accountHolder || "",
    } : undefined),
    upiQrData: !isReplacement && paymentSettings?.upiEnabled && paymentSettings.upiId 
      ? `upi://pay?pa=${paymentSettings.upiId}&pn=${encodeURIComponent(paymentSettings.upiPayeeName || "")}&am=${pdfTotal.toFixed(2)}&cu=INR`
      : undefined
  };

  const baseUrl = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
  const invoiceUrl = `${baseUrl}/invoice/${invoice.token}`;
  const outstandingAmount = balanceDue;
  const upiUri = paymentSettings?.upiEnabled && paymentSettings.upiId && outstandingAmount > 0
    ? buildUpiUri({
        vpa: paymentSettings.upiId,
        payeeName: paymentSettings.upiPayeeName || "KhyatiGems",
        amount: outstandingAmount,
        transactionNote: `Invoice ${invoice.invoiceNumber}`
      })
    : null;
  const paymentLinkWhatsappUrl = outstandingAmount > 0
    ? buildWhatsappUrl(
        [
          "Namaste 🙏",
          "",
          `Outstanding amount for invoice ${invoice.invoiceNumber}: ₹${outstandingAmount.toFixed(2)}`,
          "",
          "Invoice link:",
          invoiceUrl,
          upiUri ? "" : "",
          upiUri ? "UPI payment link:" : "",
          upiUri ? upiUri : "",
          "",
          "Please pay the outstanding amount to complete the invoice."
        ].filter(Boolean).join("\n")
      )
    : null;
  
  // For PARTIAL/UNPAID, use calculated values (already set in object definition)
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/invoices">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">
          Invoice {invoice.invoiceNumber}
        </h1>
        <PaymentStatusSelect 
          invoiceId={invoice.id} 
          currentStatus={paymentStatus} 
          amountDue={balanceDue}
          totalAmount={finalTotalAmount}
        />
        {creditNoteText ? <Badge variant="secondary">CN Issued</Badge> : null}
        {creditNotes.length ? (
          <div className="flex items-center gap-2">
            {creditNotes.map((cn) => (
              <Button key={cn.id} variant="outline" size="sm" asChild title={`Download ${cn.creditNoteNumber}`}>
                <Link href={`/api/credit-notes/${cn.id}/pdf`} target="_blank" rel="noopener noreferrer">
                  CN {cn.creditNoteNumber}
                </Link>
              </Button>
            ))}
          </div>
        ) : null}
        
        <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" asChild>
                <Link href={`/invoice/${invoice.token}`} target="_blank">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Public Link
                </Link>
            </Button>
            {paymentLinkWhatsappUrl && (
              <Button variant="outline" size="sm" asChild>
                <Link href={paymentLinkWhatsappUrl} target="_blank">
                  Send Payment Link
                </Link>
              </Button>
            )}
            <DownloadPdfButton data={pdfData} />
        </div>
      </div>

      {invoice.paidAmount > 0 && balanceDue > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="font-semibold">Outstanding balance increased.</div>
          <div className="text-sm">Please collect the additional amount of ₹{balanceDue.toFixed(2)} before marking invoice as paid.</div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
              <CardHeader>
                  <CardTitle>Customer Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                      <span className="text-muted-foreground">Name</span>
                      <span className="font-medium">{primarySale.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                      <span className="text-muted-foreground">Mobile</span>
                      <span className="font-medium">{primarySale.customerPhone || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                      <span className="text-muted-foreground">Email</span>
                      <span className="font-medium">{primarySale.customerEmail || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                      <span className="text-muted-foreground">City</span>
                      <span className="font-medium">{primarySale.customerCity || "-"}</span>
                  </div>
              </CardContent>
          </Card>

          <Card>
              <CardHeader>
                  <CardTitle>Invoice Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                      <span className="text-muted-foreground">Invoice Date</span>
                      <span className="font-medium">{formatDate(getInvoiceDisplayDate(invoice))}</span>
                  </div>
                  {invoice.quotationId && (
                      <div className="flex justify-between">
                          <span className="text-muted-foreground">From Quotation</span>
                          <Link href={`/quotes/${invoice.quotationId}`} className="text-blue-600 hover:underline">
                              View Quote
                          </Link>
                      </div>
                  )}
                  {discount > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Gross Total</span>
                        <span className="font-medium">{formatCurrency(gstCalc.grossTotal)}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>Discount</span>
                        <span className="font-medium">-{formatCurrency(discount)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between">
                      <span className="text-muted-foreground">Taxable Amount</span>
                      <span className="font-medium">{formatCurrency(subtotalBase)}</span>
                  </div>
                  <div className="flex justify-between">
                      <span className="text-muted-foreground">Total GST</span>
                      <span className="font-medium">{formatCurrency(totalGst)}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-2 border-t mt-2">
                      <span>Total Amount</span>
                      <span>{formatCurrency(pdfTotal)}</span>
                  </div>
              </CardContent>
          </Card>
      </div>

      <Card>
          <CardHeader>
              <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent>
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>SKU</TableHead>
                          <TableHead>Item Name</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Total</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {salesItems.map((item) => (
                          <TableRow key={item.id}>
                              <TableCell>{item.inventory.sku}</TableCell>
                              <TableCell>{item.inventory.itemName}</TableCell>
                              <TableCell>{formatCurrency(item.salePrice)}</TableCell>
                              <TableCell>{formatCurrency(item.netAmount)}</TableCell>
                          </TableRow>
                      ))}
                  </TableBody>
              </Table>
          </CardContent>
      </Card>

      <PaymentHistory payments={invoice.payments || []} totalAmount={pdfTotal} invoiceId={invoice.id} />

      <Card>
        <CardHeader>
            <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Version History</CardTitle>
            </div>
        </CardHeader>
        <CardContent>
            {invoice.versions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No history available for this invoice.</p>
            ) : (
                <ScrollArea className="h-[200px] w-full pr-4">
                    <div className="space-y-4">
                        {invoice.versions.map((version) => (
                            <div key={version.id} className="flex items-start justify-between border-b pb-4 last:border-0">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-sm">Version {version.versionNumber}</span>
                                        <Badge variant="outline" className="text-xs">{formatDate(version.createdAt)}</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">{version.reason || "Update"}</p>
                                </div>
                                <Button variant="ghost" size="sm" disabled>
                                    <FileClock className="h-3 w-3 mr-1" />
                                    View Snapshot
                                </Button>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            )}
        </CardContent>
      </Card>

      {/* Payment Details Footer */}
      {(paymentSettings?.upiEnabled || paymentSettings?.bankEnabled || (paymentSettings?.razorpayEnabled && paymentSettings?.razorpayButtonId && !isPaid)) && (
          <div className="bg-gray-50 px-10 py-6 border border-gray-200 rounded-lg flex gap-8">
                {paymentSettings?.upiEnabled && paymentSettings.upiId && (
                    <div className="flex items-center gap-4">
                        <div className="bg-white p-2 rounded shadow-sm">
                            <UPIQr 
                                upiId={paymentSettings.upiId} 
                                amount={balanceDue > 0 ? balanceDue : undefined}
                                payeeName={paymentSettings.upiPayeeName || ""}
                                size={80}
                            />
                        </div>
                        <div className="text-xs text-gray-600">
                            <p className="font-bold text-gray-900 mb-1">Scan to Pay</p>
                            <p>UPI ID: {paymentSettings.upiId}</p>
                            {paymentSettings.upiPayeeName && <p>Payee: {paymentSettings.upiPayeeName}</p>}
                        </div>
                    </div>
                )}

                {paymentSettings?.bankEnabled && (
                    <div className="text-xs text-gray-600 border-l border-gray-200 pl-8">
                        <p className="font-bold text-gray-900 mb-1 uppercase tracking-wide">Bank Details</p>
                        <div className="space-y-0.5">
                            <p><span className="font-medium">Bank:</span> {paymentSettings.bankName}</p>
                            <p><span className="font-medium">A/C No:</span> {paymentSettings.accountNumber}</p>
                            <p><span className="font-medium">IFSC:</span> {paymentSettings.ifscCode}</p>
                            <p><span className="font-medium">Name:</span> {paymentSettings.accountHolder}</p>
                        </div>
                    </div>
                )}
          </div>
      )}
    </div>
  );
}
