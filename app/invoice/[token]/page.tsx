import { ensureBillfreePhase1Schema, prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ensureReturnsSchema } from "@/lib/returns-schema-ensure";
import { sanitizeNumberText } from "@/lib/number-formatting";
import { getInvoiceDisplayDate } from "@/lib/invoice-date";
import { buildInvoiceWhatsappLink } from "@/lib/whatsapp";
import { Share2 } from "lucide-react";
import { PrintButton } from "@/components/invoice/print-button";
import { RazorpayButton } from "@/components/invoice/razorpay-button";
import { DownloadPdfButton } from "@/components/invoice/download-pdf-button";
import { UPIQr } from "@/components/invoice/upi-qr";
import { InvoiceData } from "@/lib/invoice-generator";
import { selfHealInvoicePaymentOnLoad } from "@/lib/invoice-billing";
import { aggregateInvoicePayments, getPaymentMethodLabel } from "@/lib/payment-breakdown";
import { computeInvoiceGst } from "@/lib/invoice-gst";
import type { Metadata } from "next";
import { trackPublicView } from "@/lib/analytics";
import { InvoiceEngagementCard } from "@/components/invoice/invoice-engagement-card";

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

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function PublicInvoicePage({ params, searchParams }: { params: Promise<{ token: string }>, searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { token } = await params;
  await ensureReturnsSchema();
  await ensureBillfreePhase1Schema();
  const sp = await searchParams;

  const invoice = await prisma.invoice.findUnique({
    where: { token },
    include: {
      sales: {
        include: { inventory: { include: { certificates: true, rashis: true } } }
      },
      payments: true,
      legacySale: {
        include: { inventory: { include: { certificates: true, rashis: true } } }
      },
      quotation: {
        include: {
          customer: true
        }
      }
    }
  });

  if (!invoice) notFound();

  // Track View
  await trackPublicView("INVOICE_VIEW", invoice.id, invoice.invoiceNumber, sp);

  const packagingSettings = await packagingPrisma.gpisSettings.findFirst();
  const categoryHsnMap = parseCategoryHsnJson(packagingSettings?.categoryHsnJson);

  // Parse Display Options
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
    } catch (e) {
      console.error("Failed to parse display options", e);
    }
  }

  // Normalize sales data
  const salesItems = invoice.sales && invoice.sales.length > 0 
    ? invoice.sales 
    : (invoice.legacySale ? [invoice.legacySale] : []);

  if (salesItems.length === 0) {
      return <div className="p-8 text-center text-red-500">Invalid Invoice: No linked sales found.</div>;
  }
  
  const primarySale = salesItems[0];

  if (!invoice.isActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <h1 className="text-2xl font-bold text-red-600">Invoice Link Disabled</h1>
      </div>
    );
  }

  const companySettings = await prisma.companySettings.findFirst();
  const paymentSettings = await prisma.paymentSettings.findFirst();
  
  // Defensive check for stale Prisma client
  const invoiceSettings = await prisma.invoiceSettings.findFirst();

  const displayLogo = companySettings?.invoiceLogoUrl || companySettings?.logoUrl;
  
  // Parse GST Rates
  let gstRates: Record<string, string> = {};
  try {
    if (invoiceSettings?.categoryGstRates) {
      gstRates = JSON.parse(invoiceSettings.categoryGstRates);
    }
  } catch (e) {
    console.error("Failed to parse GST rates", e);
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
  const couponDiscountRows = await prisma.$queryRawUnsafe<Array<{ amt: number }>>(
    `SELECT COALESCE(SUM(discountAmount),0) as amt FROM "CouponRedemption" WHERE invoiceId = ?`,
    invoice.id
  ).catch(() => []);
  const couponDiscountTotal = Number(couponDiscountRows?.[0]?.amt || 0);
  const totalWithoutCoupon = totalBeforeExtras + (Number.isFinite(shippingCharge) ? shippingCharge : 0) + (Number.isFinite(additionalCharge) ? additionalCharge : 0);
  const total = Math.max(0, totalWithoutCoupon - couponDiscountTotal);
  const discount = gstCalc.discountTotal;
  
  // Balance Due & Payment Status Calculation
  const amountPaidCalculated = salesItems.reduce((sum, item) => {
    if (item.paymentStatus === "PAID") return sum + (item.netAmount || item.salePrice);
    if (item.paymentStatus === "PARTIAL") {
      // Partial payment amount not currently tracked in Sale model
      return sum;
    }
    return sum;
  }, 0);

  const paymentSummary = aggregateInvoicePayments(invoice.payments || []);
  const amountReceived = paymentSummary.rows.length > 0
    ? paymentSummary.netReceived
    : (invoice.paidAmount && invoice.paidAmount > 0)
    ? invoice.paidAmount
    : amountPaidCalculated;
  let balanceDue = Math.max(0, total - amountReceived);
  let paymentStatus = "UNPAID";
  if (amountReceived >= total - 0.01) {
    paymentStatus = "PAID";
  } else if (amountReceived > 0) {
    paymentStatus = "PARTIAL";
  }
  const healResult = await selfHealInvoicePaymentOnLoad({
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    persistedTotalAmount: invoice.totalAmount || 0,
    computedTotalAmount: total,
    paidAmount: amountReceived,
    currentPaymentStatus: invoice.paymentStatus || "UNPAID",
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
  const isPaid = paymentStatus === "PAID";
  const isReplacement = invoice.status === "REPLACEMENT" || paymentStatus === "REPLACEMENT";

  const isOriginal = true; 
  const statusLabel = isOriginal ? "ORIGINAL INVOICE" : "DUPLICATE INVOICE";

  const invoiceUrl = `${process.env.APP_BASE_URL}/invoice/${token}`;
  const whatsappLink = buildInvoiceWhatsappLink({
      invoiceUrl,
      invoiceNumber: invoice.invoiceNumber
  });

  const creditNotes = await (async () => {
    try {
      return await prisma.$queryRawUnsafe<
        Array<{
          creditNoteNumber: string;
          issueDate: string;
          activeUntil: string | null;
          totalAmount: number;
          balanceAmount: number;
          isActive: number;
        }>
      >(
        `SELECT creditNoteNumber, issueDate, activeUntil, totalAmount, balanceAmount, isActive
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
  const displayPaymentStatus = creditNoteText ? `${paymentStatus} (CN Issued)` : paymentStatus;

  // Customer Details (Fallback Logic)
  const customerName = primarySale.customerName || invoice.quotation?.customer?.name || "Walk-in Customer";
  const customerAddress = primarySale.customerAddress || invoice.quotation?.customer?.address || primarySale.customerCity || invoice.quotation?.customer?.city || "";
  const billingAddress = (primarySale as { billingAddress?: string | null }).billingAddress || primarySale.customerAddress || customerAddress;
  const shippingAddress = (primarySale as { shippingAddress?: string | null }).shippingAddress || billingAddress;
  const placeOfSupply = (primarySale as { placeOfSupply?: string | null }).placeOfSupply || primarySale.customerCity || invoice.quotation?.customer?.city || billingAddress || "-";
  const customerPhone = primarySale.customerPhone || invoice.quotation?.customer?.phone || "";
  const customerEmail = primarySale.customerEmail || invoice.quotation?.customer?.email || "";
  const customerId = primarySale.customerId || invoice.quotation?.customerId || null;
  const customerCode = await (async () => {
    try {
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

  const nowIso = new Date().toISOString();
  const activeBanners = await prisma.$queryRawUnsafe<
    Array<{ id: string; title: string; subtitle: string | null; imageUrl: string | null; ctaText: string | null; ctaLink: string | null }>
  >(
    `SELECT id, title, subtitle, imageUrl, ctaText, ctaLink
     FROM "OfferBanner"
     WHERE isActive = 1
       AND displayOn IN ('invoice', 'public')
       AND (startDate IS NULL OR startDate <= ?)
       AND (endDate IS NULL OR endDate >= ?)
     ORDER BY priority DESC, createdAt DESC
     LIMIT 5`,
    nowIso,
    nowIso
  ).catch(() => []);

  const profileExtra = customerId
    ? await prisma.$queryRawUnsafe<Array<{ dateOfBirth: string | null; anniversaryDate: string | null }>>(
        `SELECT dateOfBirth, anniversaryDate FROM "CustomerProfileExtra" WHERE customerId = ? LIMIT 1`,
        customerId
      ).catch(() => [])
    : [];
  const extra = profileExtra?.[0];
  const missingDob = customerId ? !extra?.dateOfBirth : false;
  const missingAnniversary = customerId ? !extra?.anniversaryDate : false;

  const loyaltySnapshot = customerId
    ? await prisma.$queryRawUnsafe<Array<{ points: number; rupeeValue: number }>>(
        `SELECT COALESCE(SUM(points),0) as points, COALESCE(SUM(rupeeValue),0) as rupeeValue
         FROM "LoyaltyLedger" WHERE customerId = ?`,
        customerId
      ).catch(() => [])
    : [];
  const loyaltyThisInvoice = await prisma.$queryRawUnsafe<Array<{ earnedPoints: number; redeemedValue: number }>>(
    `SELECT
      COALESCE(SUM(CASE WHEN type='EARN' THEN points ELSE 0 END),0) as earnedPoints,
      COALESCE(SUM(CASE WHEN type='REDEEM' THEN rupeeValue ELSE 0 END),0) as redeemedValue
     FROM "LoyaltyLedger" WHERE invoiceId = ?`,
    invoice.id
  ).catch(() => []);
  const loyalty = {
    balancePoints: Number(loyaltySnapshot?.[0]?.points || 0),
    balanceValue: Number(loyaltySnapshot?.[0]?.rupeeValue || 0),
    earnedPointsThisInvoice: Number(loyaltyThisInvoice?.[0]?.earnedPoints || 0),
    redeemedValueThisInvoice: Number(loyaltyThisInvoice?.[0]?.redeemedValue || 0),
  };

  const couponApplied = await prisma.$queryRawUnsafe<Array<{ code: string; discountAmount: number }>>(
    `SELECT c.code as code, COALESCE(r.discountAmount,0) as discountAmount
     FROM "CouponRedemption" r
     JOIN "Coupon" c ON c.id = r.couponId
     WHERE r.invoiceId = ?
     ORDER BY r.redeemedAt DESC
     LIMIT 1`,
    invoice.id
  ).catch(() => []);
  const appliedCoupon = couponApplied?.[0]
    ? { code: String(couponApplied[0].code), discountAmount: Number(couponApplied[0].discountAmount || 0) }
    : null;

  // Construct InvoiceData for PDF
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
      name: customerName,
      customerCode: customerCode || undefined,
      address: customerAddress,
      phone: customerPhone,
      email: customerEmail,
    },
    billingAddress,
    shippingAddress,
    placeOfSupply,
    items: processedItems.map((item) => {
      const descriptionParts: string[] = [];
      descriptionParts.push(item.inventory.itemName);

      const details: string[] = [];
      if (displayOptions.showWeight) {
        const unit = item.inventory.weightUnit || "cts";
        const label = unit.toLowerCase().includes("ct") ? "Carat" : "Weight";
        details.push(`${label}: ${item.inventory.weightValue} ${unit}`);
      }
      if (displayOptions.showRatti && item.inventory.weightRatti) {
        details.push(`Ratti: ${item.inventory.weightRatti}`);
      }
      if (displayOptions.showCertificates) {
        const provider = item.inventory.certificates && item.inventory.certificates.length > 0
          ? item.inventory.certificates.map((c) => (c.remarks ? `${c.name} (${c.remarks})` : c.name)).join(", ")
          : (item.inventory.certification || item.inventory.certificateLab || item.inventory.lab || "");
        const certNoRaw = item.inventory.certificateNumber || item.inventory.certificateNo || "";
        const certNo = typeof certNoRaw === "string" ? certNoRaw.trim() : "";
        const text = provider && certNo ? `Cert: ${provider} #${certNo}` : certNo ? `Cert No: ${certNo}` : provider ? `Cert: ${provider}` : "";
        if (text) details.push(text);
      }
      if (displayOptions.showPrice) {
        const rateValue = item.inventory.pricingMode === "PER_CARAT"
          ? item.inventory.sellingRatePerCarat
          : item.inventory.flatSellingPrice;
        const rateFallback = rateValue ?? item.basePrice ?? 0;
        details.push(`Rate: Rs. ${Number(rateFallback || 0).toFixed(2)}`);
      }
      if (details.length > 0) {
        descriptionParts.push(details.join(" | "));
      }

      const hsn = item.inventory.category ? categoryHsnMap[item.inventory.category] : undefined;
      const qtyLabel = item.inventory.weightRatti
        ? `${item.inventory.weightRatti} Ratti`
        : item.inventory.weightValue
        ? `${item.inventory.weightValue} ${item.inventory.weightUnit}`
        : "1";
      return {
        sku: displayOptions.showSku ? item.inventory.sku : "",
        hsn,
        description: descriptionParts.join("\n"),
        quantity: 1,
        displayQty: qtyLabel,
        unitPrice: displayOptions.showPrice ? item.basePrice : 0, // Should we hide price value too? Usually invoice needs totals. User said "what information to b visible on the invoice". If they uncheck price, maybe they want a delivery challan style? But this is an invoice. Let's assume showPrice controls the *rate details* description mostly, but for columns, if showPrice is false, maybe we should hide the columns? But the PDF generator expects numbers.
        // If showPrice is false, it's weird for an invoice. I will keep the totals but maybe hide the rate details in description as I did above.
        // Actually, if showPrice is false, the user might want a "Delivery Challan" or "Memo" look. 
        // For now, I will respect showPrice for the unit price and total columns in the UI. For PDF data, it's strictly typed.
        // Let's assume showPrice controls the "Rate: .../ct" line and maybe the SKU visibility if requested.
        // But wait, I added showPrice to options.
        // If showPrice is false, I will pass 0 or empty string where possible, but PDF generator needs numbers for calculations.
        // Let's stick to description modification for now. The invoice *must* have totals to be a valid invoice.
        gstRate: item.gstRate,
        gstAmount: item.calculatedGst,
        total: item.finalTotal // Show Final Total (Inclusive - Discount)
      };
    }),
    grossTotal: gstCalc.grossTotal,
    subtotal: subtotalBase, // Show Base Subtotal
    discount: discount + couponDiscountTotal,
    tax: totalGst,
    shippingCharge: Number.isFinite(shippingCharge) ? shippingCharge : 0,
    additionalCharge: Number.isFinite(additionalCharge) ? additionalCharge : 0,
    total: isReplacement ? 0 : total,
    amountPaid: isReplacement ? 0 : amountReceived,
    balanceDue: isReplacement ? 0 : balanceDue,
    status: isReplacement ? "REPLACEMENT" : statusLabel,
    paymentStatus: isReplacement ? "REPLACEMENT" : displayPaymentStatus,
    paymentMethod: isReplacement ? undefined : (paymentBreakdownRows.length === 1 ? paymentBreakdownRows[0].method : (primarySale.paymentMethod || undefined)),
    paidAt: isReplacement ? undefined : (latestPaymentDate || primarySale.saleDate || undefined),
    paymentBreakdown: isReplacement ? [] : paymentBreakdownRows,
    terms: invoiceSettings?.terms || undefined,
    notes: [invoiceSettings?.footerNotes, invoice.notes || "", creditNoteText ? `Credit Note(s): ${creditNoteText}` : ""].filter(Boolean).join("\n") || undefined,
    signatureUrl: invoiceSettings?.digitalSignatureUrl || undefined,
    upiQrData: !isReplacement && paymentSettings?.upiEnabled && paymentSettings?.upiId ? 
      `upi://pay?pa=${paymentSettings.upiId}&pn=${encodeURIComponent(paymentSettings.upiPayeeName || "")}&am=${balanceDue.toFixed(2)}&cu=INR` : undefined,
    bankDetails: isReplacement ? undefined : (paymentSettings?.bankEnabled ? {
      bankName: paymentSettings.bankName || "",
      accountNumber: paymentSettings.accountNumber || "",
      ifsc: paymentSettings.ifscCode || "",
      holder: paymentSettings.accountHolder || "",
    } : undefined)
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white py-8 px-4 print:py-0 print:px-0 print:bg-white">
        <div className="max-w-5xl mx-auto bg-white shadow-2xl rounded-2xl border border-slate-200/70 overflow-hidden print:shadow-none print:rounded-none print:border-0 relative print:w-full">
            
            {/* Watermark for Paid */}
            {isPaid && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden opacity-10">
                 <div className="border-10 border-green-600 text-green-600 text-[10rem] font-black -rotate-45 px-12 py-4 rounded-xl">
                    PAID
                 </div>
              </div>
            )}

            {/* Top Action Bar */}
            <div className="bg-slate-900 text-white px-8 py-4 flex justify-between items-center print:hidden relative z-10">
                <div className="text-sm font-medium opacity-90 inline-flex items-center gap-2">
                    <span className="text-slate-300">Status</span>
                    <span className={isPaid ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>{displayPaymentStatus}</span>
                </div>
                <div className="flex gap-3">
                    <a 
                        href={whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1.5 bg-[#25D366] text-white text-xs font-medium rounded hover:bg-[#128C7E] transition-colors"
                    >
                        <Share2 className="w-3.5 h-3.5 mr-1.5" />
                        WhatsApp
                    </a>
                    <DownloadPdfButton data={pdfData} />
                    <PrintButton />
                </div>
            </div>

            <InvoiceEngagementCard
              token={token}
              customerName={customerName}
              banners={activeBanners || []}
              loyalty={loyalty}
              coupon={appliedCoupon}
              canCaptureProfile={Boolean(customerId)}
              missingDob={missingDob}
              missingAnniversary={missingAnniversary}
            />

            {/* Header */}
            <div className="p-10 pb-8 flex justify-between items-start relative z-10 border-b border-slate-100">
                <div className="space-y-2">
                    {displayLogo && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                            src={displayLogo} 
                            alt="Logo" 
                            className="h-16 w-auto object-contain mb-4"
                        />
                    )}
                    <h2 className="font-bold text-2xl text-slate-900 leading-none">{companySettings?.companyName}</h2>
                    <div className="text-sm text-gray-600 space-y-1">
                        <p>{companySettings?.address}</p>
                        <p>{companySettings?.email} • {companySettings?.phone}</p>
                        {companySettings?.gstin && <p className="font-medium text-gray-800">GSTIN: {companySettings.gstin}</p>}
                    </div>
                </div>
                <div className="text-right rounded-xl border border-slate-200 bg-slate-50 px-6 py-4 min-w-[220px]">
                    <h1 className="text-3xl font-light text-slate-300 tracking-tight">INVOICE</h1>
                    <div className="mt-3 space-y-1">
                        <p className="text-lg font-bold text-slate-900">#{invoice.invoiceNumber}</p>
                        <p className="text-sm text-slate-500">{formatDate(getInvoiceDisplayDate(invoice))}</p>
                        <div className="pt-2">
                             <span className="px-2 py-1 bg-white text-slate-700 text-[10px] font-bold uppercase tracking-wider rounded border border-slate-200">
                                {statusLabel}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bill To */}
            <div className="px-10 py-6 bg-slate-50/70 border-y border-slate-100 grid md:grid-cols-2 gap-6 relative z-10">
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Bill To</h3>
                    <div className="text-gray-900 font-medium text-lg">{customerName}</div>
                    <div className="text-sm text-gray-600 mt-1 space-y-0.5">
                        {customerAddress && <p className="whitespace-pre-wrap break-words">{customerAddress}</p>}
                        {customerPhone && <p>{customerPhone}</p>}
                        {customerEmail && <p>{customerEmail}</p>}
                    </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4 text-right">
                     <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Reference</h3>
                     <p className="text-sm font-mono text-gray-600">{primarySale.id.substring(0, 8).toUpperCase()}</p>
                </div>
            </div>

            {/* Items */}
            <div className="p-10 relative z-10">
                <table className="w-full text-left rounded-xl overflow-hidden">
                    <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                            <th className="py-3 px-3 text-xs font-bold text-slate-900 uppercase tracking-widest w-1/2">Item</th>
                            <th className="py-3 px-3 text-xs font-bold text-slate-900 uppercase tracking-widest text-right">Base Price</th>
                            <th className="py-3 px-3 text-xs font-bold text-slate-900 uppercase tracking-widest text-right">GST</th>
                            <th className="py-3 px-3 text-xs font-bold text-slate-900 uppercase tracking-widest text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {processedItems.map((item) => (
                          <tr key={item.id}>
                            <td className="py-4 px-3">
                                <p className="font-bold text-gray-900">{item.inventory.itemName}</p>
                                <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-1">
                                    {displayOptions.showSku && (
                                        <span>SKU: <span className="font-mono">{item.inventory.sku}</span></span>
                                    )}
                                    
                                    {displayOptions.showWeight && (
                                        <>
                                            {displayOptions.showSku && <span>•</span>}
                                            <span>{item.inventory.weightValue} {item.inventory.weightUnit}</span>
                                        </>
                                    )}

                                    {displayOptions.showRatti && item.inventory.weightRatti && (
                                        <><span>•</span><span>Ratti: {item.inventory.weightRatti}</span></>
                                    )}

                                    {displayOptions.showDimensions && (item.inventory.dimensionsMm || item.inventory.measurements) && (
                                        <><span>•</span><span>Dim: {item.inventory.dimensionsMm || item.inventory.measurements}</span></>
                                    )}
                                    
                                    {displayOptions.showGemType && item.inventory.gemType && (
                                        <><span>•</span><span>{item.inventory.gemType}</span></>
                                    )}
                                    
                                    {displayOptions.showCategory && item.inventory.category && (
                                        <><span>•</span><span>{item.inventory.category}</span></>
                                    )}

                                    {displayOptions.showColor && item.inventory.color && (
                                        <><span>•</span><span>Color: {item.inventory.color}</span></>
                                    )}

                                    {displayOptions.showShape && item.inventory.shape && (
                                        <><span>•</span><span>{item.inventory.shape}</span></>
                                    )}

                                    {displayOptions.showRashi && item.inventory.rashis && item.inventory.rashis.length > 0 && (
                                        <><span>•</span><span>Rashi: {item.inventory.rashis.map(r => r.name).join(", ")}</span></>
                                    )}

                                    {displayOptions.showCertificates && (() => {
                                      const provider = item.inventory.certificates && item.inventory.certificates.length > 0
                                        ? item.inventory.certificates.map(c => c.remarks ? `${c.name} (${c.remarks})` : c.name).join(", ")
                                        : (item.inventory.certification || item.inventory.certificateLab || item.inventory.lab || "");
                                      const certNoRaw = item.inventory.certificateNumber || item.inventory.certificateNo || "";
                                      const certNo = typeof certNoRaw === "string" ? certNoRaw.trim() : "";
                                      const text = provider && certNo ? `Cert: ${provider} #${certNo}` : certNo ? `Cert No: ${certNo}` : provider ? `Cert: ${provider}` : "";
                                      if (!text) return null;
                                      return <><span>•</span><span>{text}</span></>;
                                    })()}
                                </div>
                                {/* Pricing Details */}
                                {displayOptions.showPrice && (
                                <div className="text-xs text-gray-500 mt-0.5">
                                    {item.inventory.pricingMode === "PER_CARAT" ? (
                                        <span>
                                            Rate: {formatCurrency(item.inventory.sellingRatePerCarat || 0)}
                                        </span>
                                    ) : (
                                        <span>Flat Price</span>
                                    )}
                                </div>
                                )}
                            </td>
                            <td className="py-4 px-3 text-right text-gray-600 align-top">
                                {formatCurrency(item.basePrice)}
                            </td>
                            <td className="py-4 px-3 text-right text-gray-600 align-top">
                                <div className="flex flex-col items-end">
                                    <span>{formatCurrency(item.calculatedGst)}</span>
                                    <span className="text-[10px] text-gray-400">({item.gstRate}%)</span>
                                </div>
                            </td>
                            <td className="py-4 px-3 text-right font-semibold text-gray-900 align-top">
                                {formatCurrency(item.finalTotal)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                </table>

                {/* Totals */}
                <div className="mt-8 flex justify-end">
                    <div className="w-72 space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                        {discount > 0 && (
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Gross Total</span>
                                <span>{formatCurrency(gstCalc.grossTotal)}</span>
                            </div>
                        )}
                        {discount > 0 && (
                            <div className="flex justify-between text-sm text-red-600">
                                <span>Discount</span>
                                <span>-{formatCurrency(discount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>Taxable Amount</span>
                            <span>{formatCurrency(subtotalBase)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>Total GST</span>
                            <span>{formatCurrency(totalGst)}</span>
                        </div>
                        {couponDiscountTotal > 0 ? (
                          <div className="flex justify-between text-sm text-indigo-600">
                            <span>Coupon Discount</span>
                            <span>-{formatCurrency(couponDiscountTotal)}</span>
                          </div>
                        ) : null}
                        <div className="border-t border-slate-900 pt-3 flex justify-between items-end">
                            <span className="text-sm font-bold text-gray-900 uppercase">Total</span>
                            <span className="text-2xl font-bold text-gray-900">{formatCurrency(total)}</span>
                        </div>
                        
                        {/* Received / Pending */}
                        <div className="pt-4 space-y-2 border-t border-dashed border-gray-200">
                             <div className="flex justify-between text-sm text-green-600 font-medium">
                                <span>Received Amount</span>
                                <span>{formatCurrency(amountReceived)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-red-600 font-medium">
                                <span>Pending Amount</span>
                                <span>{formatCurrency(balanceDue)}</span>
                            </div>
                            {paymentBreakdownRows.length > 0 && (
                              <div className="pt-2 border-t border-dashed border-gray-200 space-y-1">
                                <div className="text-xs font-semibold text-gray-700">Payment Breakdown</div>
                                {paymentBreakdownRows.map((row) => (
                                  <div key={`${row.method}-${row.amount}`} className="flex justify-between text-xs text-gray-600">
                                    <span>{row.method}</span>
                                    <span>{row.amount < 0 ? "-" : ""}{formatCurrency(Math.abs(row.amount))}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Terms and Signature */}
                <div className="mt-12 grid grid-cols-2 gap-8 border-t border-slate-100 pt-8">
                    <div>
                        {invoiceSettings?.terms && (
                            <div className="mb-6">
                                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-2">Terms & Conditions</h4>
                                <p className="text-xs text-gray-500 whitespace-pre-line leading-relaxed">{invoiceSettings.terms}</p>
                            </div>
                        )}
                        {invoiceSettings?.footerNotes && (
                             <div>
                                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-2">Notes</h4>
                                <p className="text-xs text-gray-500 whitespace-pre-line leading-relaxed">{invoiceSettings.footerNotes}</p>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex flex-col items-end justify-end text-center">
                        {invoiceSettings?.digitalSignatureUrl && (
                             // eslint-disable-next-line @next/next/no-img-element
                             <img 
                                src={invoiceSettings.digitalSignatureUrl} 
                                alt="Authorized Signatory" 
                                className="h-16 object-contain mb-2"
                             />
                        )}
                        <p className="text-xs font-bold text-gray-900 uppercase tracking-widest">Authorized Signatory</p>
                        <p className="text-[10px] text-gray-400 mt-1">For {companySettings?.companyName}</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 pt-8 border-t border-slate-100 text-center">
                    <p className="text-xs text-gray-400">Thank you for your business</p>
                </div>
            </div>
            
             {/* Payment Details Footer (Print/PDF only mostly, but visible here too) */}
             {(paymentSettings?.upiEnabled || paymentSettings?.bankEnabled || (paymentSettings?.razorpayEnabled && paymentSettings?.razorpayButtonId && !isPaid)) && (
                <div className="bg-slate-50 px-10 py-6 border-t border-slate-200 flex gap-8">
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
                             </div>
                         </div>
                     )}
                     
                     {paymentSettings?.bankEnabled && (
                         <div className="text-xs text-gray-600 border-l border-gray-200 pl-8">
                             <p className="font-bold text-gray-900 mb-2">Bank Transfer Details</p>
                             <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                                 <span className="text-gray-400">Bank:</span>
                                 <span className="font-medium">{paymentSettings.bankName}</span>
                                 
                                 <span className="text-gray-400">A/C No:</span>
                                 <span className="font-medium">{paymentSettings.accountNumber}</span>
                                 
                                 <span className="text-gray-400">IFSC:</span>
                                 <span className="font-medium">{paymentSettings.ifscCode}</span>
                                 
                                 <span className="text-gray-400">Name:</span>
                                 <span className="font-medium">{paymentSettings.accountHolder}</span>
                             </div>
                         </div>
                     )}

                     {paymentSettings?.razorpayEnabled && paymentSettings?.razorpayButtonId && !isPaid && (
                        <div className="border-l border-gray-200 pl-8 flex flex-col justify-center min-w-[200px]">
                            <p className="font-bold text-gray-900 mb-2 text-xs">Pay Online</p>
                            <RazorpayButton buttonId={paymentSettings.razorpayButtonId.trim()} className="flex justify-start" />
                        </div>
                     )}
                </div>
             )}
        </div>
    </div>
  );
}
