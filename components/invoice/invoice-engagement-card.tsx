"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { formatInrNumber } from "@/lib/number-formatting";

type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  ctaText: string | null;
  ctaLink: string | null;
};

export function InvoiceEngagementCard({
  token,
  customerName,
  banners,
  loyalty,
  coupon,
  canCaptureProfile,
  missingDob,
  missingAnniversary,
}: {
  token: string;
  customerName: string;
  banners: Banner[];
  loyalty: { balancePoints: number; balanceValue: number; earnedPointsThisInvoice: number; redeemedValueThisInvoice: number };
  coupon: { code: string; discountAmount: number } | null;
  canCaptureProfile: boolean;
  missingDob: boolean;
  missingAnniversary: boolean;
}) {
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [anniversaryDate, setAnniversaryDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [generatedCoupon, setGeneratedCoupon] = useState<{ code: string; amount: number } | null>(null);

  const submit = async () => {
    if (!dateOfBirth && !anniversaryDate) {
      toast.error("Please enter DOB and/or Anniversary date");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`/api/public/invoice/${encodeURIComponent(token)}/profile-extra`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateOfBirth, anniversaryDate }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "Failed to save details");
        return;
      }
      if (data?.couponCode) {
        setGeneratedCoupon({ code: data.couponCode, amount: Number(data.couponAmount || 0) });
        toast.success(`Coupon generated: ${data.couponCode}`);
      } else {
        toast.success("Details saved successfully");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-10 mt-2 mb-4 rounded-md border bg-emerald-50/40 border-emerald-100 p-4 print:hidden">
      <div className="text-sm font-semibold text-emerald-800">Customer Benefits</div>

      {banners.length > 0 ? (
        <div className="mt-3 space-y-2">
          {banners.slice(0, 2).map((b) => (
            <div key={b.id} className="rounded-md border bg-white p-3 flex items-start justify-between gap-3">
              <div>
                <div className="font-medium text-sm text-gray-900">{b.title}</div>
                {b.subtitle ? <div className="text-xs text-gray-600 mt-1">{b.subtitle}</div> : null}
              </div>
              {b.ctaLink ? (
                <a href={b.ctaLink} target="_blank" rel="noreferrer" className="text-xs underline text-primary">
                  {b.ctaText || "View Offer"}
                </a>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-md border bg-white p-3">
          <div className="text-xs text-gray-500">Loyalty Balance</div>
          <div className="text-sm font-semibold">{formatInrNumber(loyalty.balancePoints, 2)} pts</div>
          <div className="text-xs text-gray-600">{formatCurrency(loyalty.balanceValue)}</div>
        </div>
        <div className="rounded-md border bg-white p-3">
          <div className="text-xs text-gray-500">Earned on this Invoice</div>
          <div className="text-sm font-semibold">{formatInrNumber(loyalty.earnedPointsThisInvoice, 2)} pts</div>
        </div>
        <div className="rounded-md border bg-white p-3">
          <div className="text-xs text-gray-500">Redeemed on this Invoice</div>
          <div className="text-sm font-semibold">{formatCurrency(loyalty.redeemedValueThisInvoice)}</div>
        </div>
      </div>

      {coupon ? (
        <div className="mt-3 rounded-md border bg-white p-3 text-sm">
          Coupon Applied: <span className="font-semibold">{coupon.code}</span> ({formatCurrency(coupon.discountAmount)})
        </div>
      ) : null}

      {generatedCoupon ? (
        <div className="mt-3 rounded-md border border-green-300 bg-green-50 p-3 text-sm">
          Hi {customerName}, your reward coupon is <span className="font-semibold">{generatedCoupon.code}</span> for{" "}
          <span className="font-semibold">{formatCurrency(generatedCoupon.amount)}</span> on next purchase.
        </div>
      ) : null}

      {canCaptureProfile && (missingDob || missingAnniversary) ? (
        <div className="mt-3 rounded-md border bg-white p-3">
          <div className="text-sm font-medium">Complete your profile and get reward coupon for next purchase</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            {missingDob ? (
              <div>
                <div className="text-xs text-gray-600 mb-1">Date of Birth</div>
                <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
              </div>
            ) : null}
            {missingAnniversary ? (
              <div>
                <div className="text-xs text-gray-600 mb-1">Anniversary Date</div>
                <Input type="date" value={anniversaryDate} onChange={(e) => setAnniversaryDate(e.target.value)} />
              </div>
            ) : null}
            <div className="flex items-end">
              <Button onClick={submit} disabled={isSaving}>
                Save & Get Coupon
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

