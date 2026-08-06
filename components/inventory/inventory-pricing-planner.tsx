"use client";

import { useEffect, useMemo, useState } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { analyzePricing } from "@/lib/pricing/engine";
import { BELOW_MSP_WARNING, PRICING_STATUS_COLORS, PRICING_STATUS_LABELS } from "@/lib/pricing/constants";
import type { FeeCharge, MarketplaceProfileConfig } from "@/lib/pricing/types";
import type { FormInputValues } from "./inventory-form.types";
import { AlertTriangle } from "lucide-react";

interface PlannerConfig {
  enabled: boolean;
  defaultProfile: (Pick<MarketplaceProfileConfig, "name" | "displayName" | "currency" | "marginType" | "marginValue"> & { charges: Array<Omit<FeeCharge, "id" | "countryCode" | "sortOrder">> }) | null;
}

function carats(weight: number, unit?: string | null): number {
  if (unit === "gms") return Number((weight * 5).toFixed(2));
  return Number(weight.toFixed(2));
}

function ratti(weight: number, unit?: string | null): number {
  if (unit === "gms") return Math.round(weight * 5.45 * 100) / 100;
  if (unit === "cts") return Math.round(weight * 1.09 * 100) / 100;
  return weight;
}

export function InventoryPricingPlanner({ form }: { form: UseFormReturn<FormInputValues> }) {
  const [config, setConfig] = useState<PlannerConfig | null>(null);

  const pricingMode = useWatch({ control: form.control, name: "pricingMode" }) || "PER_CARAT";
  const weightValue = Number(useWatch({ control: form.control, name: "weightValue" }) || 0);
  const weightUnit = useWatch({ control: form.control, name: "weightUnit" }) || "cts";
  const purchaseRatePerCarat = Number(useWatch({ control: form.control, name: "purchaseRatePerCarat" }) || 0);
  const sellingRatePerCarat = Number(useWatch({ control: form.control, name: "sellingRatePerCarat" }) || 0);
  const flatPurchaseCost = Number(useWatch({ control: form.control, name: "flatPurchaseCost" }) || 0);
  const flatSellingPrice = Number(useWatch({ control: form.control, name: "flatSellingPrice" }) || 0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/pricing/planner", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: PlannerConfig | null) => {
        if (!cancelled) setConfig(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const computed = useMemo(() => {
    if (!config?.enabled || !config.defaultProfile) return null;
    const charges = config.defaultProfile.charges as FeeCharge[];
    const purchasePrice =
      pricingMode === "FLAT" ? flatPurchaseCost : purchaseRatePerCarat * carats(weightValue, weightUnit);
    const sellingPrice =
      pricingMode === "FLAT"
        ? flatSellingPrice
        : pricingMode === "PER_RATTI"
        ? sellingRatePerCarat * ratti(weightValue, weightUnit)
        : sellingRatePerCarat * carats(weightValue, weightUnit);
    return {
      ...analyzePricing({
        purchasePrice,
        sellingPrice,
        charges,
        marginType: config.defaultProfile.marginType,
        marginValue: config.defaultProfile.marginValue,
      }),
      profileName: config.defaultProfile.displayName,
    };
  }, [config, pricingMode, weightValue, weightUnit, purchaseRatePerCarat, sellingRatePerCarat, flatPurchaseCost, flatSellingPrice]);

  if (!config?.enabled || !computed || computed.purchasePrice <= 0) return null;

  const belowMsp = computed.status === "BELOW_MSP";

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Pricing Planner</h4>
        <span className="text-[10px] text-muted-foreground">Basis: {computed.profileName}</span>
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-md border p-2">
          <div className="text-xs text-muted-foreground">Purchase</div>
          <div className="font-medium">₹{computed.purchasePrice.toFixed(2)}</div>
        </div>
        <div className="rounded-md border p-2">
          <div className="text-xs text-muted-foreground">Marketplace Costs</div>
          <div className="font-medium">₹{computed.marketplaceCosts.toFixed(2)}</div>
        </div>
        <div className="rounded-md border p-2">
          <div className="text-xs text-muted-foreground">Expected Profit</div>
          <div className={`font-medium ${computed.expectedProfit < 0 ? "text-red-600" : "text-emerald-600"}`}>₹{computed.expectedProfit.toFixed(2)}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-md border p-2">
          <div className="text-xs text-muted-foreground">MSP (Minimum Listing Price)</div>
          <div className="font-semibold">₹{computed.msp.toFixed(2)}</div>
        </div>
        <div className="rounded-md border p-2">
          <div className="text-xs text-muted-foreground">MRP (Selling Price)</div>
          <div className="font-semibold">₹{computed.mrp.toFixed(2)}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs ${PRICING_STATUS_COLORS[computed.status]}`}
        >
          {PRICING_STATUS_LABELS[computed.status]}
        </span>
        {computed.expectedProfit >= 0 ? (
          <span className="text-xs text-emerald-600">Expected profit ₹{computed.expectedProfit.toFixed(2)}</span>
        ) : (
          <span className="text-xs text-red-600">Expected loss ₹{Math.abs(computed.expectedProfit).toFixed(2)}</span>
        )}
      </div>

      {belowMsp ? (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{BELOW_MSP_WARNING}</span>
        </div>
      ) : null}
    </div>
  );
}
