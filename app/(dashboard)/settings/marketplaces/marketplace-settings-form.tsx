"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  analyzePricing,
} from "@/lib/pricing/engine";
import { CHARGE_LABELS, CHARGE_KEYS } from "@/lib/pricing/types";
import type {
  FeeCharge,
  MarketplaceProfileConfig,
} from "@/lib/pricing/types";
import { PRICING_STATUS_LABELS, PRICING_STATUS_COLORS } from "@/lib/pricing/constants";
import { CURRENCY_OPTIONS } from "@/lib/pricing/currency";
import {
  saveMarketplaceProfile,
  duplicateMarketplaceProfile,
  exportMarketplaceSettings,
  importMarketplaceSettings,
} from "./actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

function emptyCharges(): FeeCharge[] {
  return CHARGE_KEYS.map((key, i) => ({
    id: `new-${i}`,
    chargeKey: key,
    name: CHARGE_LABELS[key],
    enabled: false,
    amountType: "PERCENT",
    amount: 0,
    countryCode: null,
    sortOrder: i,
  }));
}

interface MarketplaceSettingsFormProps {
  initialProfiles: MarketplaceProfileConfig[];
}

export function MarketplaceSettingsForm({ initialProfiles }: MarketplaceSettingsFormProps) {
  const router = useRouter();
  const [profiles, setProfiles] = useState<MarketplaceProfileConfig[]>(() =>
    initialProfiles.length
      ? initialProfiles.map((p) => ({ ...p, charges: p.charges.length ? p.charges : emptyCharges() }))
      : []
  );
  const [activeName, setActiveName] = useState<string>(
    initialProfiles.find((p) => p.isDefault)?.name || initialProfiles[0]?.name || ""
  );
  const [samplePurchase, setSamplePurchase] = useState("100");
  const [sampleSelling, setSampleSelling] = useState("1500");
  const [saving, setSaving] = useState<string | null>(null);

  const active = profiles.find((p) => p.name === activeName) || profiles[0];

  const preview = useMemo(() => {
    if (!active) return null;
    const purchasePrice = Number(samplePurchase) || 0;
    const sellingPrice = Number(sampleSelling) || 0;
    return analyzePricing({
      purchasePrice,
      sellingPrice,
      charges: active.charges,
      marginType: active.marginType,
      marginValue: active.marginValue,
    });
  }, [active, samplePurchase, sampleSelling]);

  if (!active) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          No marketplace profiles found. Run the database seed to create the default set.
        </CardContent>
      </Card>
    );
  }

  function updateProfile(patch: Partial<MarketplaceProfileConfig>) {
    setProfiles((prev) => prev.map((p) => (p.name === active.name ? { ...p, ...patch } : p)));
  }

  function updateCharge(index: number, patch: Partial<FeeCharge>) {
    updateProfile({
      charges: active.charges.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    });
  }

  async function handleSave() {
    if (!active) return;
    setSaving(active.name);
    const res = await saveMarketplaceProfile({
      profileId: active.id,
      name: active.name,
      displayName: active.displayName,
      currency: active.currency,
      isActive: active.isActive,
      isDefault: active.isDefault,
      marginType: active.marginType,
      marginValue: active.marginValue,
      charges: active.charges,
    });
    setSaving(null);
    if (res.success) {
      toast.success(`${active.displayName} saved`);
      router.refresh();
    } else {
      toast.error(res.message || "Failed to save");
    }
  }

  async function handleDuplicate() {
    const res = await duplicateMarketplaceProfile(active.id);
    if (res.success) {
      toast.success(`Duplicated as ${res.name}`);
      router.refresh();
    } else {
      toast.error(res.message || "Failed to duplicate");
    }
  }

  async function handleExport() {
    const res = await exportMarketplaceSettings();
    if (!res.success || !res.json) {
      toast.error(res.message || "Export failed");
      return;
    }
    const blob = new Blob([res.json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "marketplace-settings.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(file: File) {
    const text = await file.text();
    const res = await importMarketplaceSettings(text);
    if (res.success) {
      toast.success("Marketplace settings imported");
      router.refresh();
    } else {
      toast.error(res.message || "Import failed");
    }
  }

  const totalCharges = active.charges.filter((c) => c.enabled).length;

  return (
    <div className="space-y-6">
      <Tabs value={active.name} onValueChange={setActiveName}>
        <TabsList className="flex flex-wrap h-auto">
          {profiles.map((p) => (
            <TabsTrigger key={p.name} value={p.name}>
              {p.displayName}
              {p.isDefault ? <span className="ml-1 text-[10px] text-primary">★</span> : null}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={active.name} className="space-y-6 mt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{active.displayName}</h2>
              {active.isDefault ? (
                <Badge variant="default">Default</Badge>
              ) : (
                <Badge variant="outline">Standard</Badge>
              )}
              <Badge variant={active.isActive ? "default" : "secondary"}>
                {active.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleDuplicate}>
                Duplicate Profile
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                Export Settings
              </Button>
              <label className="cursor-pointer">
                <span className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium h-8 hover:bg-accent">
                  Import Settings
                </span>
                <input
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImport(f);
                  }}
                />
              </label>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Profile Configuration</CardTitle>
                  <CardDescription>
                    Marketplace currency, status and profit margin used to derive MRP.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Profile Name</Label>
                    <Input value={active.displayName} onChange={(e) => updateProfile({ displayName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select value={active.currency} onValueChange={(v) => updateProfile({ currency: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CURRENCY_OPTIONS.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>{currency.code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Margin Type</Label>
                    <Select value={active.marginType} onValueChange={(v) => updateProfile({ marginType: v as "PERCENT" | "FLAT" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PERCENT">Percentage (%)</SelectItem>
                        <SelectItem value="FLAT">Flat Amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Desired Profit Margin</Label>
                    <Input
                      type="number"
                      min={0}
                      value={active.marginValue}
                      onChange={(e) => updateProfile({ marginValue: Number(e.target.value) })}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <Label>Active</Label>
                      <p className="text-xs text-muted-foreground">Use this fee schedule</p>
                    </div>
                    <Switch checked={active.isActive} onCheckedChange={(v) => updateProfile({ isActive: v })} />
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <Label>Default Marketplace</Label>
                      <p className="text-xs text-muted-foreground">Drives single-row MSP/MRP in the Opportunity Report</p>
                    </div>
                    <Switch
                      checked={active.isDefault}
                      onCheckedChange={(v) =>
                        updateProfile({
                          isDefault: v,
                        })
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Marketplace Charges</CardTitle>
                    <CardDescription>
                      {totalCharges} enabled charges. FLAT adds the amount; PERCENT adds % of purchase price.
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => updateProfile({ charges: emptyCharges() })}>
                    Reset Charges
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {active.charges.map((charge, index) => (
                    <div key={charge.chargeKey} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 rounded-md border p-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{charge.name}</div>
                        {charge.chargeKey === "OTHER_CHARGE" ? (
                          <Input
                            className="mt-1 h-7 text-xs"
                            value={charge.name}
                            onChange={(e) => updateCharge(index, { name: e.target.value })}
                          />
                        ) : null}
                      </div>
                      <Switch checked={charge.enabled} onCheckedChange={(v) => updateCharge(index, { enabled: v })} />
                      <Select
                        value={charge.amountType}
                        onValueChange={(v) => updateCharge(index, { amountType: v as "FLAT" | "PERCENT" })}
                      >
                        <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PERCENT">%</SelectItem>
                          <SelectItem value="FLAT">Flat</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        className="w-24 h-8"
                        value={charge.amount}
                        onChange={(e) => updateCharge(index, { amount: Number(e.target.value) })}
                        disabled={!charge.enabled}
                      />
                      <Badge
                        variant={charge.enabled ? "default" : "secondary"}
                        className="w-16 justify-center"
                      >
                        {charge.enabled ? (charge.amountType === "PERCENT" ? `${charge.amount}%` : `₹${charge.amount}`) : "Off"}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Live MSP / MRP Preview</CardTitle>
                  <CardDescription>
                    Enter a sample purchase and selling price to see MSP/MRP values live.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Sample Purchase Price</Label>
                      <Input
                        type="number"
                        min={0}
                        value={samplePurchase}
                        onChange={(e) => setSamplePurchase(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Sample Selling Price (MRP)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={sampleSelling}
                        onChange={(e) => setSampleSelling(e.target.value)}
                      />
                    </div>
                  </div>
                  {preview ? (
                    <>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Purchase Price</span><span>₹{preview.purchasePrice.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Marketplace Costs</span><span>₹{preview.marketplaceCosts.toFixed(2)}</span></div>
                        <div className="flex justify-between font-medium"><span>MSP (Break-even)</span><span>₹{preview.msp.toFixed(2)}</span></div>
                        <div className="flex justify-between font-medium"><span>MRP (Recommended)</span><span>₹{preview.mrp.toFixed(2)}</span></div>
                      </div>
                      <div className="rounded-md border p-3">
                        <div className="text-xs text-muted-foreground mb-2">Cost Breakdown</div>
                        <div className="space-y-1 text-xs">
                          {Object.entries(preview.costBreakdown).filter(([, v]) => v > 0).length === 0 ? (
                            <div className="text-muted-foreground">No enabled charges yet.</div>
                          ) : (
                            Object.entries(preview.costBreakdown)
                              .filter(([, v]) => v > 0)
                              .map(([key, v]) => (
                                <div key={key} className="flex justify-between">
                                  <span>{CHARGE_LABELS[key as keyof typeof CHARGE_LABELS] || key}</span>
                                  <span>₹{Number(v).toFixed(2)}</span>
                                </div>
                              ))
                          )}
                        </div>
                      </div>
                    </>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <Button onClick={handleSave} disabled={saving === active.name} className="w-full">
                    {saving === active.name ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Save {active.displayName}
                  </Button>
                  {active.isDefault ? (
                    <p className="text-xs text-muted-foreground mt-2">
                      This profile is the default. Saving it updates the Opportunity Report default MSP/MRP basis.
                    </p>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Pricing Status Guide</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(
                    [
                      ["BELOW_MSP", "MRP below break-even — listing won't cover marketplace costs"],
                      ["BREAK_EVEN", "MRP equals MSP — just covers costs, no profit"],
                      ["HEALTHY_MARGIN", "MRP above MSP — profitable listing"],
                      ["PREMIUM_MARGIN", "MRP ≥ 1.5× MSP — high-margin item"],
                    ] as const
                  ).map(([s, desc]) => (
                    <div key={s} className="flex items-center gap-2 text-xs">
                      <Badge className={PRICING_STATUS_COLORS[s]}>{PRICING_STATUS_LABELS[s]}</Badge>
                      <span className="text-muted-foreground">{desc}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
