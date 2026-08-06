"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { CURRENCY_CODES } from "@/lib/pricing/currency";
import { saveCurrencyRates } from "./actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export function CurrencyRatesEditor({
  initialRates,
}: {
  initialRates: Array<{ code: string; rateToInr: number; isBase: boolean }>;
}) {
  const router = useRouter();
  const [rates, setRates] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const r of initialRates) map[r.code] = r.rateToInr;
    for (const code of CURRENCY_CODES) if (map[code] == null) map[code] = 0;
    return map;
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const res = await saveCurrencyRates(
      CURRENCY_CODES.map((code) => ({ code, rateToInr: rates[code] || 0 }))
    );
    setSaving(false);
    if (res.success) {
      toast.success("Currency rates saved");
      router.refresh();
    } else {
      toast.error(res.message || "Failed to save");
    }
  }

  const missing = CURRENCY_CODES.filter((code) => code !== "INR" && !(Number(rates[code]) > 0));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Currency Rates</CardTitle>
        <CardDescription>
          Value of one unit of each currency in INR (e.g. USD = 86 means 1 USD = ₹86). Used to normalize
          reports and marketplace analytics. INR is the base currency.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {CURRENCY_CODES.map((code) => (
            <div key={code} className="space-y-1">
              <div className="flex items-center justify-between">
                <Label>{code}</Label>
                {code === "INR" ? <Badge variant="outline">Base</Badge> : null}
              </div>
              <Input
                type="number"
                min="0"
                step="any"
                value={rates[code] ?? ""}
                disabled={code === "INR"}
                placeholder={code === "INR" ? "1.00" : "0.00"}
                onChange={(e) => setRates((prev) => ({ ...prev, [code]: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          ))}
        </div>
        {missing.length > 0 ? (
          <div className="text-xs text-amber-600">
            Missing rates for: {missing.join(", ")}. Marketplace analytics will skip conversions until configured.
          </div>
        ) : null}
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save Currency Rates
        </Button>
      </CardContent>
    </Card>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-xs font-medium text-muted-foreground">{children}</span>;
}
