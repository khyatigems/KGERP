import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getInvoiceDisplayDate } from "@/lib/invoice-date";
import { Button } from "@/components/ui/button";
import { LoadingLink } from "@/components/ui/loading-link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Eye, Globe, Receipt } from "lucide-react";
import type { ElementType } from "react";
import type { Invoice, Sale, Quotation } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Invoices | KhyatiGems™",
};

type InvoiceWithRelations = Invoice & {
  sales: Sale[];
  legacySale: Sale | null;
  quotation: Quotation | null;
  creditNotes: Array<{ id: string }>;
};

function InvoiceTable({ invoices, title, icon: Icon, type }: { 
  invoices: InvoiceWithRelations[]; 
  title: string; 
  icon: ElementType;
  type: "TAX" | "EXPORT";
}) {
  if (invoices.length === 0) return null;

  const isExport = type === "EXPORT";

  return (
    <div className={`rounded-md border ${isExport ? 'border-blue-200' : ''}`}>
      <div className={`px-4 py-3 border-b ${isExport ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'}`}>
        <h2 className={`text-lg font-semibold flex items-center gap-2 ${isExport ? 'text-blue-800' : 'text-gray-800'}`}>
          <Icon className={`h-5 w-5 ${isExport ? 'text-blue-600' : 'text-gray-600'}`} />
          {title}
          <Badge variant={isExport ? "default" : "secondary"} className={isExport ? "bg-blue-600" : ""}>
            {invoices.length}
          </Badge>
        </h2>
      </div>
      <Table>
        <TableHeader>
          <TableRow className={isExport ? 'bg-blue-50/50' : ''}>
            <TableHead>Invoice #</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Total Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => {
            // Aggregate data from sales
            const sales = invoice.sales.length > 0 ? invoice.sales : (invoice.legacySale ? [invoice.legacySale] : []);
            const primarySale = sales[0];
            const customerName = primarySale?.customerName || "Unknown";
            const totalAmount = invoice.totalAmount;
            
            // Determine overall payment status
            // Invoice.paymentStatus is authoritative; sales are fallback for legacy data.
            let paymentStatus = (invoice.paymentStatus || "").toUpperCase();
            if (!paymentStatus) {
              const allPaid = sales.every((s: Sale) => s.paymentStatus === "PAID");
              const anyPaidOrPartial = sales.some((s: Sale) => s.paymentStatus === "PAID" || s.paymentStatus === "PARTIAL");
              if (allPaid && sales.length > 0) paymentStatus = "PAID";
              else if (anyPaidOrPartial) paymentStatus = "PARTIAL";
              else paymentStatus = "UNPAID";
            }
            const hasCreditNote = (invoice.creditNotes || []).length > 0;
            const displayStatus = hasCreditNote ? `${paymentStatus} (CN)` : paymentStatus;

            const isExportInvoice = invoice.invoiceType === "EXPORT_INVOICE";

            return (
              <TableRow key={invoice.id} className={isExportInvoice ? 'bg-blue-50/30 hover:bg-blue-50/50' : ''}>
                <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                <TableCell>
                  {isExportInvoice ? (
                    <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50">
                      <Globe className="h-3 w-3 mr-1" /> EXPORT
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-gray-300 text-gray-700 bg-gray-50">
                      <Receipt className="h-3 w-3 mr-1" /> TAX
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{formatDate(getInvoiceDisplayDate(invoice))}</TableCell>
                <TableCell>{customerName}</TableCell>
                <TableCell>{sales.length}</TableCell>
                <TableCell>{formatCurrency(totalAmount)}</TableCell>
                <TableCell>
                  <Badge variant={paymentStatus === "PAID" ? "default" : paymentStatus === "PARTIAL" ? "secondary" : "destructive"}>
                    {displayStatus}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <LoadingLink href={`/invoices/${invoice.id}`}>
                      <Eye className="mr-2 h-4 w-4" /> View
                    </LoadingLink>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export default async function InvoicesPage() {
  const invoices = await prisma.invoice.findMany({
    orderBy: [{ invoiceDate: "desc" }, { createdAt: "desc" }],
    include: {
      sales: true,
      legacySale: true,
      quotation: true,
      creditNotes: { select: { id: true } },
    },
  });

  // Separate invoices by type
  const taxInvoices = invoices.filter((i) => i.invoiceType !== "EXPORT_INVOICE");
  const exportInvoices = invoices.filter((i) => i.invoiceType === "EXPORT_INVOICE");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
        <div className="flex gap-2">
          <Badge variant="secondary" className="px-3 py-1">
            <Receipt className="h-4 w-4 mr-1" /> TAX: {taxInvoices.length}
          </Badge>
          <Badge className="bg-blue-600 px-3 py-1">
            <Globe className="h-4 w-4 mr-1" /> EXPORT: {exportInvoices.length}
          </Badge>
        </div>
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-md border">
          <div className="h-24 flex items-center justify-center text-gray-500">
            No invoices found.
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Export Invoices Section */}
          <InvoiceTable 
            invoices={exportInvoices as InvoiceWithRelations[]} 
            title="Export Invoices" 
            icon={Globe}
            type="EXPORT"
          />

          {/* Tax Invoices Section */}
          <InvoiceTable 
            invoices={taxInvoices as InvoiceWithRelations[]} 
            title="Tax Invoices" 
            icon={Receipt}
            type="TAX"
          />
        </div>
      )}
    </div>
  );
}
