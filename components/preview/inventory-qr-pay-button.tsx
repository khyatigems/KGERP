"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, LoaderCircle } from "lucide-react";

type CheckoutData = {
  keyId: string;
  attemptId: string;
  orderId: string;
  amount: number;
  currency: string;
  itemName: string;
  sku: string;
};

type RazorpayResult = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayOptions = {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  image?: string;
  notes?: { sku: string };
  theme: { color: string };
  handler: (result: RazorpayResult) => void;
  modal: { ondismiss: () => void };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open: () => void;
      on: (event: string, callback: (response: { error?: { description?: string } }) => void) => void;
    };
  }
}

async function loadRazorpay() {
  if (window.Razorpay) return true;
  return new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    const script = existing || document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    if (!existing) document.body.appendChild(script);
  });
}

export function InventoryQrPayButton({ sku, amountLabel }: { sku: string; amountLabel: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function beginPayment() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    setSuccess(false);
    try {
      const orderResponse = await fetch(`/api/preview/${encodeURIComponent(sku)}/payment/order`, { method: "POST", cache: "no-store" });
      const orderBody = await orderResponse.json() as CheckoutData & { message?: string };
      if (!orderResponse.ok) throw new Error(orderBody.message || "Could not start payment.");
      if (!(await loadRazorpay()) || !window.Razorpay) throw new Error("Secure checkout could not be loaded. Please try again.");

      let verificationStarted = false;
      const checkout = new window.Razorpay({
        key: orderBody.keyId,
        order_id: orderBody.orderId,
        amount: orderBody.amount,
        currency: orderBody.currency,
        name: "Khyati Gems",
        description: `${orderBody.itemName} · ${orderBody.sku}`,
        image: "/brand/khyatigems-logo.png",
        notes: { sku: orderBody.sku },
        theme: { color: "#202521" },
        handler: async (result) => {
          verificationStarted = true;
          try {
            const verification = await fetch(`/api/preview/${encodeURIComponent(sku)}/payment/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(result),
            });
            const verified = await verification.json() as { success?: boolean; message?: string; fullyPaid?: boolean };
            if (!verification.ok || !verified.success) throw new Error(verified.message || "Payment verification is pending.");
            setSuccess(true);
            setMessage(verified.fullyPaid ? "Payment confirmed. This gemstone is now marked as sold." : "Payment confirmed. The reserved item's remaining balance is still due.");
            router.refresh();
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Payment verification is pending. Please contact Khyati Gems if you were charged.");
          } finally {
            setBusy(false);
          }
        },
        modal: { ondismiss: () => {
          if (!verificationStarted) {
            fetch(`/api/preview/${encodeURIComponent(sku)}/payment/cancel`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ attemptId: orderBody.attemptId }) }).catch(() => {});
            setBusy(false);
            setMessage("Checkout closed. No payment was confirmed; you can try again when ready.");
          }
        } },
      });
      checkout.on("payment.failed", (response) => {
        setBusy(false);
        setMessage(response.error?.description || "Payment was not completed. Please try again.");
      });
      checkout.open();
    } catch (error) {
      setBusy(false);
      setMessage(error instanceof Error ? error.message : "Could not start payment.");
    }
  }

  return (
    <div className="kg-qr-payment">
      <button className="kg-button kg-button-dark" type="button" onClick={beginPayment} disabled={busy} aria-busy={busy}>
        {busy ? <LoaderCircle size={16} className="kg-qr-payment-spin" aria-hidden="true" /> : null}
        {busy ? "OPENING SECURE CHECKOUT" : `PAY NOW · ${amountLabel}`}
        {!busy && <ArrowUpRight size={16} aria-hidden="true" />}
      </button>
      {message && <p className={`kg-qr-payment-message${success ? " is-success" : ""}`} role={success ? "status" : "alert"}>{message}</p>}
      <style jsx>{`
        .kg-qr-payment{display:flex;flex-direction:column;align-items:flex-start;gap:8px}
        .kg-qr-payment button:disabled{cursor:wait;opacity:.7}
        .kg-qr-payment-message{margin:0;color:#9b3329;font-size:12px;line-height:1.55}
        .kg-qr-payment-message.is-success{color:#287247}
        .kg-qr-payment-spin{animation:kg-spin 1s linear infinite}
        @keyframes kg-spin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  );
}
