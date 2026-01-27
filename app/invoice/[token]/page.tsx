import { prisma } from "@/lib/prisma";
import { Sale, Inventory } from "@prisma/client";
import { notFound } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { buildInvoiceWhatsappLink } from "@/lib/whatsapp";
import { Share2 } from "lucide-react";
import { PrintButton } from "@/components/invoice/print-button";
import { RazorpayButton } from "@/components/invoice/razorpay-button";
import { DownloadPdfButton } from "@/components/invoice/download-pdf-button";
import { UPIQr } from "@/components/invoice/upi-qr";
import { InvoiceData } from "@/lib/invoice-generator";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function PublicInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { token },
    include: {
      sales: {
        include: { inventory: true }
      },
      legacySale: {
        include: { inventory: true }
      },
      quotation: {
        include: {
          customer: true
        }
      }
    }
  });

  if (!invoice) notFound();

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

  // Process Items (GST Calculation)
  const processedItems = salesItems.map((item: any) => {
    // Determine GST Rate
    // Default to 3% if not found, as per common jewelry standard or user implication
    const category = item.inventory.category || "General";
    let rateStr = "3";
    if (gstRates && typeof gstRates === 'object') {
        rateStr = gstRates[category] || gstRates[item.inventory.itemName] || "3";
    }
    const gstRate = parseFloat(rateStr) || 3;

    // Calculate Base and GST (Inclusive)
    // Formula: Inclusive = Base + (Base * Rate/100) => Base = Inclusive / (1 + Rate/100)
    // Fallback to netAmount or 0 if salePrice/sellingPrice is missing
    const inclusivePrice = item.salePrice || item.netAmount || 0;
    const basePrice = inclusivePrice / (1 + (gstRate / 100));
    const gstAmount = inclusivePrice - basePrice;

    return {
      ...item,
      basePrice,
      gstRate,
      calculatedGst: gstAmount,
      // Ensure netAmount is total (it should be salePrice - discountAmount)
      finalTotal: item.netAmount || (inclusivePrice - (item.discountAmount || 0)) || 0,
      discountAmount: item.discountAmount || 0
    };
  });

  // Payment Status Logic
  const allPaid = salesItems.every((s) => s.paymentStatus === "PAID");
  const anyPaidOrPartial = salesItems.some((s) => s.paymentStatus === "PAID" || s.paymentStatus === "PARTIAL");
  let paymentStatus = "UNPAID";
  if (allPaid) paymentStatus = "PAID";
  else if (anyPaidOrPartial) paymentStatus = "PARTIAL";

  const isPaid = paymentStatus === "PAID";
  // const isPartial = paymentStatus === "PARTIAL";
  
  // Totals
  const subtotalBase = processedItems.reduce((sum, item) => sum + item.basePrice, 0);
  const totalGst = processedItems.reduce((sum, item) => sum + item.calculatedGst, 0);
  const discount = processedItems.reduce((sum, item) => sum + (item.discountAmount || 0), 0);
  const total = processedItems.reduce((sum, item) => sum + item.finalTotal, 0);
  
  // Balance Due Calculation
  const amountPaidCalculated = salesItems.reduce((sum, item) => {
    if (item.paymentStatus === "PAID") return sum + (item.netAmount || item.salePrice);
    if (item.paymentStatus === "PARTIAL") {
      // Partial payment amount not currently tracked in Sale model
      return sum;
    }
    return sum;
  }, 0);

  const balanceDue = isPaid ? 0 : Math.max(0, total - amountPaidCalculated);
  const amountReceived = amountPaidCalculated;

  const isOriginal = true; 
  const statusLabel = isOriginal ? "ORIGINAL INVOICE" : "DUPLICATE INVOICE";

  const invoiceUrl = `${process.env.APP_BASE_URL}/invoice/${token}`;
  const whatsappLink = buildInvoiceWhatsappLink({
      invoiceUrl,
      invoiceNumber: invoice.invoiceNumber
  });

  // Customer Details (Fallback Logic)
  const customerName = primarySale.customerName || invoice.quotation?.customer?.name || "Walk-in Customer";
  const customerAddress = primarySale.customerCity || invoice.quotation?.customer?.city || invoice.quotation?.customer?.address || "";
  const customerPhone = primarySale.customerPhone || invoice.quotation?.customer?.phone || "";
  const customerEmail = primarySale.customerEmail || invoice.quotation?.customer?.email || "";

  // Construct InvoiceData for PDF
  const pdfData: InvoiceData = {
    invoiceNumber: invoice.invoiceNumber,
    date: invoice.createdAt,
    company: {
      name: companySettings?.companyName || "KhyatiGems",
      address: companySettings?.address || "",
      email: companySettings?.email || "",
      phone: companySettings?.phone || "",
      gstin: companySettings?.gstin || undefined,
      logoUrl: displayLogo || undefined,
    },
    customer: {
      name: customerName,
      address: customerAddress,
      phone: customerPhone,
      email: customerEmail,
    },
    items: processedItems.map((item) => {
      const pricingDetails = item.inventory.pricingMode === "PER_CARAT" 
        ? `Rate: ${formatCurrency(item.inventory.sellingRatePerCarat || 0)}/ct` 
        : "Flat Price";
        
      return {
        sku: item.inventory.sku,
        description: `${item.inventory.itemName}\n${item.inventory.weightValue} ${item.inventory.weightUnit}${item.inventory.certification ? ` • Cert: ${item.inventory.certification}` : ''}\n${pricingDetails}`,
        quantity: 1,
        unitPrice: item.basePrice, // Show Base Price in PDF column
        gstRate: item.gstRate,
        gstAmount: item.calculatedGst,
        total: item.finalTotal // Show Final Total (Inclusive - Discount)
      };
    }),
    subtotal: subtotalBase, // Show Base Subtotal
    discount,
    tax: totalGst,
    total,
    amountPaid: amountReceived,
    balanceDue,
    status: statusLabel,
    paymentStatus,
    terms: invoiceSettings?.terms || undefined,
    notes: invoiceSettings?.footerNotes || undefined,
    signatureUrl: invoiceSettings?.digitalSignatureUrl || undefined,
    upiQrData: paymentSettings?.upiEnabled && paymentSettings?.upiId ? 
      `upi://pay?pa=${paymentSettings.upiId}&pn=${encodeURIComponent(paymentSettings.upiPayeeName || "")}&am=${balanceDue.toFixed(2)}&cu=INR` : undefined,
    bankDetails: paymentSettings?.bankEnabled ? {
      bankName: paymentSettings.bankName || "",
      accountNumber: paymentSettings.accountNumber || "",
      ifsc: paymentSettings.ifscCode || "",
      holder: paymentSettings.accountHolder || "",
    } : undefined
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 print:py-0 print:px-0 print:bg-white">
        <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden print:shadow-none print:rounded-none relative print:w-full">
            
            {/* Watermark for Paid */}
            {isPaid && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden opacity-10">
                 <div className="border-10 border-green-600 text-green-600 text-[10rem] font-black -rotate-45 px-12 py-4 rounded-xl">
                    PAID
                 </div>
              </div>
            )}

            {/* Top Action Bar */}
            <div className="bg-gray-800 text-white px-8 py-4 flex justify-between items-center print:hidden relative z-10">
                <div className="text-sm font-medium opacity-90">
                    Status: <span className={isPaid ? "text-green-400 font-bold" : "text-amber-400 font-bold"}>{paymentStatus}</span>
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

            {/* Header */}
            <div className="p-10 pb-8 flex justify-between items-start relative z-10">
                <div className="space-y-2">
                    {displayLogo && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                            src={displayLogo} 
                            alt="Logo" 
                            className="h-16 w-auto object-contain mb-4"
                        />
                    )}
                    <h2 className="font-bold text-2xl text-gray-900 leading-none">{companySettings?.companyName}</h2>
                    <div className="text-sm text-gray-600 space-y-1">
                        <p>{companySettings?.address}</p>
                        <p>{companySettings?.email} • {companySettings?.phone}</p>
                        {companySettings?.gstin && <p className="font-medium text-gray-800">GSTIN: {companySettings.gstin}</p>}
                    </div>
                </div>
                <div className="text-right">
                    <h1 className="text-4xl font-light text-gray-300 tracking-tight">INVOICE</h1>
                    <div className="mt-4 space-y-1">
                        <p className="text-lg font-bold text-gray-900">#{invoice.invoiceNumber}</p>
                        <p className="text-sm text-gray-500">{formatDate(invoice.createdAt)}</p>
                        <div className="pt-2">
                             <span className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wider rounded border border-gray-200">
                                {statusLabel}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bill To */}
            <div className="px-10 py-6 bg-gray-50 border-y border-gray-100 flex justify-between relative z-10">
                <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Bill To</h3>
                    <div className="text-gray-900 font-medium text-lg">{customerName}</div>
                    <div className="text-sm text-gray-600 mt-1 space-y-0.5">
                        {customerAddress && <p>{customerAddress}</p>}
                        {customerPhone && <p>{customerPhone}</p>}
                        {customerEmail && <p>{customerEmail}</p>}
                    </div>
                </div>
                <div className="text-right">
                     <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Reference</h3>
                     <p className="text-sm font-mono text-gray-600">{primarySale.id.substring(0, 8).toUpperCase()}</p>
                </div>
            </div>

            {/* Items */}
            <div className="p-10 relative z-10">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b-2 border-gray-900">
                            <th className="py-3 text-xs font-bold text-gray-900 uppercase tracking-widest w-1/2">Item</th>
                            <th className="py-3 text-xs font-bold text-gray-900 uppercase tracking-widest text-right">Base Price</th>
                            <th className="py-3 text-xs font-bold text-gray-900 uppercase tracking-widest text-right">GST</th>
                            <th className="py-3 text-xs font-bold text-gray-900 uppercase tracking-widest text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {processedItems.map((item) => (
                          <tr key={item.id}>
                            <td className="py-4">
                                <p className="font-bold text-gray-900">{item.inventory.itemName}</p>
                                <div className="text-xs text-gray-500 mt-1">
                                    SKU: <span className="font-mono">{item.inventory.sku}</span> • {item.inventory.weightValue} {item.inventory.weightUnit}
                                    {item.inventory.certification && <span> • Cert: {item.inventory.certification}</span>}
                                </div>
                                {/* Pricing Details */}
                                <div className="text-xs text-gray-500 mt-0.5">
                                    {item.inventory.pricingMode === "PER_CARAT" ? (
                                        <span>
                                            Rate: {formatCurrency(item.inventory.sellingRatePerCarat || 0)}/ct
                                        </span>
                                    ) : (
                                        <span>Flat Price</span>
                                    )}
                                </div>
                            </td>
                            <td className="py-4 text-right text-gray-600 align-top">
                                {formatCurrency(item.basePrice)}
                            </td>
                            <td className="py-4 text-right text-gray-600 align-top">
                                <div className="flex flex-col items-end">
                                    <span>{formatCurrency(item.calculatedGst)}</span>
                                    <span className="text-[10px] text-gray-400">({item.gstRate}%)</span>
                                </div>
                            </td>
                            <td className="py-4 text-right font-medium text-gray-900 align-top">
                                {formatCurrency(item.finalTotal)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                </table>

                {/* Totals */}
                <div className="mt-8 flex justify-end">
                    <div className="w-64 space-y-3">
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>Subtotal (Excl. Tax)</span>
                            <span>{formatCurrency(subtotalBase)}</span>
                        </div>
                        {discount > 0 && (
                            <div className="flex justify-between text-sm text-red-600">
                                <span>Discount</span>
                                <span>-{formatCurrency(discount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>Total GST</span>
                            <span>{formatCurrency(totalGst)}</span>
                        </div>
                        <div className="border-t border-gray-900 pt-3 flex justify-between items-end">
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
                        </div>
                    </div>
                </div>

                {/* Terms and Signature */}
                <div className="mt-12 grid grid-cols-2 gap-8 border-t border-gray-100 pt-8">
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
                <div className="mt-8 pt-8 border-t border-gray-100 text-center">
                    <p className="text-xs text-gray-400">Thank you for your business</p>
                </div>
            </div>
            
             {/* Payment Details Footer (Print/PDF only mostly, but visible here too) */}
             {(paymentSettings?.upiEnabled || paymentSettings?.bankEnabled || (paymentSettings?.razorpayEnabled && paymentSettings?.razorpayButtonId && !isPaid)) && (
                <div className="bg-gray-50 px-10 py-6 border-t border-gray-200 flex gap-8">
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