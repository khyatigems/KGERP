"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowUpRight, Gem, LoaderCircle, MessageCircle, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";

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
  prefill?: { name: string; email: string; contact: string };
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
  maximumAmount: number;
  remainingBalance: number;
  allowPartial: boolean;
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

export function InventoryQrPayButton({ sku, itemName, itemImage, stockStatus, maximumAmount, remainingBalance, allowPartial }: InventoryQrPayButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [starting, setStarting] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [imageUnavailable, setImageUnavailable] = useState(false);
  const [amountInput, setAmountInput] = useState(maximumAmount.toFixed(2));
  const [amountTouched, setAmountTouched] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerRemarks, setCustomerRemarks] = useState("");
  const [customerTouched, setCustomerTouched] = useState(false);

  const requestedAmount = Number(amountInput);
  const amountInPaise = Math.round(requestedAmount * 100);
  const amountIsValid = !allowPartial || (
    Number.isFinite(requestedAmount) &&
    Math.abs(requestedAmount * 100 - amountInPaise) < 0.0001 &&
    amountInPaise >= 100 &&
    requestedAmount <= maximumAmount + 0.001 &&
    requestedAmount <= remainingBalance + 0.001
  );
  const paymentAmount = allowPartial ? requestedAmount : maximumAmount;
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim());
  const phoneDigits = customerPhone.replace(/\D/g, "");
  const phoneIsValid = /^\+?[\d\s()-]+$/.test(customerPhone.trim()) && phoneDigits.length >= 7 && phoneDigits.length <= 15;
  const nameIsValid = Boolean(customerName.trim()) && customerName.trim().length <= 160;
  const customerIsValid = nameIsValid && emailIsValid && phoneIsValid && customerRemarks.length <= 500;
  const amountError = !amountInput.trim()
    ? "Enter an amount to continue."
    : !Number.isFinite(requestedAmount) || amountInPaise < 100
      ? "Enter at least ₹1.00."
      : Math.abs(requestedAmount * 100 - amountInPaise) >= 0.0001
        ? "Use no more than two decimal places."
        : requestedAmount > maximumAmount + 0.001
          ? `The maximum available now is ${formatCurrency(maximumAmount)}.`
          : requestedAmount > remainingBalance + 0.001
            ? `The remaining balance is ${formatCurrency(remainingBalance)}.`
            : "";

  async function beginPayment(amount: number) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    setSuccess(false);
    try {
      const orderResponse = await fetch(`/api/preview/${encodeURIComponent(sku)}/payment/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, customerName: customerName.trim(), customerEmail: customerEmail.trim(), customerPhone: customerPhone.trim(), customerRemarks: customerRemarks.trim() }),
        cache: "no-store",
      });
      const orderBody = await orderResponse.json() as CheckoutData & { message?: string };
      if (!orderResponse.ok) throw new Error(orderBody.message || "Could not start payment.");
      if (orderBody.amount !== Math.round(amount * 100)) throw new Error("The payment amount changed. Please refresh the product page and review it again.");
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
        prefill: { name: customerName.trim(), email: customerEmail.trim(), contact: customerPhone.trim() },
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
            setMessage(verified.fullyPaid ? "Payment confirmed. This gemstone is now marked as sold." : "Payment confirmed. The remaining balance is due; this gemstone will stay reserved until it is paid in full.");
            router.refresh();
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Payment verification is pending. Please contact Khyati Gems if you were charged.");
          } finally {
            setBusy(false);
          }
        },
        modal: { ondismiss: async () => {
          if (!verificationStarted) {
            try {
              const cancelled = await fetch(`/api/preview/${encodeURIComponent(sku)}/payment/cancel`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ attemptId: orderBody.attemptId }),
              });
              if (!cancelled.ok) throw new Error("Could not close the payment session.");
              setMessage("Checkout closed. No payment was confirmed; you can try again when ready.");
            } catch {
              setMessage("Checkout closed. Refresh this page before starting another payment.");
            } finally {
              setBusy(false);
            }
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
    setCustomerTouched(true);
    if (!customerIsValid) return;
    if (!amountIsValid) {
      setAmountTouched(true);
      return;
    }
    setStarting(true);
    setReviewOpen(false);
    // Let Radix finish closing the review dialog before opening Razorpay's modal.
    window.setTimeout(() => { setStarting(false); void beginPayment(paymentAmount); }, 120);
  }

  return (
    <div className="kg-qr-payment">
      <button className="kg-button kg-button-dark" type="button" onClick={() => { setMessage(""); setReviewOpen(true); }} disabled={busy || starting} aria-busy={busy || starting}>
        {busy || starting ? <LoaderCircle size={16} className="kg-qr-payment-spin" aria-hidden="true" /> : null}
        {busy || starting ? "OPENING SECURE CHECKOUT" : allowPartial ? "PAY NOW · CHOOSE AMOUNT" : `PAY NOW · ${formatCurrency(maximumAmount)}`}
        {!busy && !starting && <ArrowUpRight size={16} aria-hidden="true" />}
      </button>
      <div className="kg-razorpay-mark" aria-label="Checkout provided by Razorpay" style={{ position: "relative", display: "inline-flex", minHeight: 26, alignItems: "center", gap: 8, overflow: "hidden", border: "1px solid #d9d5cb", borderRadius: 2, backgroundColor: "#202521", padding: "4px 9px", color: "#f5f1e8", fontSize: 8, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase" }}><span>Checkout by</span><Image src="/brand/razorpay-logo-white.png" alt="Razorpay" width={82} height={20} style={{ display: "block", width: 68, height: 16, objectFit: "contain" }} /></div>
      {message && <p className={`kg-qr-payment-message${success ? " is-success" : ""}`} role={success ? "status" : "alert"}>{message}</p>}

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="kg-payment-review-dialog" showCloseButton={false}>
          <div className="kg-payment-review-brandbar">
            <div className="kg-payment-review-brand"><Image src="/brand/khyatigems-logo.png" alt="Khyati Gems" width={104} height={50} /><span className="kg-payment-gem-label"><Gem size={14} aria-hidden="true" /> SECURE GEMSTONE PAYMENT</span></div>
            <DialogClose asChild><button className="kg-payment-review-close" type="button" aria-label="Close payment details"><X size={18} aria-hidden="true" /></button></DialogClose>
          </div>
          <div className="kg-payment-gemstone-accent" aria-hidden="true"><span /><span /><span /><span /><Gem size={24} strokeWidth={1.25} /></div>
          <DialogHeader className="kg-payment-review-header">
            <p className="kg-payment-review-kicker">A PAYMENT REQUEST FROM KHAYATI GEMS</p>
            <DialogTitle className="kg-payment-review-title">Complete your gemstone payment</DialogTitle>
            <DialogDescription className="kg-payment-review-description">Review the gemstone and amount below. You’ll complete payment in Razorpay’s checkout.</DialogDescription>
          </DialogHeader>

          <section className="kg-payment-review-item" aria-label="Gemstone being paid for">
            <div className="kg-payment-review-image">
              {itemImage && !imageUnavailable
                ? <Image src={itemImage} alt={itemName} width={112} height={112} unoptimized onError={() => setImageUnavailable(true)} />
                : <Gem size={28} strokeWidth={1.3} aria-hidden="true" />}
            </div>
            <div className="kg-payment-review-item-details">
              <h3>{itemName}</h3>
              <p>Item reference <span>{sku}</span></p>
              <p className={`kg-payment-review-status ${stockStatus === "RESERVED" ? "is-reserved" : stockStatus !== "IN_STOCK" ? "is-unavailable" : ""}`}><i aria-hidden="true" />{getStatusLabel(stockStatus)}</p>
            </div>
          </section>

          <section className="kg-payment-contact-section" aria-labelledby="kg-payment-contact-heading">
            <div className="kg-payment-contact-heading"><h3 id="kg-payment-contact-heading">Payment contact</h3><p>Used to identify this payment and prefill Razorpay checkout. These details are not shown on the public QR page.</p></div>
            <div className="kg-payment-contact-grid">
              <div className="kg-payment-contact-field"><label htmlFor="kg-payment-customer-name">Customer name <span>Required</span></label><input id="kg-payment-customer-name" type="text" autoComplete="off" maxLength={160} value={customerName} onChange={(event) => setCustomerName(event.target.value)} onBlur={() => setCustomerTouched(true)} aria-invalid={customerTouched && !nameIsValid} aria-describedby={customerTouched && !nameIsValid ? "kg-payment-name-error" : undefined} />{customerTouched && !nameIsValid && <p id="kg-payment-name-error" className="kg-payment-contact-error">Enter the payer&apos;s name.</p>}</div>
              <div className="kg-payment-contact-field"><label htmlFor="kg-payment-customer-email">Email address <span>Required</span></label><input id="kg-payment-customer-email" type="email" inputMode="email" autoComplete="off" maxLength={254} value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} onBlur={() => setCustomerTouched(true)} aria-invalid={customerTouched && !emailIsValid} aria-describedby={customerTouched && !emailIsValid ? "kg-payment-email-error" : undefined} />{customerTouched && !emailIsValid && <p id="kg-payment-email-error" className="kg-payment-contact-error">Enter a valid email address.</p>}</div>
              <div className="kg-payment-contact-field"><label htmlFor="kg-payment-customer-phone">Phone number <span>Required</span></label><input id="kg-payment-customer-phone" type="tel" inputMode="tel" autoComplete="off" maxLength={24} value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} onBlur={() => setCustomerTouched(true)} aria-invalid={customerTouched && !phoneIsValid} aria-describedby={customerTouched && !phoneIsValid ? "kg-payment-phone-error" : undefined} />{customerTouched && !phoneIsValid && <p id="kg-payment-phone-error" className="kg-payment-contact-error">Enter a valid phone number with country code if needed.</p>}</div>
              <div className="kg-payment-contact-field kg-payment-contact-wide"><label htmlFor="kg-payment-customer-remarks">Remarks <span>Optional</span></label><textarea id="kg-payment-customer-remarks" rows={2} maxLength={500} value={customerRemarks} onChange={(event) => setCustomerRemarks(event.target.value)} onBlur={() => setCustomerTouched(true)} aria-invalid={customerTouched && customerRemarks.length > 500} /><p className="kg-payment-remarks-count">{customerRemarks.length}/500</p></div>
            </div>
          </section>

          <section className="kg-payment-amount-section" aria-label="Payment amount">
            {allowPartial ? (
              <>
                <label className="kg-payment-amount-label" htmlFor="kg-custom-payment-amount">Amount to pay today</label>
                <div className={`kg-payment-amount-input ${amountTouched && !amountIsValid ? "has-error" : ""}`}>
                  <span aria-hidden="true">₹</span>
                  <input
                    id="kg-custom-payment-amount"
                    type="number"
                    inputMode="decimal"
                    min="1"
                    max={Math.min(maximumAmount, remainingBalance)}
                    step="0.01"
                    value={amountInput}
                    aria-invalid={amountTouched && !amountIsValid}
                    aria-describedby="kg-payment-amount-help kg-payment-amount-error"
                    onChange={(event) => { setAmountInput(event.target.value); setAmountTouched(true); }}
                  />
                  <span className="kg-payment-amount-currency">INR</span>
                </div>
                <p id="kg-payment-amount-help" className="kg-payment-amount-help">Payment-request balance: {formatCurrency(remainingBalance)}. Choose any amount from ₹1.00 up to {formatCurrency(Math.min(maximumAmount, remainingBalance))} today.</p>
                {amountIsValid && <p className="kg-payment-amount-after">Payment-request balance after payment: {formatCurrency(Math.max(0, remainingBalance - paymentAmount))}</p>}
                {amountTouched && !amountIsValid && <p id="kg-payment-amount-error" className="kg-payment-amount-error" role="alert">{amountError}</p>}
                {!amountTouched && <span id="kg-payment-amount-error" className="kg-payment-amount-error" aria-hidden="true" />}
              </>
            ) : (
              <>
                <span className="kg-payment-amount-label">Amount to pay</span>
                <strong className="kg-payment-fixed-amount">{formatCurrency(maximumAmount)}</strong>
                <p className="kg-payment-amount-help">This is the amount set for this gemstone payment request.</p>
              </>
            )}
          </section>

          <button className="kg-payment-review-continue" type="button" onClick={continueToPayment} disabled={busy || starting || (allowPartial && !amountIsValid)}>
            {busy || starting ? <LoaderCircle size={17} className="kg-qr-payment-spin" aria-hidden="true" /> : null}
            {busy || starting ? "CONNECTING TO RAZORPAY" : allowPartial && !amountIsValid ? "CHECK PAYMENT AMOUNT" : `PAY ${formatCurrency(paymentAmount)} SECURELY`} {!busy && !starting && amountIsValid && <ArrowUpRight size={16} aria-hidden="true" />}
          </button>
          <div className="kg-payment-review-footer"><div className="kg-payment-review-provider"><span>Checkout by</span><Image src="/brand/razorpay-logo-white.png" alt="Razorpay" width={82} height={20} /></div><p>Your card and UPI details are entered only in Razorpay checkout.</p><a href={`https://wa.me/919915270295?text=${encodeURIComponent(`Hello Khyati Gems, I need help with payment for ${sku}.`)}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={14} aria-hidden="true" />Need help? Talk to our team</a></div>
        </DialogContent>
      </Dialog>

      <style jsx>{`
        .kg-qr-payment{display:flex;flex-direction:column;align-items:flex-start;gap:8px}
        .kg-qr-payment button:disabled{cursor:wait;opacity:.7}
        .kg-razorpay-mark{position:relative;display:inline-flex;min-height:26px;align-items:center;gap:8px;overflow:hidden;border:1px solid #d9d5cb;border-radius:2px;background:#202521;padding:4px 9px;color:#f5f1e8;font-size:8px;font-weight:600;letter-spacing:.08em;text-transform:uppercase}
        .kg-razorpay-mark:after{position:absolute;inset:0;content:"";background:linear-gradient(110deg,transparent 38%,#ffffff20 50%,transparent 62%);transform:translateX(-120%);animation:kg-provider-glint 6s ease-in-out infinite;pointer-events:none}
        .kg-razorpay-mark img{display:block;width:68px;height:16px;object-fit:contain}
        .kg-qr-payment-message{margin:0;color:#9b3329;font-size:12px;line-height:1.55}
        .kg-qr-payment-message.is-success{color:#287247}
        .kg-qr-payment-spin{animation:kg-spin 1s linear infinite}
        @keyframes kg-provider-glint{0%,68%,100%{transform:translateX(-120%)}82%{transform:translateX(120%)}}
        @keyframes kg-spin{to{transform:rotate(360deg)}}
      `}</style>

      <style jsx global>{`
        [data-slot="dialog-overlay"]{z-index:110!important}
        body:has(.kg-payment-review-dialog) .kg-site-header{z-index:1!important}
        .kg-payment-review-dialog{position:fixed!important;z-index:120!important;display:block!important;width:min(100% - 32px,560px)!important;max-width:560px!important;max-height:calc(100dvh - 32px);overflow:auto;padding:0!important;gap:0!important;border:1px solid #d9d5cb!important;border-radius:3px!important;background:#fcfbf7!important;color:#202521!important;box-shadow:0 26px 80px #20252135!important}
        .kg-payment-review-brandbar{position:sticky;top:0;z-index:5;display:flex;min-height:74px;align-items:center;justify-content:space-between;gap:16px;padding:12px 24px;border-bottom:1px solid #ded9cf;background:#f5f1e8}
        .kg-payment-review-brand{display:flex;min-width:0;align-items:center;gap:16px}
        .kg-payment-review-brand img{display:block;width:82px;height:43px;flex:0 0 82px;object-fit:contain}
        .kg-payment-gem-label{display:inline-flex;align-items:center;gap:8px;color:#806231;font-size:9px;font-weight:700;letter-spacing:.13em;white-space:nowrap}
        .kg-payment-gem-label svg{color:#96733b;animation:kg-gem-float 3.4s ease-in-out infinite}
        .kg-payment-review-close{display:grid;width:38px;height:38px;flex:0 0 38px;place-items:center;border:1px solid #d3cec3;border-radius:50%;background:#fcfbf7;color:#202521;cursor:pointer;transition:background .18s,border-color .18s,transform .18s}
        .kg-payment-review-close:hover{transform:rotate(90deg);border-color:#96733b;background:#fff}
        .kg-payment-review-close:focus-visible{outline:2px solid #96733b;outline-offset:3px}
        .kg-payment-gemstone-accent{position:absolute;top:101px;right:31px;width:84px;height:84px;pointer-events:none;color:#96733b;opacity:.075}
        .kg-payment-gemstone-accent span{position:absolute;inset:8px;border:1px solid currentColor;transform:rotate(45deg)}
        .kg-payment-gemstone-accent span:nth-child(2){inset:17px 4px;transform:rotate(0deg)}
        .kg-payment-gemstone-accent span:nth-child(3){inset:4px 17px;transform:rotate(0deg)}
        .kg-payment-gemstone-accent span:nth-child(4){inset:14px;transform:rotate(0deg)}
        .kg-payment-gemstone-accent svg{position:absolute;top:30px;left:30px;animation:kg-gem-float 3.4s ease-in-out infinite}
        .kg-payment-review-header{gap:0;padding:25px 30px 15px}
        .kg-payment-review-kicker{margin:0 0 8px;color:#806231;font-size:9px;font-weight:700;letter-spacing:.15em}
        .kg-payment-review-title{max-width:400px;margin:0;color:#202521;font:500 clamp(25px,4vw,31px)/1.2 'KG Playfair',Georgia,serif!important;letter-spacing:-.015em}
        .kg-payment-review-description{max-width:420px;margin-top:8px;color:#646960!important;font-size:12px!important;line-height:1.65!important}
        .kg-payment-review-item{display:flex;align-items:center;gap:16px;margin:0 30px;padding:13px 0 17px;border-bottom:1px solid #d9d5cb}
        .kg-payment-review-image{display:grid;width:68px;height:68px;flex:0 0 68px;place-items:center;overflow:hidden;background:#f1ede4;color:#806231}
        .kg-payment-review-image img{display:block;width:100%;height:100%;object-fit:cover}
        .kg-payment-review-item-details{min-width:0}
        .kg-payment-review-item-details h3{margin:0;color:#202521;font:500 19px/1.35 'KG Playfair',Georgia,serif;overflow-wrap:anywhere}
        .kg-payment-review-item-details p{margin:4px 0 0;color:#777a72;font-size:10px;letter-spacing:.035em}
        .kg-payment-review-item-details p span{color:#353a34;font-weight:600}
        .kg-payment-review-item-details p.kg-payment-review-status{display:flex;align-items:center;gap:7px;margin-top:8px;color:#45633f;font-size:10px;font-weight:600;letter-spacing:.025em}
        .kg-payment-review-status i{width:7px;height:7px;border-radius:50%;background:#5d8a56}
        .kg-payment-review-status.is-reserved{color:#806231!important}
        .kg-payment-review-status.is-reserved i{background:#b58a4b}
        .kg-payment-review-status.is-unavailable{color:#646960!important}
        .kg-payment-review-status.is-unavailable i{background:#777a72}
        .kg-payment-contact-section{margin:15px 30px 0;padding:0 0 16px;border-bottom:1px solid #d9d5cb}
        .kg-payment-contact-heading h3{margin:0;color:#202521;font-size:12px;font-weight:700;letter-spacing:.045em}
        .kg-payment-contact-heading p{margin:4px 0 0;color:#777a72;font-size:9px;line-height:1.55}
        .kg-payment-contact-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 13px;margin-top:11px}
        .kg-payment-contact-field{display:flex;min-width:0;flex-direction:column;gap:5px}
        .kg-payment-contact-field label{display:flex;align-items:center;justify-content:space-between;gap:6px;color:#4b5049;font-size:9px;font-weight:600}
        .kg-payment-contact-field label span{color:#8a897f;font-size:8px;font-weight:500}
        .kg-payment-contact-field input,.kg-payment-contact-field textarea{width:100%;min-width:0;border:1px solid #d4d0c6;border-radius:1px;background:#fff;padding:9px 10px;color:#202521;font:400 11px/1.45 Arial,sans-serif;outline:0;transition:border-color .18s,box-shadow .18s;resize:vertical}
        .kg-payment-contact-field input{height:36px}
        .kg-payment-contact-field input:focus,.kg-payment-contact-field textarea:focus{border-color:#96733b;box-shadow:0 0 0 2px #96733b1a}
        .kg-payment-contact-field input[aria-invalid=true],.kg-payment-contact-field textarea[aria-invalid=true]{border-color:#a33a30}
        .kg-payment-contact-wide{grid-column:1/-1}
        .kg-payment-contact-error{margin:0;color:#a33a30;font-size:9px;line-height:1.4}
        .kg-payment-remarks-count{margin:0;color:#8a897f;font-size:8px;text-align:right}
        .kg-payment-amount-section{margin:18px 30px 0;padding:0 0 18px;border-bottom:1px solid #d9d5cb}
        .kg-payment-amount-label{display:block;margin:0 0 7px;color:#777a72;font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
        .kg-payment-amount-input{display:flex;min-height:54px;align-items:center;gap:10px;padding:0 13px;border:1px solid #c9c5bb;background:#fff;transition:border-color .18s,box-shadow .18s}
        .kg-payment-amount-input:focus-within{border-color:#96733b;box-shadow:0 0 0 3px #96733b1a}
        .kg-payment-amount-input.has-error{border-color:#a33a30}
        .kg-payment-amount-input>span:first-child{color:#806231;font:500 22px/1 'KG Playfair',Georgia,serif}
        .kg-payment-amount-input input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:#202521;font:500 25px/1.2 'KG Playfair',Georgia,serif}
        .kg-payment-amount-input input::-webkit-inner-spin-button,.kg-payment-amount-input input::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
        .kg-payment-amount-input input[type=number]{appearance:textfield;-moz-appearance:textfield}
        .kg-payment-amount-currency{color:#777a72;font-size:9px;letter-spacing:.12em}
        .kg-payment-amount-help{margin:8px 0 0;color:#646960;font-size:10px;line-height:1.6}
        .kg-payment-amount-after{margin:4px 0 0;color:#806231;font-size:10px;font-weight:600;line-height:1.5}
        .kg-payment-amount-error{margin:6px 0 0;color:#a33a30;font-size:10px;line-height:1.5}
        .kg-payment-fixed-amount{display:block;color:#202521;font:500 30px/1.15 'KG Playfair',Georgia,serif}
        .kg-payment-review-continue{display:flex;width:calc(100% - 60px);min-height:52px;align-items:center;justify-content:center;gap:9px;margin:18px 30px 0;padding:13px 16px;border:1px solid #202521;border-radius:2px;background:#202521;color:#fff;cursor:pointer;font-size:10px;font-weight:700;letter-spacing:.08em;transition:background-color .18s,transform .18s}
        .kg-payment-review-continue:hover{transform:translateY(-1px);background:#3d443c}
        .kg-payment-review-continue:disabled{cursor:wait;opacity:.7}
        .kg-payment-review-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 30px;padding:15px 0 19px}
        .kg-payment-review-provider{position:relative;display:flex;min-width:142px;min-height:34px;align-items:center;gap:7px;overflow:hidden;border:1px solid #343a35;border-radius:2px;background:#202521;padding:5px 8px;color:#ded9cf;font-size:7px;letter-spacing:.04em;white-space:nowrap}
        .kg-payment-review-provider:after{position:absolute;inset:0;content:"";background:linear-gradient(110deg,transparent 35%,#ffffff20 50%,transparent 65%);transform:translateX(-120%);animation:kg-provider-glint 6s ease-in-out infinite;pointer-events:none}
        .kg-payment-review-provider img{display:block;width:66px;height:16px;object-fit:contain}
        .kg-payment-review-footer p{max-width:300px;margin:0;color:#777a72;font-size:9px;line-height:1.55}
        .kg-payment-review-footer a{display:inline-flex;flex:0 0 auto;align-items:center;gap:6px;color:#806231;font-size:10px;font-weight:600;text-decoration:none}
        .kg-payment-review-footer a:hover{text-decoration:underline;text-underline-offset:3px}
        @keyframes kg-gem-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
        @media(max-width:560px){.kg-payment-review-brandbar{min-height:67px;padding:10px 17px}.kg-payment-review-brand{gap:10px}.kg-payment-review-brand img{width:72px;height:39px;flex-basis:72px}.kg-payment-gem-label{gap:5px;font-size:7px;letter-spacing:.08em}.kg-payment-review-close{width:35px;height:35px;flex-basis:35px}.kg-payment-gemstone-accent{top:96px;right:22px;width:68px;height:68px}.kg-payment-gemstone-accent svg{top:23px;left:23px}.kg-payment-review-header{padding:22px 21px 13px}.kg-payment-review-title{max-width:320px;font-size:26px!important}.kg-payment-review-description{max-width:330px;font-size:11px!important}.kg-payment-review-item{gap:12px;margin-inline:21px;padding:11px 0 14px}.kg-payment-review-image{width:60px;height:60px;flex-basis:60px}.kg-payment-review-item-details h3{font-size:17px}.kg-payment-contact-section{margin:14px 21px 0}.kg-payment-contact-grid{gap:9px}.kg-payment-contact-field input{height:35px}.kg-payment-amount-section{margin:16px 21px 0}.kg-payment-amount-input{min-height:50px}.kg-payment-amount-input input{font-size:23px}.kg-payment-review-continue{width:calc(100% - 42px);margin:16px 21px 0}.kg-payment-review-footer{align-items:flex-start;flex-direction:column;margin-inline:21px;gap:10px;padding-bottom:17px}}
        @media(max-width:380px){.kg-payment-contact-grid{grid-template-columns:1fr}.kg-payment-contact-wide{grid-column:auto}}
        @media(prefers-reduced-motion:reduce){.kg-payment-review-close,.kg-payment-review-continue{transition:none}.kg-payment-gem-label svg,.kg-payment-gemstone-accent svg,.kg-payment-review-provider:after{animation:none}.kg-razorpay-mark:after{animation:none}}
      `}</style>
    </div>
  );
}
