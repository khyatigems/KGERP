"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { saveCustomerSettings } from "./actions";

export function CustomerSettingsForm({ settings }: { settings: Record<string, unknown> | null }) {
  const [platinum, setPlatinum] = useState<number>((settings?.platinumThreshold as number) || 100000);
  const [gold, setGold] = useState<number>((settings?.goldThreshold as number) || 50000);
  const [highValueAov, setHighValueAov] = useState<number>((settings?.highValueAov as number) || 25000);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    const res = await saveCustomerSettings({
      platinumThreshold: Number(platinum),
      goldThreshold: Number(gold),
      highValueAov: Number(highValueAov),
    });
    setLoading(false);
    if (res.success) toast.success("Settings saved");
    else toast.error("Failed to save settings");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Tiers & Tags</CardTitle>
        <CardDescription>Configure thresholds for automatic customer tiering and tagging.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Platinum Tier Threshold (₹)</Label>
            <Input type="number" value={platinum} onChange={e => setPlatinum(Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">Minimum total revenue to become Platinum.</p>
          </div>
          <div className="space-y-2">
            <Label>Gold Tier Threshold (₹)</Label>
            <Input type="number" value={gold} onChange={e => setGold(Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">Minimum total revenue to become Gold.</p>
          </div>
          <div className="space-y-2">
            <Label>High Value Buyer Tag AOV (₹)</Label>
            <Input type="number" value={highValueAov} onChange={e => setHighValueAov(Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">Average Order Value required for High Value tag.</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={loading}>Save Settings</Button>
      </CardContent>
    </Card>
  );
}
