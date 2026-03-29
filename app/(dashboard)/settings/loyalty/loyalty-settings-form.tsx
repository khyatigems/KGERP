"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Earning & Redemption Rules</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm mb-1">Points Per ₹ Sale</div>
            <Input type="number" step="0.001" value={form.pointsPerRupee} onChange={(e) => update("pointsPerRupee", e.target.value)} />
          </div>
          <div>
            <div className="text-sm mb-1">₹ Value Per Point</div>
            <Input type="number" step="0.01" value={form.redeemRupeePerPoint} onChange={(e) => update("redeemRupeePerPoint", e.target.value)} />
          </div>
          <div>
            <div className="text-sm mb-1">Minimum Points To Redeem</div>
            <Input type="number" step="1" value={form.minRedeemPoints} onChange={(e) => update("minRedeemPoints", e.target.value)} />
          </div>
          <div>
            <div className="text-sm mb-1">Max Redeem % Per Invoice</div>
            <Input type="number" step="1" value={form.maxRedeemPercent} onChange={(e) => update("maxRedeemPercent", e.target.value)} />
          </div>
          <div>
            <div className="text-sm mb-1">Points Expiry (days)</div>
            <Input type="number" step="1" value={form.expiryDays ?? ""} onChange={(e) => update("expiryDays", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Profile Completion Reward Points</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm mb-1">Points For Adding DOB</div>
            <Input type="number" step="0.01" value={form.dobProfilePoints} onChange={(e) => update("dobProfilePoints", e.target.value)} />
          </div>
          <div>
            <div className="text-sm mb-1">Points For Adding Anniversary</div>
            <Input type="number" step="0.01" value={form.anniversaryProfilePoints} onChange={(e) => update("anniversaryProfilePoints", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Button onClick={submit} disabled={isPending}>Save Loyalty Settings</Button>
    </div>
  );
}
