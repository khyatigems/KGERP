"use client";

import { useMemo, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { t } from "@/lib/i18n";

interface PaymentMethod {
  id: string;
  method: string;
  amount: string;
  reference?: string;
  loyaltyPoints?: string;
}

interface PaymentModalProps {
  invoiceId?: string;
  customerId?: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: PaymentDetails) => Promise<void>;
  targetStatus: "PAID" | "PARTIAL";
  amountDue: number;
  isProcessing?: boolean;
}

export interface PaymentDetails {
  totalAmount: number;
  date: string;
  notes?: string;
  couponCode?: string;
  payments: SinglePayment[];
}

export interface SinglePayment {
  method: string;
  amount: number;
  reference?: string;
  loyaltyPointsRedeemed?: number;
}

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "LOYALTY_REDEEM", label: "Loyalty Redeem" },
  { value: "CREDIT_NOTE", label: "Credit-Note Adjustment" },
  { value: "ADVANCE_ADJUST", label: "Advance Adjustment" },
  { value: "OTHER", label: "Other" },
];

export function PaymentModal({
  invoiceId,
  customerId,
  isOpen,
  onClose,
  onConfirm,
  targetStatus,
  amountDue,
  isProcessing = false,
}: PaymentModalProps) {
  const [payments, setPayments] = useState<PaymentMethod[]>([
    { id: "1", method: "CASH", amount: "", reference: "" },
  ]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [openCreditNotes, setOpenCreditNotes] = useState<
    Array<{ id: string; creditNoteNumber: string; issueDate: string; balanceAmount: number }>
  >([]);
  const [isLoadingCreditNotes, setIsLoadingCreditNotes] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [hasAppliedCoupon, setHasAppliedCoupon] = useState(false);
  const [couponAppliedInfo, setCouponAppliedInfo] = useState<{ code: string; discountAmount: number } | null>(null);
  const [loyaltyInfo, setLoyaltyInfo] = useState<{
    availablePoints: number;
    redeemRupeePerPoint: number;
    minRedeemPoints: number;
    maxRedeemPercent: number;
    loyaltyMaxRedeemAmount: number;
  } | null>(null);
  const [advanceInfo, setAdvanceInfo] = useState<{
    totalAvailable: number;
    advances: Array<{ id: string; remainingAmount: number; originalAmount: number; createdAt: string; notes: string | null }>;
  } | null>(null);
  const [isLoadingAdvances, setIsLoadingAdvances] = useState(false);

  // Calculate totals
  const totalPayments = useMemo(() => {
    return payments.reduce((sum, p) => {
      const amt = parseFloat(p.amount) || 0;
      return sum + amt;
    }, 0);
  }, [payments]);

  const remainingAmount = amountDue - totalPayments;

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        // Initialize with one payment
        setPayments([{ id: "1", method: "CASH", amount: targetStatus === "PAID" ? amountDue.toFixed(2) : "", reference: "" }]);
        setDate(new Date().toISOString().split("T")[0]);
        setNotes("");
        setOpenCreditNotes([]);
        setCouponCode("");
        setHasAppliedCoupon(false);
        setCouponAppliedInfo(null);
        setLoyaltyInfo(null);
        setAdvanceInfo(null);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, targetStatus, amountDue]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!isOpen || !invoiceId) return;
      try {
        const res = await fetch(`/api/invoices/${invoiceId}/payment-context`);
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.ok && data) {
          setCouponAppliedInfo(data.coupon || null);
          setHasAppliedCoupon(Boolean(data.coupon));
          setLoyaltyInfo(data.loyalty || null);
          if (data.coupon?.code) setCouponCode(String(data.coupon.code));
        }
      } catch {}
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [invoiceId, isOpen]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!isOpen || !customerId) return;
      const hasAdvance = payments.some((p) => p.method === "ADVANCE_ADJUST");
      if (!hasAdvance) {
        setAdvanceInfo(null);
        return;
      }
      setIsLoadingAdvances(true);
      try {
        const res = await fetch(`/api/customers/${customerId}/advances-available`);
        const data = await res.json();
        if (cancelled) return;
        if (data.success) {
          setAdvanceInfo({
            totalAvailable: data.totalAvailable,
            advances: data.advances || [],
          });
        }
      } catch {
        if (!cancelled) setAdvanceInfo(null);
      } finally {
        if (!cancelled) setIsLoadingAdvances(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [customerId, isOpen, payments]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!isOpen || !invoiceId) return;
      const hasCreditNote = payments.some((p) => p.method === "CREDIT_NOTE");
      if (!hasCreditNote) {
        setOpenCreditNotes([]);
        return;
      }
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
  }, [invoiceId, isOpen, payments]);

  const addPayment = () => {
    const newId = (payments.length + 1).toString();
    setPayments([...payments, { id: newId, method: "CASH", amount: "", reference: "" }]);
  };

  const removePayment = (id: string) => {
    if (payments.length === 1) {
      toast.error("At least one payment is required");
      return;
    }
    setPayments(payments.filter((p) => p.id !== id));
  };

  const updatePayment = (id: string, field: keyof PaymentMethod, value: string) => {
    setPayments(
      payments.map((p) => {
        if (p.id !== id) return p;
        const updated = { ...p, [field]: value };
        // Auto-calculate amount when loyalty points change
        if (field === "loyaltyPoints" && loyaltyInfo && value) {
          const points = parseFloat(value) || 0;
          updated.amount = (points * Number(loyaltyInfo.redeemRupeePerPoint || 1)).toFixed(2);
        }
        return updated;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate payments
    for (const payment of payments) {
      const amt = parseFloat(payment.amount);
      if (isNaN(amt) || amt <= 0) {
        toast.error("All payments must have a valid amount");
        return;
      }

      // Validate loyalty redeem
      if (payment.method === "LOYALTY_REDEEM" && loyaltyInfo) {
        const points = parseFloat(payment.loyaltyPoints || "0");
        if (isNaN(points) || points <= 0) {
          toast.error("Please enter points to redeem for loyalty payment");
          return;
        }
        if (points > Number(loyaltyInfo.availablePoints || 0) + 0.0001) {
          toast.error(`Cannot redeem more than ${loyaltyInfo.availablePoints.toFixed(2)} points`);
          return;
        }
        if (points + 0.0001 < Number(loyaltyInfo.minRedeemPoints || 0)) {
          toast.error(`Minimum redeem points is ${loyaltyInfo.minRedeemPoints}`);
          return;
        }
      }
    }

    // Validate total
    if (targetStatus === "PARTIAL" && totalPayments > amountDue + 0.009) {
      toast.error(`Total payments cannot exceed pending amount (${formatCurrency(amountDue)})`);
      return;
    }

    if (targetStatus === "PAID" && Math.abs(totalPayments - amountDue) > 0.009) {
      toast.error(`For "Paid" status, total payments must equal ${formatCurrency(amountDue)}. Current: ${formatCurrency(totalPayments)}`);
      return;
    }

    // Credit note validation
    const creditNoteAmount = payments
      .filter((p) => p.method === "CREDIT_NOTE")
      .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    if (creditNoteAmount > 0) {
      const availableCredit = openCreditNotes.reduce((s, cn) => s + Number(cn.balanceAmount || 0), 0);
      if (creditNoteAmount > availableCredit + 0.009) {
        toast.error("Insufficient credit note balance");
        return;
      }
    }

    // Advance validation
    const advanceAmount = payments
      .filter((p) => p.method === "ADVANCE_ADJUST")
      .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    if (advanceAmount > 0 && advanceInfo) {
      if (advanceAmount > advanceInfo.totalAvailable + 0.009) {
        toast.error(`Insufficient advance balance. Available: ${formatCurrency(advanceInfo.totalAvailable)}`);
        return;
      }
    }

    // Build payment details
    const paymentDetails: PaymentDetails = {
      totalAmount: totalPayments,
      date,
      notes,
      couponCode: !hasAppliedCoupon ? couponCode.trim().toUpperCase() : undefined,
      payments: payments.map((p) => ({
        method: p.method,
        amount: parseFloat(p.amount),
        reference: p.reference,
        loyaltyPointsRedeemed: p.method === "LOYALTY_REDEEM" ? parseFloat(p.loyaltyPoints || "0") : undefined,
      })),
    };

    await onConfirm(paymentDetails);
  };

  const remainingCredit = openCreditNotes.reduce((s, cn) => s + Number(cn.balanceAmount || 0), 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle title={t("record_payment")}>
            {targetStatus === "PAID" ? t("record_payment") : t("record_partial_payment")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Summary */}
          <div className="space-y-2">
            <Label>Payment Status</Label>
            <div className="font-medium text-sm">
              Moving to <span className={targetStatus === "PAID" ? "text-green-600" : "text-yellow-600"}>{targetStatus}</span>
            </div>
          </div>

          <div className="flex justify-between items-center p-3 bg-muted rounded-md">
            <div>
              <div className="text-sm text-muted-foreground">Amount Due</div>
              <div className="font-medium">{formatCurrency(amountDue)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Paid</div>
              <div className="font-medium">{formatCurrency(totalPayments)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Remaining</div>
              <div className={`font-medium ${remainingAmount > 0.009 ? "text-yellow-600" : "text-green-600"}`}>
                {formatCurrency(remainingAmount)}
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>Payment Methods</Label>
              <Button type="button" variant="outline" size="sm" onClick={addPayment}>
                <Plus className="h-4 w-4 mr-1" />
                Add Payment
              </Button>
            </div>

            {payments.map((payment, index) => (
              <div key={payment.id} className="border rounded-md p-3 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Payment #{index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removePayment(payment.id)}
                    disabled={payments.length === 1}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Method</Label>
                    <Select value={payment.method} onValueChange={(v) => updatePayment(payment.id, "method", v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={payment.amount}
                      onChange={(e) => updatePayment(payment.id, "amount", e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Loyalty Points Input */}
                {payment.method === "LOYALTY_REDEEM" && loyaltyInfo && (
                  <div className="space-y-2">
                    <div className="rounded-md border p-2 text-xs space-y-1">
                      <div>Available: {loyaltyInfo.availablePoints.toFixed(2)} points</div>
                      <div>Value: {formatCurrency(Number(loyaltyInfo.redeemRupeePerPoint || 1))}/point</div>
                      <div>Max: {formatCurrency(Number(loyaltyInfo.loyaltyMaxRedeemAmount || 0))}</div>
                    </div>
                    <Label>Points to Redeem</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={payment.loyaltyPoints || ""}
                      onChange={(e) => updatePayment(payment.id, "loyaltyPoints", e.target.value)}
                      placeholder="Enter points"
                    />
                  </div>
                )}

                {/* Reference */}
                {payment.method !== "LOYALTY_REDEEM" && payment.method !== "CREDIT_NOTE" && payment.method !== "ADVANCE_ADJUST" && (
                  <div className="space-y-2">
                    <Label>Reference / Transaction ID</Label>
                    <Input
                      value={payment.reference || ""}
                      onChange={(e) => updatePayment(payment.id, "reference", e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Credit Notes Section */}
          {payments.some((p) => p.method === "CREDIT_NOTE") && (
            <div className="space-y-2">
              <Label>Open Credit Notes (Available: {formatCurrency(remainingCredit)})</Label>
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
                      <TableRow>
                        <TableCell colSpan={3} className="h-16 text-center">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : openCreditNotes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="h-16 text-center">
                          No open credit notes.
                        </TableCell>
                      </TableRow>
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
            </div>
          )}

          {/* Advance Section */}
          {payments.some((p) => p.method === "ADVANCE_ADJUST") && (
            <div className="space-y-2">
              <Label>Available Advance Balance: {formatCurrency(advanceInfo?.totalAvailable || 0)}</Label>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingAdvances ? (
                      <TableRow>
                        <TableCell colSpan={3} className="h-16 text-center">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : !advanceInfo || advanceInfo.advances.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="h-16 text-center">
                          No available advances.
                        </TableCell>
                      </TableRow>
                    ) : (
                      advanceInfo.advances.map((adv) => (
                        <TableRow key={adv.id}>
                          <TableCell>{new Date(adv.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className="font-medium">{adv.notes || "-"}</TableCell>
                          <TableCell className="text-right">{formatCurrency(adv.remainingAmount)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Common Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="couponCode">Coupon Code (optional)</Label>
              <Input
                id="couponCode"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder={hasAppliedCoupon ? "Already applied" : "Enter code"}
                disabled={hasAppliedCoupon}
              />
              {couponAppliedInfo && (
                <div className="text-xs text-muted-foreground">
                  Applied: {couponAppliedInfo.code} ({formatCurrency(Number(couponAppliedInfo.discountAmount || 0))})
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional remarks..." />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button type="submit" disabled={isProcessing || totalPayments <= 0}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record Payment{payments.length > 1 ? "s" : ""} ({formatCurrency(totalPayments)})
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
