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
import { Eye } from "lucide-react";
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No invoices found.
                </TableCell>
              </TableRow>
            ) : (
              (invoices as InvoiceWithRelations[]).map((invoice) => {
                // Aggregate data from sales
                const sales = invoice.sales.length > 0 ? invoice.sales : (invoice.legacySale ? [invoice.legacySale] : []);
                const primarySale = sales[0];
                const customerName = primarySale?.customerName || "Unknown";
                const totalAmount = sales.reduce((sum: number, sale: Sale) => sum + sale.netAmount, 0);
                
                // Determine overall payment status
                // If all paid -> PAID
                // If some paid or partial -> PARTIAL
                // Else -> UNPAID
                let paymentStatus = "UNPAID";
                const allPaid = sales.every((s: Sale) => s.paymentStatus === "PAID");
                const anyPaidOrPartial = sales.some((s: Sale) => s.paymentStatus === "PAID" || s.paymentStatus === "PARTIAL");
                
                if (allPaid && sales.length > 0) paymentStatus = "PAID";
                else if (anyPaidOrPartial) paymentStatus = "PARTIAL";
                const hasCreditNote = (invoice.creditNotes || []).length > 0;
                const displayStatus = hasCreditNote ? `${paymentStatus} (CN)` : paymentStatus;

                return (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
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
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
