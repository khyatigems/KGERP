"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type PaymentMethodRow = {
  method: string;
  transactionCount: number;
  totalAmount: number;
};

type PaymentMethodResponse = {
  data: PaymentMethodRow[];
};

const fetcher = async (url: string): Promise<PaymentMethodResponse> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to fetch payment method totals");
  }
  return res.json();
};

const label = (method: string) => method.replaceAll("_", " ");

export function PaymentMethodCollectionsCard() {
  const { data, error, isLoading } = useSWR<PaymentMethodResponse>("/api/reports/payments-by-method", fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true
  });

  const rows = (data?.data || []).slice().sort((a, b) => b.totalAmount - a.totalAmount);
  const grandTotal = rows.reduce((sum, row) => sum + row.totalAmount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Method-wise Collections</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading payment methods...
          </div>
        ) : error ? (
          <div className="text-sm text-red-600">Unable to load payment method totals right now.</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">No payment transactions found.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Transactions</TableHead>
                <TableHead className="text-right">Collected Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.method}>
                  <TableCell className="font-medium">{label(row.method)}</TableCell>
                  <TableCell className="text-right">{row.transactionCount}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(row.totalAmount)}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="font-bold">Total</TableCell>
                <TableCell className="text-right font-bold">
                  {rows.reduce((sum, row) => sum + row.transactionCount, 0)}
                </TableCell>
                <TableCell className="text-right font-bold">{formatCurrency(grandTotal)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
