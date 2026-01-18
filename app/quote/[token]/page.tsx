import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { buildUpiUri } from "@/lib/upi";
import QRCode from "qrcode";

export default async function PublicQuotationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const quotation = await prisma.quotation.findUnique({
    where: { token },
    include: {
      items: true
    }
  });

  if (!quotation) notFound();

  if (quotation.status !== "ACTIVE") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <h1 className="text-2xl font-bold text-red-600">Quotation Expired or Invalid</h1>
        <p className="mt-2 text-gray-600">Please contact us for a new quotation.</p>
      </div>
    );
  }

  // Check expiry date
  if (new Date() > quotation.expiryDate) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
            <h1 className="text-2xl font-bold text-red-600">Quotation Expired</h1>
            <p className="mt-2 text-gray-600">This quotation expired on {formatDate(quotation.expiryDate)}.</p>
        </div>
      );
  }

  // Fetch Settings for Payment
  const settings = await prisma.setting.findMany({
      where: {
          key: { in: ["company_name", "upi_vpa", "upi_payee_name", "bank_name", "bank_account", "bank_ifsc", "company_phone"] }
      }
  });
  
  const config = settings.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {} as Record<string, string>);

  // Generate UPI QR
  let qrDataUrl = "";
  if (config.upi_vpa && config.upi_payee_name) {
      const upiUrl = buildUpiUri({
          vpa: config.upi_vpa,
          payeeName: config.upi_payee_name,
          amount: quotation.totalAmount,
          transactionNote: `Quotation ${quotation.quotationNumber}`
      });
      qrDataUrl = await QRCode.toDataURL(upiUrl);
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
            {/* Header */}
            <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Khyati Gems</h1>
                    <p className="text-sm opacity-80">Official Quotation</p>
                </div>
                <div className="text-right">
                    <p className="text-lg font-mono">{quotation.quotationNumber}</p>
                    <p className="text-sm opacity-80">Valid until {formatDate(quotation.expiryDate)}</p>
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
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b text-sm text-gray-500">
                            <th className="pb-3">Item</th>
                            <th className="pb-3">SKU</th>
                            <th className="pb-3 text-right">Weight</th>
                            <th className="pb-3 text-right">Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        {quotation.items.map((item) => (
                            <tr key={item.id} className="border-b last:border-0">
                                <td className="py-4 font-medium">{item.itemName}</td>
                                <td className="py-4 text-gray-500 text-sm">{item.sku}</td>
                                <td className="py-4 text-right">{item.weight}</td>
                                <td className="py-4 text-right">{formatCurrency(item.quotedPrice)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-gray-50">
                            <td colSpan={3} className="py-4 px-2 font-bold text-right">Total Amount</td>
                            <td className="py-4 text-right font-bold text-lg">{formatCurrency(quotation.totalAmount)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Payment Section */}
            <div className="p-6 bg-gray-50 flex flex-col md:flex-row gap-8">
                <div className="flex-1">
                    <h3 className="text-lg font-bold mb-4">Pay Now via UPI</h3>
                    {qrDataUrl ? (
                        <>
                            <div className="bg-white p-4 inline-block rounded shadow-sm">
                                <img src={qrDataUrl} alt="UPI QR Code" className="w-48 h-48" />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">Scan with any UPI app (GPay, PhonePe, Paytm)</p>
                            <p className="text-sm mt-2 font-mono">{config.upi_vpa}</p>
                        </>
                    ) : (
                        <p className="text-red-500">UPI configuration missing.</p>
                    )}
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold mb-4">Bank Details</h3>
                    <div className="space-y-2 text-sm">
                        <p><span className="font-semibold w-24 inline-block">Bank:</span> {config.bank_name}</p>
                        <p><span className="font-semibold w-24 inline-block">Account:</span> {config.bank_account}</p>
                        <p><span className="font-semibold w-24 inline-block">IFSC:</span> {config.bank_ifsc}</p>
                        <p><span className="font-semibold w-24 inline-block">Name:</span> {config.company_name}</p>
                    </div>
                    
                    <div className="mt-6">
                        <a 
                            href={`https://wa.me/${config.company_phone?.replace("+", "")}`} 
                            target="_blank"
                            className="block w-full text-center bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded transition-colors"
                        >
                            Contact on WhatsApp
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}
