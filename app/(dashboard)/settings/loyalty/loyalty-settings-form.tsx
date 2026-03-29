"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveLoyaltySettings, type LoyaltySettingsDto } from "./actions";

export function LoyaltySettingsForm({ initial }: { initial: LoyaltySettingsDto }) {
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<LoyaltySettingsDto>(initial);

  const update = (key: keyof LoyaltySettingsDto, value: string) => {
    setForm((p) => ({
      ...p,
      [key]: value === "" ? null : Number(value),
    } as LoyaltySettingsDto));
  };

  const submit = () => {
    startTransition(async () => {
      const res = await saveLoyaltySettings(form);
      if (!res?.success) {
        toast.error(res?.message || "Failed to save");
        return;
      }
      toast.success("Loyalty settings saved");
    });
  };

  return (
    <div className="rounded-lg border p-5 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <div className="text-sm mb-1">Points Per ₹</div>
          <Input type="number" step="0.001" value={form.pointsPerRupee} onChange={(e) => update("pointsPerRupee", e.target.value)} />
        </div>
        <div>
          <div className="text-sm mb-1">₹ Per Point (Redeem)</div>
          <Input type="number" step="0.01" value={form.redeemRupeePerPoint} onChange={(e) => update("redeemRupeePerPoint", e.target.value)} />
        </div>
        <div>
          <div className="text-sm mb-1">Min Redeem Points</div>
          <Input type="number" step="1" value={form.minRedeemPoints} onChange={(e) => update("minRedeemPoints", e.target.value)} />
        </div>
        <div>
          <div className="text-sm mb-1">Max Redeem % Per Invoice</div>
          <Input type="number" step="1" value={form.maxRedeemPercent} onChange={(e) => update("maxRedeemPercent", e.target.value)} />
        </div>
        <div>
          <div className="text-sm mb-1">Expiry Days</div>
          <Input type="number" step="1" value={form.expiryDays ?? ""} onChange={(e) => update("expiryDays", e.target.value)} />
        </div>
      </div>
      <Button onClick={submit} disabled={isPending}>
        Save Loyalty Settings
      </Button>
    </div>
  );
}

