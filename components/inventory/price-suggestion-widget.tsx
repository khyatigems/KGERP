"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { type UseFormReturn } from "react-hook-form";
import { Loader2, Lightbulb, TrendingUp, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PriceSuggestionResult } from "@/lib/price-suggestion";
import type { FormInputValues } from "./inventory-form.types";

const NONE_RESULT: PriceSuggestionResult = {
  suggestedSellingRate: null,
  suggestedSellingPrice: null,
  suggestedPurchaseRate: null,
  confidence: 0,
  sampleCount: 0,
  minRate: null,
  maxRate: null,
  matchLevel: "none",
};

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

      if (reqId !== lastReqRef.current) return;

      let data: PriceSuggestionResult;
      if (res.ok) {
        data = await res.json();
      } else {
        data = NONE_RESULT;
      }

      if (reqId === lastReqRef.current) {
        setSuggestion(data);
        setHasApplied(false);

        if (data.matchLevel !== "none") {
          form.setValue("_priceRecommendation" as any, JSON.stringify(data));
        } else {
          form.setValue("_priceRecommendation" as any, "");
        }
      }
    } catch {
      if (reqId === lastReqRef.current) setSuggestion(NONE_RESULT);
    } finally {
      if (reqId === lastReqRef.current) setLoading(false);
    }
  }, [categoryCodeId, gemstoneCodeId, vendorId, weightValue, weightUnit, pricingMode]);

  // Reset suggestion when form fields change so stale data is never shown
  useEffect(() => {
    setSuggestion(null);
    setHasApplied(false);
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

  const canFetch = (!!categoryCodeId || !!gemstoneCodeId) && (weightValue > 0);
  const hasSuggestion = suggestion && suggestion.matchLevel !== "none";
  const fetchComplete = suggestion !== null;

  const confidencePct = Math.round((suggestion?.confidence ?? 0) * 100);
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
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
        <Lightbulb className="h-4 w-4" />
        Price Suggestion
        {loading && <Loader2 className="h-3 w-3 animate-spin ml-auto" />}
      </div>

      {/* No category/weight entered */}
      {!canFetch && (
        <p className="text-xs text-gray-600">
          Select a category and enter weight to see price suggestions.
        </p>
      )}

      {/* Waiting for debounce or fetch in progress */}
      {canFetch && !fetchComplete && (
        <p className="text-xs text-gray-600">Analyzing prices…</p>
      )}

      {/* Fetch completed, no matches */}
      {canFetch && fetchComplete && !hasSuggestion && !loading && (
        <div className="flex items-start gap-2 text-xs text-gray-600">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-gray-400" />
          <span>No similar items found in the database for the current selection.</span>
        </div>
      )}

      {/* Fetch completed, has suggestion */}
      {hasSuggestion && (
        <>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <span className="text-gray-500">Selling Rate</span>
            <span className="font-semibold text-right tabular-nums text-gray-900">
              {suggestion.suggestedSellingRate != null
                ? `${suggestion.suggestedSellingRate.toFixed(2)}${pricingMode === "PER_RATTI" ? "/ratti" : pricingMode === "FLAT" ? "/ct eq." : "/ct"}`
                : "—"}
            </span>

            {suggestion.suggestedSellingPrice != null && (
              <>
                <span className="text-gray-500">Est. Total</span>
                <span className="font-semibold text-right tabular-nums text-gray-900">
                  {suggestion.suggestedSellingPrice.toFixed(2)}
                </span>
              </>
            )}

            {suggestion.suggestedPurchaseRate != null && (
              <>
                <span className="text-gray-500">Purchase Rate</span>
                <span className="font-semibold text-right tabular-nums text-gray-900">
                  {suggestion.suggestedPurchaseRate.toFixed(2)}
                </span>
              </>
            )}

            <span className="text-gray-500">Range</span>
            <span className="text-right tabular-nums text-gray-900">
              {suggestion.minRate != null && suggestion.maxRate != null
                ? `${suggestion.minRate.toFixed(2)} – ${suggestion.maxRate.toFixed(2)}`
                : "—"}
            </span>

            <span className="text-gray-500">Samples</span>
            <span className="text-right tabular-nums text-gray-900">{suggestion.sampleCount}</span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-gray-500">
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
            <span className="text-[11px] text-gray-500">
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
              <span className="text-xs text-green-700 font-medium">Applied</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
