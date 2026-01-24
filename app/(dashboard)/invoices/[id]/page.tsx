import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, ExternalLink, History, FileClock } from "lucide-react";
import { DownloadPdfButton } from "@/components/invoice/download-pdf-button";
import { UPIQr } from "@/components/invoice/upi-qr";
import { InvoiceData } from "@/lib/invoice-generator";
import { ScrollArea } from "@/components/ui/scroll-area";

export const dynamic = "force-dynamic";

type InvoicePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function InvoiceDetailPage({ params }: InvoicePageProps) {
  const { id } = await params;

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
      }
    },
  });

  if (!invoice) notFound();

  // Normalize sales data
  const salesItems = invoice.sales.length > 0 ? invoice.sales : (invoice.legacySale ? [invoice.legacySale] : []);
  const primarySale = salesItems[0];
  
  if (!primarySale) {
    return <div>Invalid Invoice: No linked sales found.</div>;
  }

  // Calculate totals
  const subtotal = salesItems.reduce((sum, item) => sum + item.salePrice, 0);
  const discount = salesItems.reduce((sum, item) => sum + (item.discountAmount || 0), 0);
  const gstAmount = salesItems.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
  const total = subtotal - discount + gstAmount;

  // Determine Payment Status
  const allPaid = salesItems.every(s => s.paymentStatus === "PAID");
  const anyPaidOrPartial = salesItems.some(s => s.paymentStatus === "PAID" || s.paymentStatus === "PARTIAL");
  let paymentStatus = "UNPAID";
  if (allPaid) paymentStatus = "PAID";
  else if (anyPaidOrPartial) paymentStatus = "PARTIAL";

  // Fetch Settings for PDF
  const companySettings = await prisma.companySettings.findFirst();
  const invoiceSettings = await prisma.invoiceSettings.findFirst();
  const paymentSettings = await prisma.paymentSettings.findFirst();

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

  // Process Items (GST Calculation)
  const processedItems = salesItems.map((item) => {
    // Determine GST Rate
    const category = item.inventory.category || "General";
    let rateStr = "3";
    if (gstRates && typeof gstRates === 'object') {
        rateStr = gstRates[category] || gstRates[item.inventory.itemName] || "3";
    }
    const gstRate = parseFloat(rateStr) || 3;

    // Calculate Base and GST (Inclusive)
    const inclusivePrice = item.salePrice || item.netAmount || 0;
    const basePrice = inclusivePrice / (1 + (gstRate / 100));
    const gstAmount = inclusivePrice - basePrice;

    return {
      ...item,
      basePrice,
      gstRate,
      calculatedGst: gstAmount,
      finalTotal: item.netAmount || (item.salePrice - (item.discountAmount || 0)) || 0
    };
  });
  
  // Totals
  const subtotalBase = processedItems.reduce((sum, item) => sum + item.basePrice, 0);
  const totalGst = processedItems.reduce((sum, item) => sum + item.calculatedGst, 0);
  // const discount = salesItems.reduce((sum, item) => sum + (item.discount || 0), 0); // Already defined above
  const pdfTotal = processedItems.reduce((sum, item) => sum + item.finalTotal, 0);

  const isPaid = paymentStatus === "PAID";
  const balanceDue = isPaid ? 0 : pdfTotal;

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
      name: primarySale.customerName || "Walk-in Customer",
      address: primarySale.customerCity || "",
      phone: primarySale.customerPhone || "",
      email: primarySale.customerEmail || "",
    },
    items: processedItems.map((item) => ({
      sku: item.inventory.sku,
      description: item.inventory.itemName,
      quantity: 1,
      unitPrice: item.basePrice,
      gstRate: item.gstRate,
      gstAmount: item.calculatedGst,
      total: item.finalTotal
    })),
    subtotal: subtotalBase,
    discount,
    tax: totalGst,
    total: pdfTotal,
    amountPaid: 0, 
    balanceDue: pdfTotal,
    status: paymentStatus,
    paymentStatus,
    terms: invoiceSettings?.terms || undefined,
    notes: invoiceSettings?.footerNotes || undefined,
    signatureUrl: invoiceSettings?.digitalSignatureUrl || undefined,
    bankDetails: paymentSettings?.bankEnabled ? {
      bankName: paymentSettings.bankName || "",
      accountNumber: paymentSettings.accountNumber || "",
      ifsc: paymentSettings.ifscCode || "",
      holder: paymentSettings.accountHolder || "",
    } : undefined,
    upiQrData: paymentSettings?.upiEnabled && paymentSettings.upiId 
      ? `upi://pay?pa=${paymentSettings.upiId}&pn=${encodeURIComponent(paymentSettings.upiPayeeName || "")}&am=${pdfTotal.toFixed(2)}&cu=INR`
      : undefined
  };
  
  if (paymentStatus === "PAID") {
      pdfData.amountPaid = pdfTotal;
      pdfData.balanceDue = 0;
  }
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
        <Badge
            variant={paymentStatus === "PAID" ? "default" : paymentStatus === "PARTIAL" ? "secondary" : "destructive"}
        >
            {paymentStatus}
        </Badge>
        
        <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" asChild>
                <Link href={`/invoice/${invoice.token}`} target="_blank">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Public Link
                </Link>
            </Button>
            <DownloadPdfButton data={pdfData} />
        </div>
      </div>

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
                      <span className="text-muted-foreground">Created Date</span>
                      <span className="font-medium">{formatDate(invoice.createdAt)}</span>
                  </div>
                  {invoice.quotationId && (
                      <div className="flex justify-between">
                          <span className="text-muted-foreground">From Quotation</span>
                          <Link href={`/quotes/${invoice.quotationId}`} className="text-blue-600 hover:underline">
                              View Quote
                          </Link>
                      </div>
                  )}
                  <div className="flex justify-between font-bold pt-2 border-t mt-2">
                      <span>Total Amount</span>
                      <span>{formatCurrency(total)}</span>
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
