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
  profileRewardPoints,
}: {
  token: string;
  customerName: string;
  banners: Banner[];
  loyalty: { balancePoints: number; balanceValue: number; earnedPointsThisInvoice: number; redeemedValueThisInvoice: number };
  coupon: { code: string; discountAmount: number } | null;
  canCaptureProfile: boolean;
  missingDob: boolean;
  missingAnniversary: boolean;
  profileRewardPoints: number;
}) {
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [anniversaryDate, setAnniversaryDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState<number | null>(null);

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
      if (data?.awardedPoints != null) {
        setEarnedPoints(Number(data.awardedPoints || 0));
        toast.success(`Loyalty points added: ${Number(data.awardedPoints || 0).toFixed(2)}`);
      } else {
        toast.success("Details saved successfully");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-10 mt-2 mb-4 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 print:hidden">
      <div className="text-base font-semibold text-emerald-900">Customer Benefits</div>

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
        <div className="rounded-lg border border-emerald-200 bg-white p-3">
          <div className="text-xs text-gray-500">Loyalty Balance</div>
          <div className="text-sm font-semibold text-slate-900">{formatInrNumber(loyalty.balancePoints, 2)} pts</div>
          <div className="text-xs text-slate-600">{formatCurrency(loyalty.balanceValue)}</div>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-white p-3">
          <div className="text-xs text-gray-500">Earned on this Invoice</div>
          <div className="text-sm font-semibold text-slate-900">{formatInrNumber(loyalty.earnedPointsThisInvoice, 2)} pts</div>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-white p-3">
          <div className="text-xs text-gray-500">Redeemed on this Invoice</div>
          <div className="text-sm font-semibold text-slate-900">{formatCurrency(loyalty.redeemedValueThisInvoice)}</div>
        </div>
      </div>

      {coupon ? (
        <div className="mt-3 rounded-md border bg-white p-3 text-sm">
          Coupon Applied: <span className="font-semibold">{coupon.code}</span> ({formatCurrency(coupon.discountAmount)})
        </div>
      ) : null}

      {earnedPoints != null ? (
        <div className="mt-3 rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-900">
          Hi {customerName}, you earned <span className="font-semibold">{formatInrNumber(earnedPoints, 2)} loyalty points</span>.
          You can redeem them on your next purchase from KhyatiGems.
        </div>
      ) : null}

      {canCaptureProfile && (missingDob || missingAnniversary) ? (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-white p-4">
          <div className="text-sm font-semibold text-slate-900">
            Complete your profile and get {formatInrNumber(profileRewardPoints, 2)} loyalty points and that can be redeemed in your next purchase from KhyatiGems
          </div>
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
                Save & Get Loyalty Points
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
