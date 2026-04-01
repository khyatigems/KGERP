"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { recordAdvance } from "@/app/(dashboard)/advances/actions";
import { toast } from "sonner";
import { Loader2, Wallet, Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  phone?: string;
}

interface Payment {
  id: string;
  mode: string;
  amount: string;
  reference: string;
}

interface RecordAdvanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers?: Customer[];
  preSelectedCustomerId?: string;
}

const PAYMENT_MODES = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "UPI", label: "UPI" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "OTHER", label: "Other" },
];

export function RecordAdvanceDialog({
  open,
  onOpenChange,
  customers = [],
  preSelectedCustomerId,
}: RecordAdvanceDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [customerId, setCustomerId] = useState(preSelectedCustomerId || "");
  const [isSelectingCustomer, setIsSelectingCustomer] = useState(!preSelectedCustomerId);
  const [payments, setPayments] = useState<Payment[]>([
    { id: "1", mode: "CASH", amount: "", reference: "" },
  ]);
  const [notes, setNotes] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const selectedCustomer = customers.find((c) => c.id === customerId);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone || "").includes(searchTerm)
  );

  const totalAmount = payments.reduce(
    (sum, p) => sum + (parseFloat(p.amount) || 0),
    0
  );

  const addPayment = () => {
    setPayments([
      ...payments,
      {
        id: Math.random().toString(36).substr(2, 9),
        mode: "CASH",
        amount: "",
        reference: "",
      },
    ]);
  };

  const removePayment = (id: string) => {
    if (payments.length > 1) {
      setPayments(payments.filter((p) => p.id !== id));
    }
  };

  const updatePayment = (id: string, field: keyof Payment, value: string) => {
    setPayments(
      payments.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const handleSubmit = () => {
    if (!customerId) {
      toast.error("Please select a customer");
      return;
    }

    if (totalAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const formData = new FormData();
    formData.append("customerId", customerId);
    formData.append("amount", totalAmount.toString());
    formData.append("paymentMode", payments[0]?.mode || "CASH");
    formData.append(
      "paymentRef",
      payments.map((p) => `${p.mode}: ${p.reference || "N/A"}`).join(" | ")
    );
    formData.append("notes", notes);

    startTransition(async () => {
      try {
        const result = await recordAdvance(formData);
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success("Advance recorded successfully");
          onOpenChange(false);
          router.refresh();
          // Reset form
          setCustomerId("");
          setIsSelectingCustomer(true);
          setPayments([{ id: "1", mode: "CASH", amount: "", reference: "" }]);
          setNotes("");
          setSearchTerm("");
        }
      } catch (error) {
        console.error("Failed to record advance:", error);
        toast.error("Failed to record advance");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Customer Advance</DialogTitle>
          <DialogDescription>
            Record an advance payment received from a customer. This can be
            adjusted against future invoices.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Customer Selection */}
          <div className="space-y-2">
            <Label htmlFor="customer">Customer *</Label>
            {preSelectedCustomerId ? (
              <div className="p-3 border rounded bg-muted">
                <div className="font-medium">{selectedCustomer?.name}</div>
                <div className="text-sm text-muted-foreground">
                  {selectedCustomer?.phone}
                </div>
              </div>
            ) : isSelectingCustomer ? (
              <>
                <Input
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mb-2"
                  autoFocus
                />
                <div className="border rounded max-h-40 overflow-y-auto">
                  {filteredCustomers.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">
                      No customers found
                    </div>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        className="p-3 cursor-pointer hover:bg-accent border-b last:border-b-0"
                        onClick={() => {
                          setCustomerId(customer.id);
                          setIsSelectingCustomer(false);
                          setSearchTerm("");
                        }}
                      >
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {customer.phone || "No phone"}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="p-3 border rounded bg-muted flex items-center justify-between">
                <div>
                  <div className="font-medium">
                    {selectedCustomer?.name || "No customer selected"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {selectedCustomer?.phone}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSelectingCustomer(true)}
                >
                  Change
                </Button>
              </div>
            )}
          </div>

          {/* Payments Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Payments *</Label>
              <Button type="button" variant="outline" size="sm" onClick={addPayment}>
                <Plus className="h-4 w-4 mr-1" />
                Add Payment
              </Button>
            </div>

            {payments.map((payment, index) => (
              <div
                key={payment.id}
                className="p-3 border rounded space-y-3 bg-muted/50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Payment {index + 1}
                  </span>
                  {payments.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removePayment(payment.id)}
                      className="h-8 w-8 p-0 text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Mode</Label>
                    <Select
                      value={payment.mode}
                      onValueChange={(value) =>
                        updatePayment(payment.id, "mode", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_MODES.map((mode) => (
                          <SelectItem key={mode.value} value={mode.value}>
                            {mode.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Amount (₹)</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={payment.amount}
                      onChange={(e) =>
                        updatePayment(payment.id, "amount", e.target.value)
                      }
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                {payment.mode !== "CASH" && (
                  <div className="space-y-1">
                    <Label className="text-xs">Reference Number</Label>
                    <Input
                      placeholder={`Enter ${payment.mode.toLowerCase()} reference`}
                      value={payment.reference}
                      onChange={(e) =>
                        updatePayment(payment.id, "reference", e.target.value)
                      }
                    />
                  </div>
                )}
              </div>
            ))}

            {/* Total Amount Display */}
            <div className="flex items-center justify-between p-3 border rounded bg-muted">
              <span className="font-medium">Total Amount</span>
              <span className="text-lg font-bold">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Input
              id="notes"
              placeholder="Any additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!customerId || totalAmount <= 0 || isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recording...
              </>
            ) : (
              <>
                <Wallet className="mr-2 h-4 w-4" />
                Record Advance
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
