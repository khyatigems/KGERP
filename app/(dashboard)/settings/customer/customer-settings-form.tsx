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
  const [repeatBuyerOrders, setRepeatBuyerOrders] = useState<number>((settings?.repeatBuyerOrders as number) || 2);
  const [newCustomerDays, setNewCustomerDays] = useState<number>((settings?.newCustomerDays as number) || 30);

  const [platinumColor, setPlatinumColor] = useState<string>((settings?.platinumColor as string) || "#7c3aed");
  const [goldColor, setGoldColor] = useState<string>((settings?.goldColor as string) || "#eab308");
  const [silverColor, setSilverColor] = useState<string>((settings?.silverColor as string) || "#64748b");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    const res = await saveCustomerSettings({
      platinumThreshold: Number(platinum),
      goldThreshold: Number(gold),
      highValueAov: Number(highValueAov),
      repeatBuyerOrders: Number(repeatBuyerOrders),
      newCustomerDays: Number(newCustomerDays),
      platinumColor,
      goldColor,
      silverColor,
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
          <div className="space-y-2">
            <Label>Repeat Buyer Tag Orders (≥)</Label>
            <Input type="number" value={repeatBuyerOrders} onChange={e => setRepeatBuyerOrders(Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">Orders required for Repeat Buyer tag.</p>
          </div>
          <div className="space-y-2">
            <Label>New Customer Days</Label>
            <Input type="number" value={newCustomerDays} onChange={e => setNewCustomerDays(Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">First purchase within N days marks New Customer.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Platinum Badge Color</Label>
            <Input type="color" value={platinumColor} onChange={(e) => setPlatinumColor(String(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Gold Badge Color</Label>
            <Input type="color" value={goldColor} onChange={(e) => setGoldColor(String(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Silver Badge Color</Label>
            <Input type="color" value={silverColor} onChange={(e) => setSilverColor(String(e.target.value))} />
          </div>
        </div>
        <Button onClick={handleSave} disabled={loading}>Save Settings</Button>
      </CardContent>
    </Card>
  );
}
