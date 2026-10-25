"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowUpRight, Gem, LoaderCircle, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

interface InventoryQrPayButtonProps {
  sku: string;
  itemName: string;
  itemImage?: string | null;
  stockStatus: string;
  amountLabel: string;
}

function getStatusLabel(status: string) {
  switch (status) {
    case "IN_STOCK": return "Available now";
    case "RESERVED": return "Reserved";
    case "MEMO": return "Memo";
    case "SOLD": return "Sold";
    default: return status.replace(/_/g, " ").toLowerCase();
  }
}

export function InventoryQrPayButton({ sku, itemName, itemImage, stockStatus, amountLabel }: InventoryQrPayButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [starting, setStarting] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [imageUnavailable, setImageUnavailable] = useState(false);

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

  function continueToPayment() {
    if (busy || starting) return;
    setStarting(true);
    setReviewOpen(false);
    // Let Radix finish closing the review dialog before opening Razorpay's modal.
    window.setTimeout(() => { setStarting(false); void beginPayment(); }, 120);
  }

  return (
    <div className="kg-qr-payment">
      <button className="kg-button kg-button-dark" type="button" onClick={() => { setMessage(""); setReviewOpen(true); }} disabled={busy || starting} aria-busy={busy || starting}>
        {busy || starting ? <LoaderCircle size={16} className="kg-qr-payment-spin" aria-hidden="true" /> : null}
        {busy || starting ? "OPENING SECURE CHECKOUT" : `PAY NOW · ${amountLabel}`}
        {!busy && !starting && <ArrowUpRight size={16} aria-hidden="true" />}
      </button>
      {message && <p className={`kg-qr-payment-message${success ? " is-success" : ""}`} role={success ? "status" : "alert"}>{message}</p>}

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="kg-payment-review-dialog">
          <div className="kg-payment-review-brand"><Image src="/brand/khyatigems-logo.png" alt="Khyati Gems" width={104} height={50} /><span>SECURE GEMSTONE PAYMENT</span></div>
          <DialogHeader className="kg-payment-review-header">
            <p className="kg-payment-review-kicker">SECURE CHECKOUT</p>
            <DialogTitle className="kg-payment-review-title">Review your payment</DialogTitle>
            <DialogDescription className="kg-payment-review-description">Please confirm this gemstone and the amount before continuing to Razorpay.</DialogDescription>
          </DialogHeader>

          <section className="kg-payment-review-item" aria-label="Gemstone being paid for">
            <div className="kg-payment-review-image">
              {itemImage && !imageUnavailable
                ? <Image src={itemImage} alt={itemName} width={112} height={112} unoptimized onError={() => setImageUnavailable(true)} />
                : <Gem size={28} strokeWidth={1.3} aria-hidden="true" />}
            </div>
            <div className="kg-payment-review-item-details">
              <h3>{itemName}</h3>
              <p>Reference <span>{sku}</span></p>
              <span className={`kg-payment-review-status ${stockStatus === "RESERVED" ? "is-reserved" : stockStatus !== "IN_STOCK" ? "is-unavailable" : ""}`}>{getStatusLabel(stockStatus)}</span>
            </div>
          </section>

          <div className="kg-payment-review-total"><span>AMOUNT AUTHORISED BY KHAYATI GEMS</span><strong>{amountLabel}</strong></div>
          <p className="kg-payment-review-note">This amount is fixed for this payment request. You can review the final details in Razorpay before completing payment.</p>

          <button className="kg-payment-review-continue" type="button" onClick={continueToPayment} disabled={busy || starting}>
            {busy || starting ? <LoaderCircle size={17} className="kg-qr-payment-spin" aria-hidden="true" /> : null}
            {busy || starting ? "CONNECTING TO RAZORPAY" : "CONTINUE TO SECURE PAYMENT"} {!busy && !starting && <ArrowUpRight size={16} aria-hidden="true" />}
          </button>
          <div className="kg-payment-review-assurance"><ShieldCheck size={17} strokeWidth={1.6} aria-hidden="true" /><span>Secure payment processing by Razorpay</span></div>
        </DialogContent>
      </Dialog>

      <style jsx>{`
        .kg-qr-payment{display:flex;flex-direction:column;align-items:flex-start;gap:8px}
        .kg-qr-payment button:disabled{cursor:wait;opacity:.7}
        .kg-qr-payment-message{margin:0;color:#9b3329;font-size:12px;line-height:1.55}
        .kg-qr-payment-message.is-success{color:#287247}
        .kg-qr-payment-spin{animation:kg-spin 1s linear infinite}
        @keyframes kg-spin{to{transform:rotate(360deg)}}
      `}</style>

      <style jsx global>{`
        .kg-payment-review-dialog{display:block!important;width:min(100% - 32px,560px)!important;max-width:560px!important;max-height:calc(100dvh - 32px);overflow:auto;padding:0!important;gap:0!important;border:1px solid #d9d5cb!important;border-radius:4px!important;background:#fcfbf7!important;color:#202521!important;box-shadow:0 28px 90px #20252140!important}
        .kg-payment-review-dialog>button[data-slot="dialog-close"]{top:19px;right:19px;width:34px;height:34px;display:grid;place-items:center;border:1px solid #d9d5cb;border-radius:50%;background:#fcfbf7;color:#202521;opacity:1}
        .kg-payment-review-dialog>button[data-slot="dialog-close"] svg{width:15px;height:15px}
        .kg-payment-review-brand{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 28px;border-bottom:1px solid #e5e1d8;background:#f5f1e8}
        .kg-payment-review-brand img{display:block;width:94px;height:45px;object-fit:contain}
        .kg-payment-review-brand span{color:#806231;font-size:9px;font-weight:700;letter-spacing:.15em}
        .kg-payment-review-header{gap:0;padding:27px 30px 17px}
        .kg-payment-review-kicker{margin:0 0 8px;color:#806231;font-size:9px;font-weight:700;letter-spacing:.16em}
        .kg-payment-review-title{margin:0;color:#202521;font:500 30px/1.2 'KG Playfair',Georgia,serif!important}
        .kg-payment-review-description{margin-top:9px;color:#646960!important;font-size:13px!important;line-height:1.65!important}
        .kg-payment-review-item{display:flex;align-items:center;gap:17px;margin:0 30px;padding:17px;border:1px solid #e5e1d8;background:#fff}
        .kg-payment-review-image{display:grid;width:88px;height:88px;flex:0 0 88px;place-items:center;overflow:hidden;background:#f5f1e8;color:#806231}
        .kg-payment-review-image img{display:block;width:100%;height:100%;object-fit:cover}
        .kg-payment-review-item-details{min-width:0}
        .kg-payment-review-item-details h3{margin:0;color:#202521;font:500 19px/1.35 'KG Playfair',Georgia,serif;overflow-wrap:anywhere}
        .kg-payment-review-item-details p{margin:5px 0 10px;color:#777a72;font-size:10px;letter-spacing:.04em}
        .kg-payment-review-item-details p span{color:#353a34;font-weight:600}
        .kg-payment-review-status{display:inline-flex;align-items:center;min-height:24px;padding:3px 9px;border:1px solid #cbd9cc;background:#f1f6ef;color:#45633f;font-size:9px;font-weight:700;letter-spacing:.07em;text-transform:uppercase}
        .kg-payment-review-status.is-reserved{border-color:#e5d4b7;background:#fbf5e9;color:#806231}
        .kg-payment-review-status.is-unavailable{border-color:#ddd;background:#f3f2ee;color:#646960}
        .kg-payment-review-total{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin:19px 30px 0;padding-bottom:15px;border-bottom:1px solid #d9d5cb}
        .kg-payment-review-total span{max-width:230px;color:#777a72;font-size:9px;font-weight:700;letter-spacing:.11em;line-height:1.5}
        .kg-payment-review-total strong{color:#202521;font:500 27px/1.1 'KG Playfair',Georgia,serif;white-space:nowrap}
        .kg-payment-review-note{margin:13px 30px 20px;color:#646960;font-size:11px;line-height:1.65}
        .kg-payment-review-continue{display:flex;width:calc(100% - 60px);min-height:54px;align-items:center;justify-content:center;gap:10px;margin:0 30px;padding:14px 16px;border:1px solid #202521;border-radius:2px;background:#202521;color:#fff;cursor:pointer;font-size:10px;font-weight:700;letter-spacing:.08em;transition:background-color .18s,transform .18s}
        .kg-payment-review-continue:hover{transform:translateY(-1px);background:#3d443c}
        .kg-payment-review-continue:disabled{cursor:wait;opacity:.7}
        .kg-payment-review-assurance{display:flex;align-items:center;justify-content:center;gap:7px;margin:17px 20px 21px;color:#646960;font-size:10px}
        .kg-payment-review-assurance svg{color:#806231}
        @media(max-width:560px){.kg-payment-review-brand{padding:14px 20px}.kg-payment-review-header{padding:23px 20px 15px}.kg-payment-review-title{font-size:27px!important}.kg-payment-review-item{gap:13px;margin-inline:20px;padding:12px}.kg-payment-review-image{width:72px;height:72px;flex-basis:72px}.kg-payment-review-item-details h3{font-size:17px}.kg-payment-review-total{margin-inline:20px}.kg-payment-review-note{margin-inline:20px}.kg-payment-review-continue{width:calc(100% - 40px);margin-inline:20px}.kg-payment-review-assurance{margin-bottom:18px}}
        @media(prefers-reduced-motion:reduce){.kg-payment-review-continue{transition:none}}
      `}</style>
    </div>
  );
}
