"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { type UseFormReturn } from "react-hook-form";
import { Loader2, Lightbulb, TrendingUp, Check, AlertCircle, RefreshCw, Layers, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { PriceSuggestionResult, SampleDetail } from "@/lib/price-suggestion";
import type { FormInputValues, CodeRow } from "./inventory-form.types";

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
  categories: CodeRow[];
  gemstones: CodeRow[];
}

const matchConfig: Record<string, { label: string; color: string; icon: typeof Layers }> = {
  exact: { label: "Same category + gemstone + vendor", color: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: Layers },
  close: { label: "Same category + gemstone", color: "text-blue-700 bg-blue-50 border-blue-200", icon: Layers },
  broad: { label: "Same category only", color: "text-amber-700 bg-amber-50 border-amber-200", icon: TrendingUp },
  none: { label: "No data", color: "text-gray-500 bg-gray-50 border-gray-200", icon: AlertCircle },
};

export function PriceSuggestionWidget({ form, categories, gemstones }: PriceSuggestionWidgetProps) {
  const [suggestion, setSuggestion] = useState<PriceSuggestionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [samplesOpen, setSamplesOpen] = useState(false);
  const [samples, setSamples] = useState<SampleDetail[]>([]);
  const [samplesLoading, setSamplesLoading] = useState(false);
  const lastReqRef = useRef(0);

  const categoryName = form.watch("category");
  const gemType = form.watch("gemType");
  const vendorId = form.watch("vendorId");
  const weightValue = form.watch("weightValue");
  const weightUnit = form.watch("weightUnit");
  const pricingMode = form.watch("pricingMode") || "PER_CARAT";

  const categoryCodeId = categories.find((c) => c.name === categoryName)?.id;
  const gemstoneCodeId = gemstones.find((g) => g.name === gemType)?.id;

  const formValuesRef = useRef({ categoryCodeId: undefined as string | undefined, gemstoneCodeId: undefined as string | undefined, vendorId: undefined as string | undefined, weightValue: 0, weightUnit: "cts" as string, pricingMode: "PER_CARAT" as string });
  formValuesRef.current = { categoryCodeId, gemstoneCodeId, vendorId, weightValue, weightUnit: weightUnit || "cts", pricingMode };

  const fetchSuggestion = useCallback(async () => {
    const { categoryCodeId: cc, gemstoneCodeId: gc, vendorId: vi, weightValue: wv, weightUnit: wu, pricingMode: pm } = formValuesRef.current;

    if (!cc && !gc) {
      setSuggestion(NONE_RESULT);
      return;
    }

    const reqId = ++lastReqRef.current;
    setLoading(true);
    setHasApplied(false);

    try {
      const params = new URLSearchParams();
      if (cc) params.set("categoryCodeId", cc);
      if (gc) params.set("gemstoneCodeId", gc);
      if (vi) params.set("vendorId", vi);
      params.set("weightValue", String(wv));
      params.set("weightUnit", wu);
      params.set("pricingMode", pm);

      const res = await fetch(`/api/inventory/price-suggestion?${params.toString()}`);

      if (reqId !== lastReqRef.current) return;

      const data: PriceSuggestionResult = res.ok ? await res.json() : NONE_RESULT;

      if (reqId === lastReqRef.current) {
        setSuggestion(data);

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
  }, []);

  // Auto-refresh when category or gemType changes
  useEffect(() => {
    const sub = form.watch((values, { name }) => {
      if (name !== "category" && name !== "gemType") return;
      const catName = (values as any).category as string | undefined;
      const gemName = (values as any).gemType as string | undefined;
      if (!catName && !gemName) return;

      const ccId = categories.find((c) => c.name === catName)?.id;
      const gcId = gemstones.find((g) => g.name === gemName)?.id;
      if (!ccId && !gcId) return;

      const allVals = form.getValues();
      const reqId = ++lastReqRef.current;
      setSuggestion(null);
      setLoading(true);
      setHasApplied(false);

      const params = new URLSearchParams();
      if (ccId) params.set("categoryCodeId", ccId);
      if (gcId) params.set("gemstoneCodeId", gcId);
      if (allVals.vendorId) params.set("vendorId", allVals.vendorId);
      params.set("weightValue", String(allVals.weightValue ?? 0));
      params.set("weightUnit", allVals.weightUnit || "cts");
      params.set("pricingMode", allVals.pricingMode || "PER_CARAT");

      fetch(`/api/inventory/price-suggestion?${params.toString()}`)
        .then((r) => (r.ok ? r.json() : NONE_RESULT))
        .then((data) => {
          if (reqId === lastReqRef.current) {
            setSuggestion(data);
            form.setValue(
              "_priceRecommendation" as any,
              data.matchLevel !== "none" ? JSON.stringify(data) : "",
            );
          }
        })
        .catch(() => {
          if (reqId === lastReqRef.current) setSuggestion(NONE_RESULT);
        })
        .finally(() => {
          if (reqId === lastReqRef.current) setLoading(false);
        });
    });
    return () => sub.unsubscribe();
  }, [form, categories, gemstones]);

  // Also fetch on mount if category or gemType is already set (no change event fired)
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      if (categoryName || gemType) {
        setSuggestion(null);
        fetchSuggestion();
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const checkPrice = useCallback(() => {
    setSuggestion(null);
    setHasApplied(false);
    fetchSuggestion();
  }, [fetchSuggestion]);

  const handleOpenSamples = useCallback(async () => {
    const { categoryCodeId: cc, gemstoneCodeId: gc, vendorId: vi, weightValue: wv, weightUnit: wu, pricingMode: pm } = formValuesRef.current;

    setSamplesOpen(true);
    setSamplesLoading(true);

    try {
      const params = new URLSearchParams();
      if (cc) params.set("categoryCodeId", cc);
      if (gc) params.set("gemstoneCodeId", gc);
      if (vi) params.set("vendorId", vi);
      params.set("weightValue", String(wv));
      params.set("weightUnit", wu);
      params.set("pricingMode", pm);

      const res = await fetch(`/api/inventory/price-suggestion/samples?${params.toString()}`);
      const data = await res.json();
      setSamples(data.samples ?? []);
    } catch {
      setSamples([]);
    } finally {
      setSamplesLoading(false);
    }
  }, []);

  const handleApply = () => {
    if (!suggestion || suggestion.suggestedSellingRate == null) return;

    if (pricingMode === "PER_CARAT") {
      form.setValue("sellingRatePerCarat", suggestion.suggestedSellingRate, { shouldDirty: true, shouldValidate: true });
      if (suggestion.suggestedPurchaseRate != null) {
        form.setValue("purchaseRatePerCarat", suggestion.suggestedPurchaseRate, { shouldDirty: true, shouldValidate: true });
      }
    } else if (pricingMode === "PER_RATTI") {
      form.setValue("sellingRatePerRatti", suggestion.suggestedSellingRate, { shouldDirty: true, shouldValidate: true });
      if (suggestion.suggestedPurchaseRate != null) {
        form.setValue("purchaseRatePerRatti", suggestion.suggestedPurchaseRate, { shouldDirty: true, shouldValidate: true });
      }
    } else {
      form.setValue("flatSellingPrice", suggestion.suggestedSellingPrice ?? 0, { shouldDirty: true, shouldValidate: true });
      if (suggestion.suggestedPurchaseRate != null && suggestion.suggestedSellingPrice != null) {
        const ratio = weightValue > 0 ? suggestion.suggestedPurchaseRate / suggestion.suggestedSellingRate! : 1;
        form.setValue("flatPurchaseCost", (suggestion.suggestedSellingPrice ?? 0) * ratio, { shouldDirty: true, shouldValidate: true });
      }
    }

    setHasApplied(true);
  };

  const canFetch = !!(categoryCodeId || gemstoneCodeId || gemType);
  const hasSuggestion = suggestion && suggestion.matchLevel !== "none";
  const fetchComplete = suggestion !== null;

  const confidencePct = Math.round((suggestion?.confidence ?? 0) * 100);
  const barColor = confidencePct >= 60 ? "bg-green-500" : confidencePct >= 30 ? "bg-yellow-500" : "bg-gray-400";

  const matchContent = hasSuggestion ? matchConfig[suggestion.matchLevel] : matchConfig.none;
  const MatchIcon = matchContent.icon;

  const rateSuffix = pricingMode === "PER_RATTI" ? "/ratti" : pricingMode === "FLAT" ? "/ct eq." : "/ct";

  return (
    <>
      <div className="rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 space-y-3 transition-all duration-300">
        <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
          <Lightbulb className="h-4 w-4" />
          Price Suggestion
          <div className="ml-auto flex items-center gap-2">
            {loading && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}
            {canFetch && (
              <Button type="button" size="sm" variant="outline" onClick={checkPrice} className="h-6 text-[11px] px-2 py-0 border-blue-300 text-blue-700 hover:bg-blue-100 gap-1">
                <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
                {hasSuggestion || fetchComplete ? "Refresh" : "Check Price"}
              </Button>
            )}
          </div>
        </div>

        {!canFetch && (
          <p className="text-xs text-gray-500 italic">Select a category or gemstone to see price suggestions.</p>
        )}

        {canFetch && !fetchComplete && !loading && (
          <p className="text-xs text-gray-500 italic">Analyzing prices…</p>
        )}

        {canFetch && fetchComplete && !hasSuggestion && !loading && (
          <div className="flex items-start gap-2 text-xs text-gray-500">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-gray-400" />
            <span>No similar items found in the database for the current selection.</span>
          </div>
        )}

        {hasSuggestion && (
          <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              <span className="text-gray-500">Selling Rate</span>
              <span className="font-semibold text-right tabular-nums text-gray-900">
                {suggestion.suggestedSellingRate != null
                  ? `${suggestion.suggestedSellingRate.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}${rateSuffix}`
                  : "—"}
              </span>

              {suggestion.suggestedSellingPrice != null && (
                <>
                  <span className="text-gray-500">Est. Total</span>
                  <span className="font-semibold text-right tabular-nums text-gray-900">
                    {suggestion.suggestedSellingPrice.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}
                  </span>
                </>
              )}

              {suggestion.suggestedPurchaseRate != null && (
                <>
                  <span className="text-gray-500">Purchase Rate</span>
                  <span className="font-semibold text-right tabular-nums text-gray-900">
                    {suggestion.suggestedPurchaseRate.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })} 
                  </span>
                </>
              )}

              <span className="text-gray-500">Range</span>
              <span className="text-right tabular-nums text-gray-900">
                {suggestion.minRate != null && suggestion.maxRate != null
                  ? `${suggestion.minRate.toLocaleString(undefined, { maximumFractionDigits: 0 })} – ${suggestion.maxRate.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                  : "—"}
              </span>

              <span className="text-gray-500">Samples</span>
              <button type="button" onClick={handleOpenSamples} className="text-right tabular-nums text-blue-600 hover:text-blue-800 underline underline-offset-2 inline-flex items-center justify-end gap-1 cursor-pointer">
                {suggestion.sampleCount}
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Confidence</span>
                <span>{confidencePct}%</span>
              </div>
              <div className="h-2 rounded-full bg-blue-100 overflow-hidden">
                <div className={cn("h-full rounded-full transition-all duration-700 ease-out", barColor)} style={{ width: `${confidencePct}%` }} />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border", matchContent.color)}>
                <MatchIcon className="h-3 w-3" />
                {matchContent.label}
              </span>
              {!hasApplied && suggestion.suggestedSellingRate != null && (
                <Button type="button" size="sm" variant="default" onClick={handleApply} className="h-7 text-xs gap-1 bg-blue-600 hover:bg-blue-700 text-white">
                  <Check className="h-3 w-3" /> Apply
                </Button>
              )}
              {hasApplied && (
                <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                  <Check className="h-3.5 w-3.5" /> Applied to pricing fields
                </span>
              )}
            </div>
          </>
        )}
      </div>

      <Dialog open={samplesOpen} onOpenChange={setSamplesOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-background text-foreground">
          <DialogHeader>
            <DialogTitle>Sample Details</DialogTitle>
            <DialogDescription>
              {suggestion?.sampleCount} matching {suggestion?.sampleCount === 1 ? "item" : "items"} used for price suggestion
              {suggestion ? ` (${matchContent.label.toLowerCase()})` : ""}
            </DialogDescription>
          </DialogHeader>

          {samplesLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Loading samples…
            </div>
          ) : samples.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No sample details available.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">SKU</th>
                    <th className="pb-2 pr-4 font-medium">Item Name</th>
                    <th className="pb-2 pr-4 font-medium text-right">Weight (cts)</th>
                    <th className="pb-2 pr-4 font-medium text-right">Selling Rate</th>
                    <th className="pb-2 font-medium text-right">Purchase Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {samples.map((s, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2 pr-4 font-mono text-xs text-foreground">{s.sku || "—"}</td>
                      <td className="py-2 pr-4 text-foreground">{s.itemName}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{s.weightCarats.toFixed(2)}</td>
                      <td className="py-2 pr-4 text-right tabular-nums font-medium">{s.sellingRate.toFixed(2)}</td>
                      <td className="py-2 text-right tabular-nums">{s.purchaseRate > 0 ? s.purchaseRate.toFixed(2) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
