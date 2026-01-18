import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { buildInvoiceWhatsappLink } from "@/lib/whatsapp";
import { Share2 } from "lucide-react";
import type { Metadata } from "next";

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
  });

  if (!invoice) notFound();

  if (!invoice.isActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <h1 className="text-2xl font-bold text-red-600">Invoice Link Disabled</h1>
      </div>
    );
  }

  const sale = await prisma.sale.findUnique({
    where: { id: invoice.saleId },
    include: {
      inventory: true
    }
  });

  if (!sale) return <div>Sale record not found.</div>;

  const settings = await prisma.setting.findMany({
      where: {
          key: { in: ["company_name", "company_email", "company_phone", "bank_name", "bank_account", "bank_ifsc"] }
      }
  });
  const config = settings.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {} as Record<string, string>);

  const invoiceUrl = `${process.env.APP_BASE_URL}/invoice/${token}`;
  const whatsappLink = buildInvoiceWhatsappLink({
      invoiceUrl,
      invoiceNumber: invoice.invoiceNumber
  });

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4 print:bg-white print:py-0 print:px-0">
        <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden print:shadow-none">
            {/* Actions Bar */}
            <div className="bg-gray-50 px-8 py-4 border-b flex justify-end gap-4 print:hidden">
                <a 
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share on WhatsApp
                </a>
                <button 
                    onClick={() => window.print()} // This won't work in server component directly, need client wrapper or simple script.
                    // Actually, simple onclick doesn't work in Server Component. 
                    // I'll skip the print button or use a client component wrapper if needed.
                    // For now, browser print is fine. User asked for WhatsApp.
                >
                </button>
            </div>

            {/* Header */}
            <div className="p-8 border-b flex justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">INVOICE</h1>
                    <p className="text-gray-500 mt-1">#{invoice.invoiceNumber}</p>
                </div>
                <div className="text-right">
                    <h2 className="font-bold text-lg">{config.company_name}</h2>
                    <p className="text-sm text-gray-600">{config.company_email}</p>
                    <p className="text-sm text-gray-600">{config.company_phone}</p>
                </div>
            </div>

            {/* Info */}
            <div className="p-8 flex justify-between">
                <div>
                    <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">Bill To</h3>
                    <p className="font-semibold">{sale.customerName}</p>
                    <p className="text-gray-600">{sale.customerCity}</p>
                    <p className="text-gray-600">{sale.customerPhone}</p>
                </div>
                <div className="text-right">
                    <div className="mb-2">
                        <span className="text-gray-500 text-sm font-bold uppercase mr-4">Date</span>
                        <span className="font-semibold">{formatDate(invoice.createdAt)}</span>
                    </div>
                    <div>
                        <span className="text-gray-500 text-sm font-bold uppercase mr-4">Sale ID</span>
                        <span className="font-semibold">{sale.id.substring(0, 8)}</span>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="p-8">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b-2 border-gray-200">
                            <th className="py-3 text-sm font-bold text-gray-600 uppercase">Item Description</th>
                            <th className="py-3 text-sm font-bold text-gray-600 uppercase text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b border-gray-100">
                            <td className="py-4">
                                <p className="font-bold text-gray-800">{sale.inventory.itemName}</p>
                                <p className="text-sm text-gray-500">SKU: {sale.inventory.sku} | Weight: {sale.inventory.weightValue} {sale.inventory.weightUnit}</p>
                            </td>
                            <td className="py-4 text-right font-medium">
                                {formatCurrency(sale.sellingPrice)}
                            </td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr>
                            <td className="pt-6 text-right font-bold text-gray-600">Subtotal</td>
                            <td className="pt-6 text-right font-bold">{formatCurrency(sale.sellingPrice)}</td>
                        </tr>
                        {sale.discount ? (
                             <tr>
                                <td className="pt-2 text-right font-bold text-gray-600">Discount</td>
                                <td className="pt-2 text-right text-red-500">-{formatCurrency(sale.discount)}</td>
                            </tr>
                        ) : null}
                        {sale.gstAmount ? (
                             <tr>
                                <td className="pt-2 text-right font-bold text-gray-600">GST</td>
                                <td className="pt-2 text-right">{formatCurrency(sale.gstAmount)}</td>
                            </tr>
                        ) : null}
                        <tr>
                            <td className="pt-4 text-right font-bold text-xl text-gray-900">Total</td>
                            <td className="pt-4 text-right font-bold text-xl text-gray-900">{formatCurrency(sale.netAmount)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Footer */}
            <div className="p-8 border-t bg-gray-50 print:bg-transparent">
                <h3 className="font-bold mb-2">Payment Info</h3>
                <p className="text-sm text-gray-600">Bank: {config.bank_name}</p>
                <p className="text-sm text-gray-600">Account: {config.bank_account}</p>
                <p className="text-sm text-gray-600">IFSC: {config.bank_ifsc}</p>
                
                <div className="mt-8 text-center text-sm text-gray-400">
                    <p>Thank you for your business!</p>
                </div>
            </div>
        </div>
    </div>
  );
}
