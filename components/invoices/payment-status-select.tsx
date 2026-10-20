"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateInvoicePaymentStatus } from "@/app/(dashboard)/invoices/actions";
import { toast } from "@/lib/erp-feedback";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaymentModal, PaymentDetails } from "./payment-modal";
import { t } from "@/lib/i18n";
import { useErpConfirmation } from "@/components/providers/erp-confirmation-provider";

interface PaymentStatusSelectProps {
  invoiceId: string;
  currentStatus: string; // "PAID" | "UNPAID" | "PARTIAL"
  amountDue: number;
  totalAmount: number;
  disabled?: boolean;
}

export function PaymentStatusSelect({ invoiceId, currentStatus, amountDue, totalAmount, disabled }: PaymentStatusSelectProps) {
  void totalAmount;
  const router = useRouter();
  const confirm = useErpConfirmation();
  const [status, setStatus] = useState(currentStatus);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<"PAID" | "PARTIAL">("PAID");

  const handleStatusChange = async (value: string) => {
    if (value === "PAID" || value === "PARTIAL") {
      setTargetStatus(value as "PAID" | "PARTIAL");
      setIsModalOpen(true);
    } else {
      const confirmed = await confirm({
        title: "Reset invoice payments?",
        description: "This will remove the recorded payment entries and reset this invoice to Unpaid. This cannot be undone.",
        confirmLabel: "Reset payments",
        destructive: true,
      });
      if (!confirmed) return;
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
        router.refresh();
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
        {t("paid")}
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
            title="Add another payment entry"
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
        invoiceId={invoiceId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handlePaymentConfirm}
        targetStatus={targetStatus}
        amountDue={amountDue}
        isProcessing={isLoading}
      />
    </>
  );
}
