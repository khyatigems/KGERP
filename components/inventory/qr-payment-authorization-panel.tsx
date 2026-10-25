"use client";

import { FormEvent, useState } from "react";
import { saveInventoryQrPaymentAuthorization } from "@/app/(dashboard)/inventory/qr-payment-actions";

type ExistingAuthorization = {
  enabled: boolean;
  totalAmount: number;
  amountToCollect: number;
  allowPartial: boolean;
  paidAmount: number;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  orderReference: string | null;
} | null;

type PaymentAttemptSummary = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerRemarks: string | null;
  createdAt: Date;
};

const fieldClass = "mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm";

export function QrPaymentAuthorizationPanel({ inventoryId, sku, status, defaultTotalAmount, authorization, paymentAttempts }: {
  inventoryId: string;
  sku: string;
  status: string;
  defaultTotalAmount: number;
  authorization: ExistingAuthorization;
  paymentAttempts: PaymentAttemptSummary[];
}) {
  const allowed = ["IN_STOCK", "RESERVED"].includes(status.toUpperCase());
  const [enabled, setEnabled] = useState(authorization?.enabled || false);
  const [allowPartial, setAllowPartial] = useState(authorization?.allowPartial || false);
  const [totalAmount, setTotalAmount] = useState(String(authorization?.totalAmount ?? defaultTotalAmount ?? ""));
  const [amountToCollect, setAmountToCollect] = useState(String(authorization?.amountToCollect ?? defaultTotalAmount ?? ""));
  const [customerName, setCustomerName] = useState(authorization?.customerName || "");
  const [customerEmail, setCustomerEmail] = useState(authorization?.customerEmail || "");
  const [customerPhone, setCustomerPhone] = useState(authorization?.customerPhone || "");
  const [orderReference, setOrderReference] = useState(authorization?.orderReference || "");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      const result = await saveInventoryQrPaymentAuthorization(inventoryId, {
        enabled,
        totalAmount: Number(totalAmount),
        amountToCollect: Number(amountToCollect),
        allowPartial,
        customerName,
        customerEmail,
        customerPhone,
        orderReference,
      });
      setFeedback({ ok: result.success, text: result.message });
    } catch {
      setFeedback({ ok: false, text: "Could not save QR payment settings. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  const paid = authorization?.paidAmount || 0;
  return (
    <section className="rounded-xl border bg-card p-6 text-card-foreground shadow">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-lg font-semibold">QR Page Payment</h2><p className="mt-1 text-sm text-muted-foreground">Choose whether customers can pay for this item from its QR product page · SKU {sku}</p></div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${enabled ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}>{enabled ? "Payment enabled" : "Payment disabled"}</span>
      </div>
      {!allowed && <p className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">This item&apos;s current status ({status}) cannot accept QR payments. Only In Stock and Reserved items can be enabled.</p>}
      {paid > 0 && <p className="mb-4 rounded-md bg-muted p-3 text-sm">Paid so far: ₹{paid.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>}
      {paymentAttempts.length > 0 && <div className="mb-5 rounded-lg border bg-muted/30 p-4">
        <h3 className="text-sm font-semibold">Customer payment submissions</h3>
        <p className="mt-1 text-xs text-muted-foreground">Payer details entered on this public QR page. Visible only to ERP users with access to this inventory record.</p>
        <div className="mt-3 space-y-3">
          {paymentAttempts.map((attempt) => <article key={attempt.id} className="rounded-md border bg-background p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2"><strong>{attempt.customerName || "Customer details unavailable"}</strong><span className="rounded-full bg-muted px-2 py-1 text-[11px] font-medium">{attempt.status.replace(/_/g, " ")}</span></div>
            <p className="mt-1 text-xs text-muted-foreground">{attempt.customerEmail || "No email"}{attempt.customerPhone ? ` · ${attempt.customerPhone}` : ""}</p>
            <p className="mt-1 text-xs text-muted-foreground">{new Date(attempt.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })} · ₹{attempt.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {attempt.currency}</p>
            {attempt.customerRemarks && <p className="mt-2 whitespace-pre-wrap rounded bg-muted/50 p-2 text-xs">Remark: {attempt.customerRemarks}</p>}
          </article>)}
        </div>
      </div>}
      <form className="space-y-5" onSubmit={onSubmit}>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} disabled={!allowed && !enabled} className="mt-1 h-4 w-4" />
          <span><strong>Enable Pay Now on this item&apos;s QR page</strong><span className="mt-1 block text-xs text-muted-foreground">{allowPartial ? "Customers can choose a smaller amount. The ERP will cap each payment at your limit and the unpaid payment-request balance." : "Customers will be charged the fixed amount saved below."}</span></span>
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm">Payment-request balance<input className={fieldClass} type="number" min="0.01" step="0.01" value={totalAmount} onChange={(event) => setTotalAmount(event.target.value)} required /><span className="mt-1 block text-xs text-muted-foreground">The total amount this QR payment request is collecting.</span></label>
          <label className="text-sm">{allowPartial ? "Maximum per payment" : "Fixed payment amount"}<input className={fieldClass} type="number" min="0.01" step="0.01" value={amountToCollect} onChange={(event) => setAmountToCollect(event.target.value)} required /><span className="mt-1 block text-xs text-muted-foreground">{allowPartial ? "Customers may enter any amount from ₹1 up to this limit." : "This amount is charged when the customer continues to Razorpay."}</span></label>
        </div>
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={allowPartial} onChange={(event) => setAllowPartial(event.target.checked)} className="h-4 w-4" /><span>Allow customer to choose a partial amount</span></label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm">Reserved customer name<input className={fieldClass} autoComplete="name" maxLength={160} value={customerName} onChange={(event) => setCustomerName(event.target.value)} /></label>
          <label className="text-sm">Customer email<input className={fieldClass} type="email" autoComplete="email" maxLength={254} value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} /></label>
          <label className="text-sm">Customer phone<input className={fieldClass} type="tel" autoComplete="tel" maxLength={40} value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} /></label>
          <label className="text-sm">Customer/order reference<input className={fieldClass} maxLength={120} value={orderReference} onChange={(event) => setOrderReference(event.target.value)} /></label>
        </div>
        {feedback && <p className={`rounded-md p-3 text-sm ${feedback.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`} role={feedback.ok ? "status" : "alert"}>{feedback.text}</p>}
        <button type="submit" disabled={busy || (!allowed && enabled)} className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">{busy ? "Saving…" : "Save QR Payment Settings"}</button>
      </form>
    </section>
  );
}
