"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { Loader2, Lightbulb, TrendingUp, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PriceSuggestionResult } from "@/lib/price-suggestion";
import type { FormInputValues } from "./inventory-form.types";

interface PriceSuggestionWidgetProps {
  form: UseFormReturn<FormInputValues>;
}

export function PriceSuggestionWidget({ form }: PriceSuggestionWidgetProps) {
  const [suggestion, setSuggestion] = useState<PriceSuggestionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastReqRef = useRef(0);

  const categoryCodeId = form.watch("categoryCodeId");
  const gemstoneCodeId = form.watch("gemstoneCodeId");
  const vendorId = form.watch("vendorId");
  const weightValue = form.watch("weightValue");
  const weightUnit = form.watch("weightUnit");
  const pricingMode = form.watch("pricingMode") || "PER_CARAT";

  const fetchSuggestion = useCallback(async () => {
    if (!categoryCodeId && !gemstoneCodeId) return;
    if (!weightValue || weightValue <= 0) return;

    const reqId = ++lastReqRef.current;
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (categoryCodeId) params.set("categoryCodeId", categoryCodeId);
      if (gemstoneCodeId) params.set("gemstoneCodeId", gemstoneCodeId);
      if (vendorId) params.set("vendorId", vendorId);
      params.set("weightValue", String(weightValue));
      params.set("weightUnit", weightUnit || "cts");
      params.set("pricingMode", pricingMode);

      const res = await fetch(`/api/inventory/price-suggestion?${params.toString()}`);
      if (!res.ok) return;
      if (reqId !== lastReqRef.current) return;

      const data: PriceSuggestionResult = await res.json();
      if (reqId === lastReqRef.current) {
        setSuggestion(data);
        setHasApplied(false);

        const el = document.querySelector<HTMLInputElement>("input[name='_priceRecommendation']");
        if (el) {
          el.value = data.matchLevel !== "none" ? JSON.stringify(data) : "";
        }
      }
    } catch {
      if (reqId === lastReqRef.current) setSuggestion(null);
    } finally {
      if (reqId === lastReqRef.current) setLoading(false);
    }
  }, [categoryCodeId, gemstoneCodeId, vendorId, weightValue, weightUnit, pricingMode]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(fetchSuggestion, 500);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fetchSuggestion]);

  const handleApply = () => {
    if (!suggestion || suggestion.suggestedSellingRate == null) return;

    if (pricingMode === "PER_CARAT") {
      form.setValue("sellingRatePerCarat", suggestion.suggestedSellingRate, {
        shouldDirty: true,
        shouldValidate: true,
      });
      if (suggestion.suggestedPurchaseRate != null) {
        form.setValue("purchaseRatePerCarat", suggestion.suggestedPurchaseRate, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    } else if (pricingMode === "PER_RATTI") {
      form.setValue("sellingRatePerRatti", suggestion.suggestedSellingRate, {
        shouldDirty: true,
        shouldValidate: true,
      });
      if (suggestion.suggestedPurchaseRate != null) {
        form.setValue("purchaseRatePerRatti", suggestion.suggestedPurchaseRate, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    } else {
      form.setValue("flatSellingPrice", suggestion.suggestedSellingPrice ?? 0, {
        shouldDirty: true,
        shouldValidate: true,
      });
      if (suggestion.suggestedPurchaseRate != null && suggestion.suggestedSellingPrice != null) {
        const ratio =
          weightValue > 0
            ? suggestion.suggestedPurchaseRate / suggestion.suggestedSellingRate!
            : 1;
        form.setValue("flatPurchaseCost", (suggestion.suggestedSellingPrice ?? 0) * ratio, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    }

    setHasApplied(true);
  };

  if (suggestion && suggestion.matchLevel === "none") return null;
  if (!suggestion) return null;

  const confidencePct = Math.round((suggestion.confidence ?? 0) * 100);
  const barColor =
    confidencePct >= 60
      ? "bg-green-500"
      : confidencePct >= 30
        ? "bg-yellow-500"
        : "bg-gray-400";

  const matchLabels: Record<string, string> = {
    exact: "Same category + gemstone + vendor",
    close: "Same category + gemstone",
    broad: "Same category only",
    none: "No data",
  };

  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-blue-800">
        <Lightbulb className="h-4 w-4" />
        Price Suggestion
        {loading && <Loader2 className="h-3 w-3 animate-spin ml-auto" />}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <span className="text-muted-foreground">Selling Rate</span>
        <span className="font-semibold text-right tabular-nums">
          {suggestion.suggestedSellingRate != null
            ? `${suggestion.suggestedSellingRate.toFixed(2)}${pricingMode === "PER_RATTI" ? "/ratti" : pricingMode === "FLAT" ? "/ct eq." : "/ct"}`
            : "—"}
        </span>

        {suggestion.suggestedSellingPrice != null && (
          <>
            <span className="text-muted-foreground">Est. Total</span>
            <span className="font-semibold text-right tabular-nums">
              {suggestion.suggestedSellingPrice.toFixed(2)}
            </span>
          </>
        )}

        {suggestion.suggestedPurchaseRate != null && (
          <>
            <span className="text-muted-foreground">Purchase Rate</span>
            <span className="font-semibold text-right tabular-nums">
              {suggestion.suggestedPurchaseRate.toFixed(2)}
            </span>
          </>
        )}

        <span className="text-muted-foreground">Range</span>
        <span className="text-right tabular-nums text-muted-foreground">
          {suggestion.minRate != null && suggestion.maxRate != null
            ? `${suggestion.minRate.toFixed(2)} – ${suggestion.maxRate.toFixed(2)}`
            : "—"}
        </span>

        <span className="text-muted-foreground">Samples</span>
        <span className="text-right tabular-nums">{suggestion.sampleCount}</span>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Confidence</span>
          <span>{confidencePct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-blue-100 overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", barColor)}
            style={{ width: `${confidencePct}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          <TrendingUp className="inline h-3 w-3 mr-1" />
          {matchLabels[suggestion.matchLevel]}
        </span>
        {!hasApplied && suggestion.suggestedSellingRate != null && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleApply}
            className="h-7 text-xs gap-1"
          >
            <Check className="h-3 w-3" />
            Apply
          </Button>
        )}
        {hasApplied && (
          <span className="text-xs text-green-600 font-medium">Applied</span>
        )}
      </div>

      <input type="hidden" name="_priceRecommendation" />
    </div>
  );
}
