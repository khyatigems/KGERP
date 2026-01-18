import { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ExportButton } from "@/components/ui/export-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SalesActions } from "@/components/sales/sales-actions";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Sales History | Khyati Gems",
};

export default async function SalesPage() {
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
          invoiceNumber: true,
          token: true,
        },
      },
    },
  });

  const exportData = sales.map(sale => ({
    date: formatDate(sale.saleDate),
    invoice: sale.invoice?.invoiceNumber || "-",
    customer: sale.customerName || "Walk-in",
    item: `${sale.inventory.sku} - ${sale.inventory.itemName}`,
    platform: sale.platform,
    amount: formatCurrency(sale.netAmount),
    profit: formatCurrency(sale.profit),
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
        <ExportButton 
            filename="sales_report" 
            data={exportData} 
            columns={columns} 
            title="Sales Report" 
        />
      </div>

      <div className="rounded-md border">
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
            {sales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  No sales recorded yet.
                </TableCell>
              </TableRow>
            ) : (
              sales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell>{formatDate(sale.saleDate)}</TableCell>
                  <TableCell className="font-medium">
                    {sale.invoice?.invoiceNumber || "-"}
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
                    {formatCurrency(sale.profit)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {sale.paymentStatus || "PENDING"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <SalesActions 
                        saleId={sale.id} 
                        invoiceToken={sale.invoice?.token} 
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
