"use client";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateInvoicePaymentStatus } from "@/app/(dashboard)/invoices/actions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface PaymentStatusSelectProps {
  invoiceId: string;
  currentStatus: string; // "PAID" | "UNPAID" | "PARTIAL"
  disabled?: boolean;
}

export function PaymentStatusSelect({ invoiceId, currentStatus, disabled }: PaymentStatusSelectProps) {
  const [status, setStatus] = useState(currentStatus);
  const [isLoading, setIsLoading] = useState(false);

  const handleValueChange = async (value: string) => {
    setIsLoading(true);
    // Optimistic update
    setStatus(value);
    
    try {
      const result = await updateInvoicePaymentStatus(invoiceId, value as "PAID" | "UNPAID" | "PARTIAL");
      if (result.success) {
        toast.success("Payment status updated");
      } else {
        toast.error(result.message);
        setStatus(currentStatus); // Revert
      }
    } catch (error) {
      toast.error("Failed to update status");
      setStatus(currentStatus); // Revert
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select 
        value={status} 
        onValueChange={handleValueChange} 
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
          <SelectItem value="UNPAID">Unpaid</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
