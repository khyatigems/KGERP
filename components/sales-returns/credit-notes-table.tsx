"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Download } from "lucide-react";

type Row = {
  id: string;
  creditNoteNumber: string;
  issueDate: string;
  activeUntil: string | null;
  totalAmount: number;
  balanceAmount: number;
  isActive: number;
  invoiceNumber: string | null;
  customerName: string | null;
};

function isExpired(row: Row) {
  const until = row.activeUntil ? new Date(row.activeUntil) : new Date(new Date(row.issueDate).getTime() + 90 * 24 * 60 * 60 * 1000);
  return until.getTime() < Date.now();
}

export function CreditNotesTable({ initialRows }: { initialRows: Row[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return initialRows;
    return initialRows.filter((r) =>
      (r.creditNoteNumber || "").toLowerCase().includes(term) ||
      (r.invoiceNumber || "").toLowerCase().includes(term) ||
      (r.customerName || "").toLowerCase().includes(term)
    );
  }, [initialRows, q]);

  const update = async (id: string, action: "activate" | "deactivate" | "extend") => {
    await fetch(`/api/credit-notes/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    router.refresh();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search CN / Customer / Invoice..." className="md:w-[340px]" />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>CN #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Valid Until</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!filtered.length ? (
              <TableRow><TableCell colSpan={9} className="h-24 text-center">No credit notes.</TableCell></TableRow>
            ) : (
              filtered.map((r) => {
                const expired = isExpired(r);
                const status = r.isActive ? (expired ? "EXPIRED" : "ACTIVE") : "INACTIVE";
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.creditNoteNumber}</TableCell>
                    <TableCell>{formatDate(r.issueDate)}</TableCell>
                    <TableCell>{r.activeUntil ? formatDate(r.activeUntil) : "-"}</TableCell>
                    <TableCell>{r.customerName || "-"}</TableCell>
                    <TableCell>{r.invoiceNumber || "-"}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.totalAmount || 0)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.balanceAmount || 0)}</TableCell>
                    <TableCell>{status}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(`/api/credit-notes/${r.id}/pdf`, "_blank")}
                          title="Download Credit Note PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => startTransition(() => update(r.id, r.isActive ? "deactivate" : "activate"))}
                        >
                          {r.isActive ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isPending}
                          onClick={() => startTransition(() => update(r.id, "extend"))}
                          title="Extend validity by 90 days from today"
                        >
                          Extend
                        </Button>
                      </div>
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
