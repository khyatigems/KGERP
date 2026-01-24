import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import { formatCurrency, formatDate } from "@/lib/utils";
import { buildUpiUri } from "@/lib/upi";
import QRCode from "qrcode";
import type { Metadata } from "next";
import "../quotation.css"; // Import the CSS file

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function PublicQuotationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // Fetch Quotation with nested media
  const quotation = await prisma.quotation.findUnique({
    where: { token },
    include: {
      items: {
        include: {
          inventory: {
            include: {
              media: true // Fetch SkuMedia
            }
          }
        }
      }
    }
  });

  if (!quotation) notFound();

  const validStatuses = ["DRAFT", "SENT", "APPROVED", "ACCEPTED", "CONVERTED", "ACTIVE"];
  if (!validStatuses.includes(quotation.status)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <h1 className="text-2xl font-bold text-red-600">Quotation Unavailable</h1>
        <p className="mt-2 text-gray-600">Status: {quotation.status}</p>
      </div>
    );
  }

  // Check expiry date
  if (quotation.expiryDate && new Date() > quotation.expiryDate) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
            <h1 className="text-2xl font-bold text-red-600">Quotation Expired</h1>
            <p className="mt-2 text-gray-600">This quotation expired on {formatDate(quotation.expiryDate)}.</p>
        </div>
      );
  }

  // Fetch Company Settings
  const company = await prisma.companySettings.findFirst() || {
    companyName: "Khyati Precious Gems Pvt. Ltd.",
    logoUrl: null,
    quotationLogoUrl: null,
    address: "Mumbai, India",
    addressLine1: "Mumbai, India",
    addressLine2: null,
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    pincode: null,
    pan: null,
    gstin: null,
    termsAndConditions: null,
    phone: "+919876543210",
    email: "support@khyatigems.com",
    website: "www.khyatigems.com",
    bankName: null,
    bankAccountNo: null,
    bankIfsc: null,
    bankBranch: null,
    id: "default",
    updatedAt: new Date()
  };

  const displayLogo = company.quotationLogoUrl || company.logoUrl;

  // Fetch Payment Settings
  const payment = await prisma.paymentSettings.findFirst() || {
    upiEnabled: false,
    bankEnabled: false,
    upiId: null,
    upiPayeeName: null,
    upiQrUrl: null,
    bankName: null,
    accountNumber: null,
    ifscCode: null,
    accountHolder: null,
    razorpayEnabled: false,
    razorpayKeyId: null,
    razorpayKeySecret: null,
    razorpayButtonId: null,
    id: "default",
    updatedAt: new Date()
  };

  // Generate UPI QR if enabled
  let qrDataUrl = "";
  if (payment.upiEnabled && payment.upiId && payment.upiPayeeName) {
      // Use uploaded QR if available, else generate dynamic one
      if (payment.upiQrUrl) {
          qrDataUrl = payment.upiQrUrl;
      } else {
          const upiUrl = buildUpiUri({
              vpa: payment.upiId,
              payeeName: payment.upiPayeeName,
              amount: quotation.totalAmount,
              transactionNote: `Quotation ${quotation.quotationNumber}`
          });
          qrDataUrl = await QRCode.toDataURL(upiUrl);
      }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="max-w-3xl mx-auto bg-white text-slate-900 shadow-lg rounded-lg overflow-hidden">
            {/* 1️⃣ QUOTATION HEADER — LOGO LAYOUT */}
            <div className="quotation-header">
                <div className="quotation-brand">
                    {displayLogo ? (
                         // eslint-disable-next-line @next/next/no-img-element
                         <img src={displayLogo} alt={company.companyName} className="quotation-logo" />
                    ) : (
                        <div className="company-text">
                            <h1>{company.companyName}</h1>
                            <span>Official Quotation</span>
                        </div>
                    )}
                    {displayLogo && (
                        <div className="company-text">
                             <h1>{company.companyName}</h1>
                             <span>Official Quotation</span>
                        </div>
                    )}
                </div>

                <div className="quotation-meta">
                    <div className="quote-number">{quotation.quotationNumber}</div>
                    <div className="quote-validity">Valid until {quotation.expiryDate ? formatDate(quotation.expiryDate) : 'N/A'}</div>
                </div>
            </div>

            {/* Customer Info */}
            <div className="p-6 border-b">
                <h3 className="text-sm font-semibold text-gray-500 uppercase">Prepared For</h3>
                <p className="text-lg font-medium mt-1">{quotation.customerName || "Valued Customer"}</p>
                {quotation.customerCity && <p className="text-gray-600">{quotation.customerCity}</p>}
            </div>

            {/* Items */}
            <div className="p-6">
                <table className="quotation-table">
                    <thead>
                        <tr>
                            <th style={{ width: '100px' }}>Image</th>
                            <th>Item Details</th>
                            <th className="text-right">Weight</th>
                            <th className="text-right">Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        {quotation.items.map((item: any) => {
                            // Find primary media
                            const primaryMedia = item.inventory?.media?.find((m: any) => m.isPrimary) || item.inventory?.media?.[0];
                            const mediaUrl = primaryMedia?.mediaUrl || item.inventory?.imageUrl;

                            return (
                                <tr key={item.id}>
                                    {/* 2️⃣ PRODUCT MEDIA */}
                                    <td className="item-media">
                                        {mediaUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={mediaUrl} alt={item.inventory.itemName} className="item-image" />
                                        ) : (
                                            <div className="item-image placeholder" />
                                        )}
                                    </td>
                                    
                                    {/* 4️⃣ PRODUCT NAME & SKU TEXT */}
                                    <td>
                                        <div className="item-details">
                                            <span className="item-name">{item.inventory.itemName}</span>
                                            <span className="item-sku">SKU: {item.inventory.sku}</span>
                                        </div>
                                    </td>
                                    
                                    <td className="text-right">{item.inventory.weightValue} {item.inventory.weightUnit}</td>
                                    <td className="text-right">{formatCurrency(item.quotedPrice)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr className="bg-gray-50">
                            <td colSpan={3} className="py-4 px-2 font-bold text-right">Total Amount</td>
                            <td className="py-4 text-right font-bold text-lg">{formatCurrency(quotation.totalAmount)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* 5️⃣ PAYMENT SECTION — CONDITIONAL RENDERING */}
            <div className="p-6 bg-gray-50 flex flex-col md:flex-row gap-8">
                {payment.upiEnabled && payment.upiId ? (
                     <div className="flex-1">
                        <h3 className="text-lg font-bold mb-4">Pay Now via UPI</h3>
                        {qrDataUrl && (
                            <>
                                <div className="bg-white p-4 inline-block rounded shadow-sm">
                                    <Image 
                                        src={qrDataUrl} 
                                        alt="UPI QR Code" 
                                        className="w-48 h-48" 
                                        width={192} 
                                        height={192} 
                                        unoptimized 
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-2">Scan with any UPI app (GPay, PhonePe, Paytm)</p>
                                <p className="text-sm mt-2 font-mono">{payment.upiId}</p>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="flex-1">
                        <p className="text-gray-600 italic">For payment assistance, please contact us on WhatsApp.</p>
                    </div>
                )}
               
               {payment.bankEnabled && (
                    <div className="flex-1">
                        <h3 className="text-lg font-bold mb-4">Bank Details</h3>
                        <div className="space-y-2 text-sm">
                            <p><span className="font-semibold w-24 inline-block">Bank:</span> {payment.bankName}</p>
                            <p><span className="font-semibold w-24 inline-block">Account:</span> {payment.accountNumber}</p>
                            <p><span className="font-semibold w-24 inline-block">IFSC:</span> {payment.ifscCode}</p>
                            <p><span className="font-semibold w-24 inline-block">Name:</span> {payment.accountHolder}</p>
                        </div>
                    </div>
               )}
            </div>

             {/* WhatsApp CTA */}
             <div className="p-6 pt-0 bg-gray-50">
                <a 
                    href={`https://wa.me/${company.phone?.replace(/[^0-9]/g, "")}`} 
                    target="_blank"
                    className="block w-full text-center bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded transition-colors"
                >
                    Contact on WhatsApp
                </a>
            </div>

            {/* 6️⃣ FOOTER (ERP + PDF SAME STYLE) */}
            <div className="p-6">
                <div className="quotation-footer">
                    <p>{company.companyName}</p>
                    <p>Certified Gemstones & Fine Jewellery</p>
                    <p className="mt-2">📍 {company.address}</p>
                    <p>📞 {company.phone} | ✉️ {company.email}</p>
                    <p>🌐 {company.website}</p>
                    <p className="mt-4 italic opacity-70">
                        This is a system-generated quotation. 
                        Prices are valid until expiry date and subject to stock availability.
                    </p>
                </div>
            </div>
        </div>
    </div>
  );
}
