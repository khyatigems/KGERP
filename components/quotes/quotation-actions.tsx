"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Pencil, IndianRupee, XCircle, Loader2, Send, FileText } from "lucide-react";
import { cancelQuotation, sendQuotation, convertQuotationToInvoice } from "@/app/(dashboard)/quotes/actions";
import { useState } from "react";
import { toast } from "@/lib/erp-feedback";
import { useRouter } from "next/navigation";
import { useErpConfirmation } from "@/components/providers/erp-confirmation-provider";

interface QuotationActionsProps {
  id: string;
  status: string;
  items: { inventoryId: string }[];
}

export function QuotationActions({ id, status, items }: QuotationActionsProps) {
  const [isCancelling, setIsCancelling] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const router = useRouter();
  const confirm = useErpConfirmation();

  // Allow actions for DRAFT and SENT (and legacy ACTIVE)
  // Logic from spec:
  // Draft: Edit ✅
  // Sent: Edit ❌
  const canEdit = ["DRAFT", "ACTIVE"].includes(status);
  const canCancel = ["DRAFT", "SENT", "ACTIVE"].includes(status);
  const canSend = status === "DRAFT";
  const canConvert = ["APPROVED", "ACCEPTED", "SENT"].includes(status);
  const canSell = !["ACCEPTED", "CONVERTED", "CANCELLED", "EXPIRED"].includes(status);

  if (!canCancel && !canEdit && !canSend && !canConvert && !canSell) return null;

  const handleCancel = async () => {
      if (!(await confirm({ title: "Cancel quotation?", description: "This quotation will be marked as cancelled. You can still view it, but it cannot be converted or sent.", confirmLabel: "Cancel quotation", destructive: true }))) return;
      setIsCancelling(true);
      try {
          await cancelQuotation(id);
          toast.success("Quotation cancelled");
      } catch (e) {
          console.error(e);
          toast.error("Failed to cancel quotation");
      } finally {
          setIsCancelling(false);
      }
  };

  const handleSend = async () => {
      setIsSending(true);
      try {
          await sendQuotation(id);
          toast.success("Quotation sent");
      } catch (e) {
          console.error(e);
          toast.error("Failed to send quotation");
      } finally {
          setIsSending(false);
      }
  };

  const handleConvert = async () => {
      if (!(await confirm({ title: "Convert quotation to invoice?", description: "This creates an invoice and locks the quotation. Review the quotation details before continuing.", confirmLabel: "Convert to invoice" }))) return;
      setIsConverting(true);
      try {
          const result = await convertQuotationToInvoice(id);
          if (result.success && result.invoiceId) {
              toast.success("Converted to Invoice");
              router.push(`/invoices/${result.invoiceId}`);
          } else {
             toast.error(result.message || "Failed to convert");
          }
      } catch (e) {
          console.error(e);
          toast.error("Failed to convert");
      } finally {
          setIsConverting(false);
      }
  };

  const saleLink = items.length === 1 
      ? `/sales/new?quoteId=${id}&inventoryId=${items[0].inventoryId}`
      : `/sales/new?quoteId=${id}`;

  return (
    <div className="flex gap-2 ml-auto">
      {canConvert && (
          <Button variant="default" size="sm" onClick={handleConvert} disabled={isConverting || isCancelling || isSending}>
              {isConverting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              Convert to Invoice
          </Button>
      )}
      <Button variant="outline" size="sm" onClick={handleCancel} disabled={isCancelling || isSending || isConverting}>
        {isCancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
        Cancel
      </Button>
      {canSend && (
          <Button variant="default" size="sm" onClick={handleSend} disabled={isSending || isCancelling || isConverting}>
              {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send / Submit
          </Button>
      )}
      {canEdit && (
        <Button variant="outline" size="sm" asChild disabled={isSending}>
          <Link href={`/quotes/${id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
          </Link>
        </Button>
      )}
      {canSell && (
      <Button size="sm" asChild>
        <Link href={saleLink}>
            <IndianRupee className="mr-2 h-4 w-4" />
            Mark as Sold
        </Link>
      </Button>
      )}
    </div>
  );
}
