import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ExportButton } from "@/components/ui/export-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Receivables | KhyatiGems™",
};

export default async function ReceivablesPage() {
  const session = await auth();
  if (!session?.user?.id) return null;
  if (!(await checkUserPermission(session.user.id, PERMISSIONS.RECEIVABLES_VIEW))) {
    return (
      <div className="p-6">
        <div className="bg-destructive/15 text-destructive border-destructive/20 border px-4 py-3 rounded-md relative">
          <strong className="font-bold">Access Denied!</strong>
          <span className="block sm:inline"> You don&apos;t have permission to view receivables.</span>
        </div>
      </div>
    );
  }

  const today = new Date();
  const invoices = await prisma.invoice.findMany({
    where: { paymentStatus: { in: ["UNPAID", "PARTIAL"] }, isActive: true },
    select: {
      invoiceNumber: true,
      invoiceDate: true,
      dueDate: true,
      totalAmount: true,
      paidAmount: true,
      paymentStatus: true,
      sales: { take: 1, select: { customerName: true } },
    },
    orderBy: { invoiceDate: "desc" },
  });

  const rows = invoices.map((inv) => {
    const due = inv.dueDate || inv.invoiceDate || today;
    const days = Math.floor((today.getTime() - new Date(due).getTime()) / (1000 * 60 * 60 * 24));
    const bucket = days <= 30 ? "0-30" : days <= 60 ? "31-60" : days <= 90 ? "61-90" : "90+";
    const amount = inv.totalAmount || 0;
    const paid = inv.paidAmount || 0;
    const balance = Math.max(0, amount - paid);
    return {
      Customer: inv.sales?.[0]?.customerName || "Unknown",
      "Invoice #": inv.invoiceNumber,
      "Invoice Date": inv.invoiceDate ? formatDate(inv.invoiceDate) : "-",
      "Due Date": inv.dueDate ? formatDate(inv.dueDate) : "-",
      Ageing: bucket,
      Amount: amount,
      Paid: paid,
      Balance: balance,
    };
  });

  const totals = {
    totalReceivable: rows.reduce((s, r) => s + r.Balance, 0),
    "0-30": rows.filter((r) => r.Ageing === "0-30").reduce((s, r) => s + r.Balance, 0),
    "31-60": rows.filter((r) => r.Ageing === "31-60").reduce((s, r) => s + r.Balance, 0),
    "61-90": rows.filter((r) => r.Ageing === "61-90").reduce((s, r) => s + r.Balance, 0),
    "90+": rows.filter((r) => r.Ageing === "90+").reduce((s, r) => s + r.Balance, 0),
  };

  const columns: Array<{ header: string; key: keyof typeof rows[number] }> =
    Object.keys(rows[0] || {}).map((k) => ({ header: k, key: k as keyof typeof rows[number] }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Accounts Receivable</h1>
        <ExportButton filename="receivables" data={rows} columns={columns} title="Receivables" label="Export CSV/Excel/PDF" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Receivable</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(totals.totalReceivable)}</div></CardContent>
        </Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">0–30</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(totals["0-30"])}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">31–60</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(totals["31-60"])}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">61–90</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(totals["61-90"])}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">90+</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(totals["90+"])}</div></CardContent></Card>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => <TableHead key={c.key}>{c.header}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No receivables.</TableCell></TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r["Invoice #"]}>
                  {columns.map((c) => {
                    const val = r[c.key];
                    return (
                      <TableCell key={String(c.key)}>
                        {typeof val === "number" ? formatCurrency(val) : val}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
