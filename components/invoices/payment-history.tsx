"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Payment {
  id: string;
  amount: number;
  date: Date;
  method: string;
  reference: string | null;
  notes: string | null;
}

interface PaymentHistoryProps {
  payments: Payment[];
  totalAmount: number;
  invoiceId: string;
}

export function PaymentHistory({ payments, totalAmount, invoiceId }: PaymentHistoryProps) {
  if (!payments || payments.length === 0) return null;
  const sorted = [...payments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let runningPaid = 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment History</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead className="text-right">Pending After</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Receipt</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((payment) => {
              runningPaid += payment.amount;
              const pendingAfter = Math.max(0, totalAmount - runningPaid);
              return (
              <TableRow key={payment.id}>
                <TableCell>{formatDate(payment.date)}</TableCell>
                <TableCell>
                  <Badge variant="outline">{payment.method}</Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">{payment.reference || "-"}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(pendingAfter)}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(payment.amount)}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/invoices/${invoiceId}/payments/${payment.id}/receipt`} target="_blank">
                      Receipt
                    </Link>
                  </Button>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate" title={payment.notes || ""}>
                  {payment.notes || "-"}
                </TableCell>
              </TableRow>
            )})}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
