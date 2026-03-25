"use client";

import { useMemo, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface PaymentModalProps {
  invoiceId: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: PaymentDetails) => Promise<void>;
  targetStatus: "PAID" | "PARTIAL";
  amountDue: number;
  isProcessing?: boolean;
}

export interface PaymentDetails {
  amount: number;
  method: string;
  date: string;
  reference?: string;
  notes?: string;
}

export function PaymentModal({
  invoiceId,
  isOpen,
  onClose,
  onConfirm,
  targetStatus,
  amountDue,
  isProcessing = false
}: PaymentModalProps) {
  const [amount, setAmount] = useState<string>("");
  const [method, setMethod] = useState("CASH");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [openCreditNotes, setOpenCreditNotes] = useState<Array<{ id: string; creditNoteNumber: string; issueDate: string; balanceAmount: number }>>([]);
  const [isLoadingCreditNotes, setIsLoadingCreditNotes] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (targetStatus === "PAID") {
          setAmount(amountDue.toFixed(2));
        } else {
          setAmount("");
        }
        setMethod("CASH");
        setDate(new Date().toISOString().split("T")[0]);
        setReference("");
        setNotes("");
        setOpenCreditNotes([]);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, targetStatus, amountDue]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!isOpen || method !== "CREDIT_NOTE") return;
      setIsLoadingCreditNotes(true);
      try {
        const res = await fetch(`/api/invoices/${invoiceId}/credit-notes-open`);
        const data = await res.json();
        if (cancelled) return;
        setOpenCreditNotes(Array.isArray(data?.items) ? data.items : []);
      } catch {
        if (!cancelled) setOpenCreditNotes([]);
      } finally {
        if (!cancelled) setIsLoadingCreditNotes(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [invoiceId, isOpen, method]);

  const allocationPreview = useMemo(() => {
    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) return [];
    let remaining = numAmount;
    const used: Array<{ creditNoteNumber: string; used: number; remainingAfter: number }> = [];
    for (const cn of openCreditNotes) {
      if (remaining <= 0) break;
      const use = Math.min(remaining, Number(cn.balanceAmount || 0));
      if (use <= 0) continue;
      remaining -= use;
      used.push({ creditNoteNumber: cn.creditNoteNumber, used: use, remainingAfter: remaining });
    }
    return used;
  }, [amount, openCreditNotes]);

  const remainingCreditNeed = useMemo(() => {
    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) return 0;
    const available = openCreditNotes.reduce((s, cn) => s + Number(cn.balanceAmount || 0), 0);
    return Math.max(0, numAmount - available);
  }, [amount, openCreditNotes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;
    if (targetStatus === "PARTIAL" && numAmount > amountDue + 0.009) {
      toast.error(`Amount cannot exceed pending amount (${formatCurrency(amountDue)})`);
      return;
    }
    if (method === "CREDIT_NOTE" && remainingCreditNeed > 0.009) {
      toast.error("Insufficient credit note balance for this payment amount");
      return;
    }

    await onConfirm({
      amount: numAmount,
      method,
      date,
      reference,
      notes
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Payment Status</Label>
            <div className="font-medium text-sm">
              Moving to <span className={targetStatus === "PAID" ? "text-green-600" : "text-yellow-600"}>{targetStatus}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (Total Due: {formatCurrency(amountDue)})</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={targetStatus === "PAID"} // Full amount required for PAID? Or just pre-filled but editable (if slightly different)? Usually fixed for PAID.
                // Requirement said: "If 'Paid' is selected, the system must automatically record the full remaining amount."
                // So disable it.
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="method">Payment Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="CHEQUE">Cheque</SelectItem>
                <SelectItem value="CREDIT_NOTE">Credit-Note Adjustment</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {method === "CREDIT_NOTE" && (
            <div className="space-y-2">
              <Label>Open Credit Notes</Label>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>CN #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingCreditNotes ? (
                      <TableRow><TableCell colSpan={3} className="h-16 text-center">Loading...</TableCell></TableRow>
                    ) : openCreditNotes.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="h-16 text-center">No open credit notes.</TableCell></TableRow>
                    ) : (
                      openCreditNotes.map((cn) => (
                        <TableRow key={cn.id}>
                          <TableCell className="font-medium">{cn.creditNoteNumber}</TableCell>
                          <TableCell>{cn.issueDate ? cn.issueDate.slice(0, 10) : "-"}</TableCell>
                          <TableCell className="text-right">{formatCurrency(cn.balanceAmount)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {allocationPreview.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  Allocation preview: {allocationPreview.map((a) => `${a.creditNoteNumber} (${a.used.toFixed(2)})`).join(", ")}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reference">Reference / Transaction ID</Label>
            <Input
              id="reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional remarks..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button type="submit" disabled={isProcessing}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record Payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
