import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { getInvoiceDisplayDate } from "@/lib/invoice-date";
import { selfHealInvoicePaymentOnLoad } from "@/lib/invoice-billing";
import { aggregateInvoicePayments, getPaymentMethodLabel } from "@/lib/payment-breakdown";
import { computeInvoiceGst } from "@/lib/invoice-gst";
import { sanitizeNumberText } from "@/lib/number-formatting";
import type { InvoiceData } from "@/lib/invoice-generator";

type PrismaRecord = Record<string, unknown>;
type PackagingSettingsRow = { categoryHsnJson?: string | null };
type PackagingSettingsDelegate = {
  findFirst: (args?: PrismaRecord) => Promise<PackagingSettingsRow | null>;
};
type PackagingPrismaClient = typeof prisma & { gpisSettings: PackagingSettingsDelegate };
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

/**
 * Build the canonical InvoiceData for an invoice — identical to the invoice
 * page's download PDF, so email attachments match the ERP download exactly.
 */
export async function buildInvoiceData(invoiceId: string): Promise<InvoiceData | null> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      sales: { include: { inventory: { include: { certificates: true } }, customer: true } },
      legacySale: { include: { inventory: { include: { certificates: true } }, customer: true } },
      quotation: { include: { customer: true } },
      versions: { orderBy: { versionNumber: "desc" } },
      payments: { orderBy: { date: "desc" } },
    },
  });
  if (!invoice) return null;

  const salesItems = invoice.sales.length > 0 ? invoice.sales : (invoice.legacySale ? [invoice.legacySale] : []);
  const primarySale = salesItems[0];
  if (!primarySale) return null;

  const linkedCustomer = primarySale.customer ?? invoice.quotation?.customer ?? null;
  const resolvedCustomer = {
    name: linkedCustomer?.name || primarySale.customerName || "Walk-in Customer",
    email: linkedCustomer?.email || primarySale.customerEmail || "",
    phone: linkedCustomer?.phone || primarySale.customerPhone || "",
    city: linkedCustomer?.city || primarySale.customerCity || "",
    address: linkedCustomer?.address || primarySale.customerAddress || "",
  };

  const subtotal = salesItems.reduce((sum, item) => sum + item.salePrice, 0);
  const baseDiscount = salesItems.reduce((sum, item) => sum + (item.discountAmount || 0), 0);
  const gstAmount = salesItems.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
  const total = subtotal - baseDiscount + gstAmount;

  const allPaid = salesItems.every((s) => s.paymentStatus === "PAID");
  let paymentStatus = invoice.paymentStatus;
  if (paymentStatus === "UNPAID" && allPaid && salesItems.length > 0) {
    paymentStatus = "PAID";
  }

  const finalTotalAmount = invoice.totalAmount > 0 ? invoice.totalAmount : total;
  const paymentSummary = aggregateInvoicePayments(invoice.payments || []);
  let amountPaid = paymentSummary.rows.length > 0 ? paymentSummary.netReceived : (invoice.paidAmount || 0);
  if (paymentStatus === "PAID" && amountPaid === 0) {
    amountPaid = finalTotalAmount;
  }
  let balanceDue = Math.max(0, finalTotalAmount - amountPaid);

  const companySettings = await prisma.companySettings.findFirst();
  const invoiceSettings = await prisma.invoiceSettings.findFirst();
  const paymentSettings = await prisma.paymentSettings.findFirst();
  const packagingSettings = await packagingPrisma.gpisSettings.findFirst();
  const categoryHsnMap = parseCategoryHsnJson(packagingSettings?.categoryHsnJson);
  // Prefer PNG logo URLs (node-canvas can't decode WebP server-side).
  const displayLogo = companySettings?.invoiceLogoUrl || companySettings?.logoUrl || companySettings?.quotationLogoUrl;

  let gstRates: Record<string, string> = {};
  try {
    if (invoiceSettings?.categoryGstRates) {
      gstRates = JSON.parse(invoiceSettings.categoryGstRates);
    }
  } catch {}

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

  const gstCalc = computeInvoiceGst({ items: salesItems, gstRates, displayOptions });
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
  const couponDiscountRows = await prisma.$queryRawUnsafe<Array<{ amt: number }>>(
    `SELECT COALESCE(SUM(discountAmount),0) as amt FROM "CouponRedemption" WHERE invoiceId = ?`,
    invoice.id
  ).catch(() => []);
  const couponDiscountTotal = Number(couponDiscountRows?.[0]?.amt || 0);
  const pdfTotalWithoutCoupon = totalBeforeExtras + (Number.isFinite(shippingCharge) ? shippingCharge : 0) + (Number.isFinite(additionalCharge) ? additionalCharge : 0);
  const pdfTotal = Math.max(0, pdfTotalWithoutCoupon - couponDiscountTotal);
  const discount = gstCalc.discountTotal;
  const healResult = await selfHealInvoicePaymentOnLoad({
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    persistedTotalAmount: invoice.totalAmount || 0,
    computedTotalAmount: pdfTotal,
    paidAmount: amountPaid,
    currentPaymentStatus: invoice.paymentStatus || paymentStatus,
    currentStatus: invoice.status || "ISSUED",
  });
  paymentStatus = healResult.paymentStatus;
  balanceDue = healResult.balanceDue;

  const paymentBreakdownRows = (() => {
    const map = new Map<string, { method: string; amount: number }>();
    for (const p of invoice.payments || []) {
      const method = String(p.method || "OTHER");
      const ref = String(p.reference || "").trim();
      const label = method === "CREDIT_NOTE" && ref ? `${getPaymentMethodLabel(method)} ${ref}` : getPaymentMethodLabel(method);
      const key = method === "CREDIT_NOTE" && ref ? `${method}:${ref}` : method;
      const existing = map.get(key) || { method: label, amount: 0 };
      existing.amount += Number(p.amount || 0);
      map.set(key, existing);
    }
    return Array.from(map.values())
      .filter((row) => Math.abs(row.amount) > 0.009)
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  })();
  const latestPaymentDate = (invoice.payments || []).slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.date;
  const isExportInvoice = invoice.invoiceType === "EXPORT_INVOICE" || invoice.invoiceType === "EXPORT";
  const isReplacement = invoice.status === "REPLACEMENT" || paymentStatus === "REPLACEMENT";

  const creditNotes = await prisma.$queryRawUnsafe<
    Array<{ id: string; creditNoteNumber: string; issueDate: string; activeUntil: string | null; totalAmount: number; balanceAmount: number; isActive: number }>
  >(
    `SELECT id, creditNoteNumber, issueDate, activeUntil, totalAmount, balanceAmount, isActive
     FROM CreditNote WHERE invoiceId = ? ORDER BY issueDate DESC LIMIT 50`,
    invoice.id
  ).catch(() => []);
  const creditNoteText = (creditNotes || [])
    .filter((cn) => (cn.creditNoteNumber || "").trim())
    .map((cn) => {
      const totalText = sanitizeNumberText(formatCurrency(Number(cn.totalAmount || 0)).replace("₹", "Rs. "));
      const balText = sanitizeNumberText(formatCurrency(Number(cn.balanceAmount || 0)).replace("₹", "Rs. "));
      return `${cn.creditNoteNumber} (Total ${totalText}, Balance ${balText})`;
    })
    .join(", ");

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
    invoiceType: isExportInvoice ? "EXPORT_INVOICE" : "TAX_INVOICE",
    invoiceCurrency: (invoice.invoiceCurrency || companySettings?.defaultCurrency || "INR") as "INR" | "USD" | "EUR" | "GBP",
    conversionRate: invoice.conversionRate || undefined,
    totalInrValue: invoice.totalInrValue || undefined,
    iecCode: invoice.iecCode || companySettings?.companyIec || undefined,
    exportType: invoice.exportType as "LUT" | "BOND" | "PAYMENT" | "DDP" | undefined,
    countryOfDestination: invoice.countryOfDestination || undefined,
    portOfDispatch: invoice.portOfDispatch || undefined,
    modeOfTransport: invoice.modeOfTransport as "AIR" | "COURIER" | "HAND_DELIVERY" | undefined,
    courierPartner: invoice.courierPartner || undefined,
    trackingId: invoice.trackingId || undefined,
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
      name: resolvedCustomer.name,
      customerCode: customerCode || undefined,
      address: resolvedCustomer.address || resolvedCustomer.city || "",
      phone: resolvedCustomer.phone,
      email: resolvedCustomer.email,
    },
    billingAddress: (primarySale as { billingAddress?: string | null }).billingAddress || resolvedCustomer.address || resolvedCustomer.city || "",
    shippingAddress: (primarySale as { shippingAddress?: string | null }).shippingAddress || (primarySale as { billingAddress?: string | null }).billingAddress || resolvedCustomer.address || resolvedCustomer.city || "",
    placeOfSupply: (primarySale as { placeOfSupply?: string | null }).placeOfSupply || resolvedCustomer.city || resolvedCustomer.address || "-",
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
          : item.inventory.pricingMode === "PER_RATTI"
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
        usdPrice: isExportInvoice ? (item.usdPrice || 0) : undefined,
        gstRate: item.gstRate,
        gstAmount: item.calculatedGst,
        total: item.finalTotal,
        discountAmount: item.discountAmount || 0,
      };
    }),
    grossTotal: gstCalc.grossTotal,
    subtotal: subtotalBase,
    discount: discount + couponDiscountTotal,
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
    exportTerms: invoiceSettings?.exportTerms || undefined,
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
      : undefined,
  };

  return pdfData;
}
