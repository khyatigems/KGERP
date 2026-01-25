"use client";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateInvoicePaymentStatus } from "@/app/(dashboard)/invoices/actions";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaymentModal, PaymentDetails } from "./payment-modal";

interface PaymentStatusSelectProps {
  invoiceId: string;
  currentStatus: string; // "PAID" | "UNPAID" | "PARTIAL"
  amountDue: number;
  totalAmount: number;
  disabled?: boolean;
}

export function PaymentStatusSelect({ invoiceId, currentStatus, amountDue, totalAmount, disabled }: PaymentStatusSelectProps) {
  const [status, setStatus] = useState(currentStatus);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<"PAID" | "PARTIAL">("PAID");

  const handleStatusChange = (value: string) => {
    if (value === "PAID" || value === "PARTIAL") {
      setTargetStatus(value as "PAID" | "PARTIAL");
      setIsModalOpen(true);
    } else {
      // Handle UNPAID (revert) - strictly speaking, we might want to block this or warn
      // For now, let's allow it but without modal (resetting payment)
      // Or maybe we shouldn't allow reverting via this simple control if payments exist.
      // Requirements didn't specify reverting logic, but let's keep it simple.
      updateStatus(value as "PAID" | "UNPAID" | "PARTIAL");
    }
  };

  const handlePaymentConfirm = async (details: PaymentDetails) => {
    await updateStatus(targetStatus, details);
    setIsModalOpen(false);
  };

  const updateStatus = async (newStatus: "PAID" | "UNPAID" | "PARTIAL", paymentDetails?: PaymentDetails) => {
    setIsLoading(true);
    // Optimistic update
    setStatus(newStatus);
    
    try {
      const result = await updateInvoicePaymentStatus(invoiceId, newStatus, paymentDetails);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
        setStatus(currentStatus); // Revert
      }
    } catch {
      toast.error("Failed to update status");
      setStatus(currentStatus); // Revert
    } finally {
      setIsLoading(false);
    }
  };

  if (currentStatus === "PAID") {
    return (
      <Badge variant="default" className="h-8 px-3 text-sm">
        PAID
      </Badge>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Select 
          value={status} 
          onValueChange={handleStatusChange} 
          disabled={disabled || isLoading}
        >
          <SelectTrigger className={`w-[140px] h-8 ${
              status === "PAID" ? "bg-green-50 text-green-700 border-green-200" :
              status === "PARTIAL" ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
              "bg-red-50 text-red-700 border-red-200"
          }`}>
            {isLoading ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="PARTIAL">Partial</SelectItem>
            {/* Allow reverting to Unpaid only if currently Unpaid or maybe strictly restrict? 
                If current is PARTIAL, maybe they can revert to UNPAID (deleting payments?). 
                Let's keep UNPAID option but logic might need to handle it. 
            */}
            <SelectItem value="UNPAID">Unpaid</SelectItem>
          </SelectContent>
        </Select>

        {currentStatus === "PARTIAL" && (
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8"
            onClick={() => {
              setTargetStatus("PARTIAL"); // Adding more partial payment
              setIsModalOpen(true);
            }}
            disabled={isLoading || disabled}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Payment
          </Button>
        )}
      </div>

      <PaymentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handlePaymentConfirm}
        targetStatus={targetStatus}
        amountDue={amountDue}
        totalAmount={totalAmount}
        isProcessing={isLoading}
      />
    </>
  );
}
