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
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  phone?: string;
}

interface RecordAdvanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers?: Customer[];
  preSelectedCustomerId?: string;
}

export function RecordAdvanceDialog({
  open,
  onOpenChange,
  customers = [],
  preSelectedCustomerId,
}: RecordAdvanceDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [customerId, setCustomerId] = useState(preSelectedCustomerId || "");
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [paymentRef, setPaymentRef] = useState("");
  const [notes, setNotes] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone || "").includes(searchTerm)
  );

  const handleSubmit = () => {
    if (!customerId || !amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    const formData = new FormData();
    formData.append("customerId", customerId);
    formData.append("amount", amount);
    formData.append("paymentMode", paymentMode);
    formData.append("paymentRef", paymentRef);
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
          setAmount("");
          setPaymentMode("CASH");
          setPaymentRef("");
          setNotes("");
          setSearchTerm("");
        }
      } catch (error) {
        toast.error("Failed to record advance");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
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
              <div className="p-2 border rounded bg-muted">
                {customers.find((c) => c.id === preSelectedCustomerId)?.name} -{" "}
                {customers.find((c) => c.id === preSelectedCustomerId)?.phone}
              </div>
            ) : (
              <>
                <Input
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mb-2"
                />
                <div className="border rounded max-h-32 overflow-y-auto">
                  {filteredCustomers.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">
                      No customers found
                    </div>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        className={`p-3 cursor-pointer hover:bg-accent border-b last:border-b-0 ${
                          customerId === customer.id ? "bg-accent" : ""
                        }`}
                        onClick={() => setCustomerId(customer.id)}
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
            )}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₹) *</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.01"
            />
            {amount && (
              <p className="text-sm text-muted-foreground">
                {formatCurrency(parseFloat(amount) || 0)}
              </p>
            )}
          </div>

          {/* Payment Mode */}
          <div className="space-y-2">
            <Label htmlFor="paymentMode">Payment Mode *</Label>
            <Select value={paymentMode} onValueChange={setPaymentMode}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="CARD">Card</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="CHEQUE">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Reference */}
          {paymentMode !== "CASH" && (
            <div className="space-y-2">
              <Label htmlFor="paymentRef">Reference Number</Label>
              <Input
                id="paymentRef"
                placeholder={`Enter ${paymentMode.toLowerCase()} reference`}
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
              />
            </div>
          )}

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
            disabled={!customerId || !amount || isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recording...
              </>
            ) : (
              "Record Advance"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
