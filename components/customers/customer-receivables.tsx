"use client";

import useSWR from "swr";
import { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function CustomerReceivables({ customerId, customerName }: { customerId: string; customerName: string }) {
  type Row = {
    id: string;
    invoice: string;
    invoiceDate?: string | Date | null;
    dueDate?: string | Date | null;
    bucket: string;
    amount: number;
    paid: number;
    balance: number;
    lastFollowUpDate?: string | null;
    followUpCount?: number;
  };
  type FollowUpRow = { id: string; date: string; action: string | null; note: string | null; promisedDate: string | null; createdBy: string | null };

  const receivablesKey = `/api/customers/${customerId}/receivables`;
  const { mutate } = useSWRConfig();
  const { data, isLoading } = useSWR<{ rows: Array<Row>; totalReceivable: number }>(receivablesKey, fetcher);

  const [followUpsForInvoice, setFollowUpsForInvoice] = useState<Row | null>(null);
  const [addForInvoice, setAddForInvoice] = useState<Row | null>(null);
  const [action, setAction] = useState("CALL");
  const [note, setNote] = useState("");
  const [promisedDate, setPromisedDate] = useState("");

  const followupsKey = followUpsForInvoice ? `/api/invoices/${followUpsForInvoice.id}/followups` : null;
  const followups = useSWR<{ items: FollowUpRow[] }>(followupsKey, fetcher);

  const buckets = useMemo(() => {
    const rows = data?.rows || [];
    const sum = (bucket: string) => rows.filter((r) => r.bucket === bucket).reduce((s, r) => s + r.balance, 0);
    return {
      "0-30": sum("0-30"),
      "31-60": sum("31-60"),
      "61-90": sum("61-90"),
      "90+": sum("90+"),
    };
  }, [data?.rows]);

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
    await mutate(receivablesKey);
    if (followupsKey) await mutate(followupsKey);
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4 text-sm">
          <div className="rounded-md border p-3"><div className="text-muted-foreground">0–30</div><div className="font-medium">{formatCurrency(buckets["0-30"])}</div></div>
          <div className="rounded-md border p-3"><div className="text-muted-foreground">31–60</div><div className="font-medium">{formatCurrency(buckets["31-60"])}</div></div>
          <div className="rounded-md border p-3"><div className="text-muted-foreground">61–90</div><div className="font-medium">{formatCurrency(buckets["61-90"])}</div></div>
          <div className="rounded-md border p-3"><div className="text-muted-foreground">90+</div><div className="font-medium">{formatCurrency(buckets["90+"])}</div></div>
        </div>
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
                      <div className="flex items-center justify-end gap-2">
                        <div className="text-xs text-muted-foreground">
                          {r.lastFollowUpDate ? formatDate(r.lastFollowUpDate) : "-"} ({r.followUpCount || 0})
                        </div>
                        <Button size="sm" variant="outline" onClick={() => {
                          setAction("CALL");
                          setNote("");
                          setPromisedDate("");
                          setAddForInvoice(r);
                        }}>Add</Button>
                        <Button size="sm" variant="ghost" onClick={() => setFollowUpsForInvoice(r)}>History</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={!!addForInvoice} onOpenChange={(open) => { if (!open) setAddForInvoice(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Follow-up</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">{addForInvoice?.invoice}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="text-sm font-medium">Action</div>
                  <Input value={action} onChange={(e) => setAction(e.target.value)} placeholder="CALL / WHATSAPP / EMAIL" />
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium">Promised Date</div>
                  <Input type="date" value={promisedDate} onChange={(e) => setPromisedDate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium">Note</div>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Follow-up note..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddForInvoice(null)}>Cancel</Button>
              <Button
                onClick={async () => {
                  if (!addForInvoice) return;
                  await addFollowUp({
                    invoiceId: addForInvoice.id,
                    action,
                    note,
                    promisedDate: promisedDate || undefined,
                  });
                  setAddForInvoice(null);
                }}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!followUpsForInvoice} onOpenChange={(open) => { if (!open) setFollowUpsForInvoice(null); }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Follow-up History</DialogTitle>
            </DialogHeader>
            <div className="text-sm text-muted-foreground">{followUpsForInvoice?.invoice}</div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Promised</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!followups.data?.items?.length ? (
                    <TableRow><TableCell colSpan={4} className="h-24 text-center">No follow-ups.</TableCell></TableRow>
                  ) : (
                    followups.data.items.map((fu) => (
                      <TableRow key={fu.id}>
                        <TableCell>{formatDate(fu.date)}</TableCell>
                        <TableCell>{fu.action || "-"}</TableCell>
                        <TableCell>{fu.promisedDate ? formatDate(fu.promisedDate) : "-"}</TableCell>
                        <TableCell className="whitespace-pre-wrap">{fu.note || "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFollowUpsForInvoice(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
