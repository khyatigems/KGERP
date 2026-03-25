"use client";

import useSWR from "swr";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function CustomerReceivables({ customerId, customerName }: { customerId: string; customerName: string }) {
  type Row = { id: string; invoice: string; invoiceDate?: string | Date | null; dueDate?: string | Date | null; bucket: string; amount: number; paid: number; balance: number };
  const { data, isLoading } = useSWR<{ rows: Array<Row>; totalReceivable: number }>(`/api/customers/${customerId}/receivables`, fetcher);
  const [addingForInvoice, setAddingForInvoice] = useState<string | null>(null);

  const addFollowUp = async (payload: { invoiceId: string; action?: string; note?: string; promisedDate?: string }) => {
    await fetch(`/api/invoices/${payload.invoiceId}/followups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: new Date().toISOString(),
        action: payload.action || "CALL",
        note: payload.note || "",
        promisedDate: payload.promisedDate || null,
      }),
    });
    setAddingForInvoice(null);
  };

  const printStatement = () => {
    window.open(`/api/customers/${customerId}/receivables/statement`, "_blank");
  };

  return (
    <Card className={isLoading ? "animate-pulse" : ""}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Outstanding & Ageing</CardTitle>
        <div className="flex items-center gap-2">
          <Button onClick={printStatement}>Print Statement</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground mb-3">Customer: {customerName}</div>
        <div className="mb-4 text-lg font-semibold">Total Due: {formatCurrency(data?.totalReceivable || 0)}</div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Invoice Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Ageing</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Follow-up</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data?.rows?.length ? (
                <TableRow><TableCell colSpan={8} className="h-24 text-center">No outstanding invoices.</TableCell></TableRow>
              ) : (
                data.rows.map((r: Row) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.invoice}</TableCell>
                    <TableCell>{r.invoiceDate ? formatDate(r.invoiceDate) : "-"}</TableCell>
                    <TableCell>{r.dueDate ? formatDate(r.dueDate) : "-"}</TableCell>
                    <TableCell>{r.bucket}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.amount)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.paid)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.balance)}</TableCell>
                    <TableCell className="text-right">
                      {addingForInvoice === r.id ? (
                        <div className="flex items-center gap-2">
                          <input placeholder="Note" className="border rounded px-2 py-1 text-sm" id="fu-note" />
                          <input type="date" className="border rounded px-2 py-1 text-sm" id="fu-date" />
                          <Button size="sm" onClick={() => {
                            const note = (document.getElementById("fu-note") as HTMLInputElement)?.value || "";
                            const promisedDate = (document.getElementById("fu-date") as HTMLInputElement)?.value || "";
                            addFollowUp({ invoiceId: r.id, note, promisedDate });
                          }}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setAddingForInvoice(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setAddingForInvoice(r.id)}>Add Follow-up</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
