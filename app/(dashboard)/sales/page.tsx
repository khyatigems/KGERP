import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ExportButton } from "@/components/ui/export-button";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PaymentStatusSelect } from "@/components/invoices/payment-status-select";
import { SalesActions } from "@/components/sales/sales-actions";
import { SalesCardList } from "@/components/sales/sales-card-list";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

import { checkPermission } from "@/lib/permission-guard";

export const metadata: Metadata = {
  title: "Sales History | KhyatiGems™",
};

export default async function SalesPage() {
  const perm = await checkPermission(PERMISSIONS.SALES_VIEW);
  if (!perm.success) {
    return (
      <div className="p-6">
        <div className="bg-destructive/15 text-destructive border-destructive/20 border px-4 py-3 rounded-md relative">
          <strong className="font-bold">Access Denied!</strong>
          <span className="block sm:inline"> {perm.message}</span>
        </div>
      </div>
    );
  }

  const session = await auth();
  const canDelete = session ? hasPermission(session.user?.role || "STAFF", PERMISSIONS.SALES_DELETE) : false;

  const sales = await prisma.sale.findMany({
    orderBy: {
      saleDate: "desc",
    },
    include: {
      inventory: {
        select: {
          sku: true,
          itemName: true,
        },
      },
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
          token: true,
          totalAmount: true,
          paidAmount: true,
        },
      },
      legacyInvoice: {
        select: {
          invoiceNumber: true,
          token: true,
        },
      },
    },
  });

  const parseInvoiceNo = (value: string | null | undefined) => {
    if (!value) return null;
    const m = /^INV-(\d{4})-(\d{4})$/.exec(value.trim());
    if (!m) return null;
    return { year: Number(m[1]), seq: Number(m[2]) };
  };

  const getInvoiceString = (sale: typeof sales[number]) =>
    sale.invoice?.invoiceNumber || sale.legacyInvoice?.invoiceNumber || null;

  const sortedSales = sales
    .slice()
    .sort((a, b) => {
      const ai = parseInvoiceNo(getInvoiceString(a));
      const bi = parseInvoiceNo(getInvoiceString(b));
      if (ai && bi) {
        if (ai.year !== bi.year) return bi.year - ai.year;
        if (ai.seq !== bi.seq) return bi.seq - ai.seq;
      } else if (ai && !bi) {
        return -1;
      } else if (!ai && bi) {
        return 1;
      }
      return b.saleDate.getTime() - a.saleDate.getTime();
    });

  const exportData = sortedSales.map(sale => ({
    date: formatDate(sale.saleDate),
    invoice: sale.invoice?.invoiceNumber || sale.legacyInvoice?.invoiceNumber || "-",
    customer: sale.customerName || "Walk-in",
    item: `${sale.inventory.sku} - ${sale.inventory.itemName}`,
    platform: sale.platform,
    amount: formatCurrency(sale.netAmount),
    profit: formatCurrency(sale.profit || 0),
    status: sale.paymentStatus || "PENDING"
  }));

  const columns = [
    { header: "Date", key: "date" },
    { header: "Invoice #", key: "invoice" },
    { header: "Customer", key: "customer" },
    { header: "Item", key: "item" },
    { header: "Platform", key: "platform" },
    { header: "Net Amount", key: "amount" },
    { header: "Profit", key: "profit" },
    { header: "Status", key: "status" }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Sales History</h1>
        <div className="flex items-center gap-2">
            <Link href="/sales/new">
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Record New Sale
                </Button>
            </Link>
            <ExportButton 
                filename="sales_report" 
                data={exportData} 
                columns={columns} 
                title="Sales Report" 
            />
        </div>
      </div>

      <div className="md:hidden">
         <SalesCardList data={sortedSales} canDelete={canDelete} />
      </div>

      <div className="rounded-md border hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Invoice #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Net Amount</TableHead>
              <TableHead>Profit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedSales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  No sales recorded yet.
                </TableCell>
              </TableRow>
            ) : (
              sortedSales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell>{formatDate(sale.saleDate)}</TableCell>
                  <TableCell className="font-medium">
                    {sale.invoice?.invoiceNumber || sale.legacyInvoice?.invoiceNumber || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{sale.customerName || "Walk-in"}</span>
                      {sale.customerCity && (
                        <span className="text-xs text-muted-foreground">
                          {sale.customerCity}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                        <span>{sale.inventory.sku}</span>
                        <span className="text-xs text-muted-foreground">{sale.inventory.itemName}</span>
                    </div>
                  </TableCell>
                  <TableCell>{sale.platform}</TableCell>
                  <TableCell>{formatCurrency(sale.netAmount)}</TableCell>
                  <TableCell className="text-green-600">
                    {formatCurrency(sale.profit || 0)}
                  </TableCell>
                  <TableCell>
                    {sale.invoice?.id ? (
                      <PaymentStatusSelect 
                        invoiceId={sale.invoice.id} 
                        currentStatus={sale.paymentStatus || "PENDING"} 
                        totalAmount={sale.invoice.totalAmount}
                        amountDue={Math.max(0, sale.invoice.totalAmount - (sale.invoice.paidAmount || 0))}
                      />
                    ) : (
                      <Badge variant="outline">
                        {sale.paymentStatus || "PENDING"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <SalesActions 
                        saleId={sale.id} 
                        invoiceToken={sale.invoice?.token || sale.legacyInvoice?.token} 
                        canDelete={canDelete} 
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
