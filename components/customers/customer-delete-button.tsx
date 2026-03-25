"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteCustomer, getCustomerDeleteImpact } from "@/app/(dashboard)/customers/actions";

type Impact = {
  customerId: string;
  customerName: string;
  customerCode: string | null;
  salesCount: number;
  quotationCount: number;
  invoiceCount: number;
  paymentCount: number;
  creditNoteCount: number;
  creditBalance: number;
};

export function CustomerDeleteButton({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, startLoading] = useTransition();
  const [deleting, startDeleting] = useTransition();
  const [impact, setImpact] = useState<Impact | null>(null);
  const [ack1, setAck1] = useState(false);
  const [ack2, setAck2] = useState(false);
  const [typedDelete, setTypedDelete] = useState("");
  const [typedCode, setTypedCode] = useState("");

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) return;
    setImpact(null);
    setAck1(false);
    setAck2(false);
    setTypedDelete("");
    setTypedCode("");
    startLoading(async () => {
      const res = await getCustomerDeleteImpact(customerId);
      if (!res.success || !res.impact) {
        toast.error(res.message || "Failed to load delete impact");
        setOpen(false);
        return;
      }
      setImpact(res.impact as Impact);
    });
  };

  const hasLinked = useMemo(() => {
    if (!impact) return true;
    return (
      impact.invoiceCount > 0 ||
      impact.paymentCount > 0 ||
      impact.creditNoteCount > 0 ||
      impact.creditBalance > 0.009
    );
  }, [impact]);

  const hasQuotations = useMemo(() => {
    if (!impact) return false;
    return impact.quotationCount > 0;
  }, [impact]);

  const canConfirm = useMemo(() => {
    if (!impact) return false;
    const codeOk = impact.customerCode ? typedCode.trim() === impact.customerCode : typedCode.trim().toLowerCase() === impact.customerName.trim().toLowerCase();
    return ack1 && ack2 && typedDelete.trim() === "DELETE" && codeOk && !hasLinked;
  }, [ack1, ack2, typedDelete, typedCode, impact, hasLinked]);

  const onDelete = () => {
    if (!impact) return;
    startDeleting(async () => {
      const res = await deleteCustomer(customerId);
      if (!res.success) {
        toast.error(res.message || "Failed to delete customer");
        return;
      }
      toast.success("Customer deleted");
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={loading || deleting}>
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Customer</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. Delete is blocked when invoices/payments/credit notes exist. If only quotations exist, they will be deleted along with the customer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {!impact ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border p-3 text-sm">
              <div className="font-semibold">{impact.customerName}</div>
              <div className="text-muted-foreground">Customer Code: {impact.customerCode || "-"}</div>
            </div>

            <div className="rounded-md border p-3 text-sm space-y-1">
              <div>This action permanently removes the customer record.</div>
              <div className="text-muted-foreground">
                Linked data check: Sales {impact.salesCount}, Quotations {impact.quotationCount}, Invoices {impact.invoiceCount}, Payments {impact.paymentCount}, Credit Notes {impact.creditNoteCount}, CN Balance {impact.creditBalance.toFixed(2)}
              </div>
              {hasLinked ? (
                <div className="text-sm text-destructive font-medium">
                  Cannot delete: invoices/payments/credit notes are linked. Remove/merge the linked records first.
                </div>
              ) : hasQuotations ? (
                <div className="text-sm text-amber-600 font-medium">
                  Warning: {impact.quotationCount} quotation(s) will also be deleted.
                </div>
              ) : null}
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={ack1} onCheckedChange={(v) => setAck1(Boolean(v))} />
              I understand this cannot be undone
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={ack2} onCheckedChange={(v) => setAck2(Boolean(v))} />
              I confirm I want to delete this customer
            </label>

            <div className="grid gap-2">
              <div className="text-sm">Type DELETE to confirm</div>
              <Input value={typedDelete} onChange={(e) => setTypedDelete(e.target.value)} placeholder="DELETE" />
            </div>

            <div className="grid gap-2">
              <div className="text-sm">Type Customer Code (or customer name if code is empty)</div>
              <Input value={typedCode} onChange={(e) => setTypedCode(e.target.value)} placeholder={impact.customerCode || impact.customerName} />
            </div>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading || deleting}>Cancel</AlertDialogCancel>
          <Button variant="destructive" onClick={onDelete} disabled={!canConfirm || deleting || loading}>
            Delete Permanently
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
