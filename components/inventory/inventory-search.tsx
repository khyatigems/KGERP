"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Search, X, SlidersHorizontal, RotateCcw,
} from "lucide-react";
import { useGlobalLoader } from "@/components/global-loader-provider";
import { cn } from "@/lib/utils";

function useDebouncedCallback(callback: (value: string) => void, delay: number) {
  const timeoutRef = useRef<number | null>(null);
  const debounced = useCallback(
    (value: string) => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => callback(value), delay);
    },
    [callback, delay]
  );
  useEffect(() => () => { if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current); }, []);
  return debounced;
}

const STATUS_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "IN_STOCK", label: "In Stock" },
  { value: "SOLD", label: "Sold" },
  { value: "RESERVED", label: "Reserved" },
  { value: "MEMO", label: "Memo" },
];

const WEIGHT_OPTIONS = [
  { value: "ALL", label: "All Weights" },
  { value: "0-1", label: "0 – 1 ct" },
  { value: "1-3", label: "1 – 3 ct" },
  { value: "3-5", label: "3 – 5 ct" },
  { value: "5-10", label: "5 – 10 ct" },
  { value: "10-plus", label: "10+ ct" },
];

export function InventorySearch({
  vendors,
  categories,
  gemstones,
  colors,
  collections,
  rashis,
}: {
  vendors: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  gemstones: { id: string; name: string }[];
  colors: { id: string; name: string }[];
  collections: { id: string; name: string }[];
  rashis: { id: string; name: string }[];
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const { showLoader } = useGlobalLoader();
  const [queryValue, setQueryValue] = useState(searchParams.get("query")?.toString() || "");
  const [isPending, startTransition] = useTransition();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const applyTimerRef = useRef<number | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const uniqueCategories = useMemo(
    () => categories.filter((c, i, arr) => arr.findIndex((x) => x.name === c.name) === i),
    [categories]
  );
  const uniqueGemstones = useMemo(
    () => gemstones.filter((g, i, arr) => arr.findIndex((x) => x.name === g.name) === i),
    [gemstones]
  );
  const uniqueColors = useMemo(
    () => colors.filter((c, i, arr) => arr.findIndex((x) => x.name === c.name) === i),
    [colors]
  );

  const getMultiValues = (key: string) => {
    const raw = searchParams.get(key)?.toString();
    return raw ? raw.split(",").filter(Boolean) : [];
  };

  useEffect(() => () => { if (applyTimerRef.current !== null) window.clearTimeout(applyTimerRef.current); }, []);

  const pulseApply = () => {
    setIsApplying(true);
    if (applyTimerRef.current !== null) window.clearTimeout(applyTimerRef.current);
    applyTimerRef.current = window.setTimeout(() => setIsApplying(false), 450);
  };

  const navigate = (params: URLSearchParams) => {
    params.delete("page");
    pulseApply();
    startTransition(() => {
      replace(params.toString() ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
    });
  };

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams);
    if (term) params.set("query", term); else params.delete("query");
    navigate(params);
  }, 180);

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== "ALL") params.set(key, value); else params.delete(key);
    navigate(params);
  };

  const setMultiParam = (key: string, values: string[]) => {
    const params = new URLSearchParams(searchParams);
    if (values.length > 0) params.set(key, values.join(",")); else params.delete(key);
    navigate(params);
  };

  const removeParam = (key: string) => {
    const params = new URLSearchParams(searchParams);
    const [queryKey, multiValue] = key.split(":");
    if (multiValue) {
      const values = getMultiValues(queryKey).filter((v) => v !== multiValue);
      if (values.length > 0) params.set(queryKey, values.join(",")); else params.delete(queryKey);
    } else {
      params.delete(queryKey);
    }
    navigate(params);
  };

  const clearAll = () => {
    setQueryValue("");
    showLoader();
    startTransition(() => replace(pathname, { scroll: false }));
  };

  const currentStatus = searchParams.get("status")?.toString() || "ALL";

  // Count active filters (excluding search query)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchParams.get("status")) count++;
    if (getMultiValues("vendorId").length > 0) count++;
    if (getMultiValues("category").length > 0) count++;
    if (getMultiValues("gemType").length > 0) count++;
    if (getMultiValues("color").length > 0) count++;
    if (searchParams.get("collectionId")) count++;
    if (searchParams.get("rashiId")) count++;
    if (searchParams.get("weightRange")) count++;
    return count;
  }, [searchParams]);

  // Build chips
  const activeChips = useMemo(() => {
    const chips: Array<{ key: string; label: string }> = [];
    const q = (searchParams.get("query") || "").trim();
    const status = searchParams.get("status");

    if (q) chips.push({ key: "query", label: `Search: "${q}"` });
    if (status) chips.push({ key: "status", label: `Status: ${STATUS_OPTIONS.find(s => s.value === status)?.label || status}` });

    const vendorLabelLookup = new Map(vendors.map((v) => [v.id, v.name]));
    getMultiValues("vendorId").forEach((v) =>
      chips.push({ key: `vendorId:${v}`, label: `Vendor: ${vendorLabelLookup.get(v) || v}` })
    );
    const catLabelLookup = new Map(uniqueCategories.map((c) => [c.name, c.name]));
    getMultiValues("category").forEach((c) =>
      chips.push({ key: `category:${c}`, label: `Category: ${catLabelLookup.get(c) || c}` })
    );
    const gemLabelLookup = new Map(uniqueGemstones.map((g) => [g.name, g.name]));
    getMultiValues("gemType").forEach((g) =>
      chips.push({ key: `gemType:${g}`, label: `Gem: ${gemLabelLookup.get(g) || g}` })
    );
    const colorLabelLookup = new Map(uniqueColors.map((c) => [c.id, c.name]));
    getMultiValues("color").forEach((c) =>
      chips.push({ key: `color:${c}`, label: `Color: ${colorLabelLookup.get(c) || c}` })
    );
    const collectionId = searchParams.get("collectionId");
    if (collectionId) chips.push({ key: "collectionId", label: `Collection: ${collections.find((c) => c.id === collectionId)?.name || collectionId}` });
    const rashiId = searchParams.get("rashiId");
    if (rashiId) chips.push({ key: "rashiId", label: `Rashi: ${rashis.find((r) => r.id === rashiId)?.name || rashiId}` });
    const weight = searchParams.get("weightRange");
    if (weight) chips.push({ key: "weightRange", label: `Weight: ${WEIGHT_OPTIONS.find(w => w.value === weight)?.label || weight}` });
    return chips;
  }, [searchParams, vendors, uniqueCategories, uniqueGemstones, uniqueColors, collections, rashis]);

  return (
    <div className="space-y-3">
      {/* ── Row 1: Search + Status toggles + Advanced filter + Clear ── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search SKU, name, category..."
              className="pl-9 h-10"
              value={queryValue}
              onChange={(e) => { setQueryValue(e.target.value); handleSearch(e.target.value); }}
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Advanced Filters Popover */}
            <Popover open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-10 gap-2 relative">
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="hidden sm:inline">Filters</span>
                  {activeFilterCount > 0 && (
                    <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] rounded-full" variant="default">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[360px] p-4" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Filters</h4>
                    {activeFilterCount > 0 && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={clearAll}>
                        <RotateCcw className="h-3 w-3 mr-1" /> Reset all
                      </Button>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Category</label>
                    <MultiSelectFilter
                      options={uniqueCategories.map((c) => ({ value: c.name, label: c.name }))}
                      selected={getMultiValues("category")}
                      onChange={(values) => setMultiParam("category", values)}
                      placeholder="Category"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Gem Type</label>
                    <MultiSelectFilter
                      options={uniqueGemstones.map((g) => ({ value: g.name, label: g.name }))}
                      selected={getMultiValues("gemType")}
                      onChange={(values) => setMultiParam("gemType", values)}
                      placeholder="Gem Type"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Color</label>
                    <MultiSelectFilter
                      options={uniqueColors.map((c) => ({ value: c.id, label: c.name }))}
                      selected={getMultiValues("color")}
                      onChange={(values) => setMultiParam("color", values)}
                      placeholder="Color"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Vendor</label>
                    <MultiSelectFilter
                      options={vendors.map((v) => ({ value: v.id, label: v.name }))}
                      selected={getMultiValues("vendorId")}
                      onChange={(values) => setMultiParam("vendorId", values)}
                      placeholder="Vendor"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Weight Range</label>
                    <MultiSelectFilter
                      options={WEIGHT_OPTIONS.filter(w => w.value !== "ALL")}
                      selected={searchParams.get("weightRange") ? [searchParams.get("weightRange")!] : []}
                      onChange={(values) => setParam("weightRange", values[0] || "ALL")}
                      placeholder="Weight"
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Clear All */}
            {activeChips.length > 0 && (
              <Button variant="ghost" size="sm" className="h-10 gap-1.5 text-muted-foreground hover:text-foreground" onClick={clearAll}>
                <X className="h-4 w-4" />
                <span className="hidden sm:inline">Clear</span>
              </Button>
            )}
          </div>
        </div>

        {/* Status toggle pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUS_OPTIONS.map((opt) => {
            const isActive = currentStatus === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setParam("status", opt.value)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Row 2: Active filter chips ── */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {activeChips.map((c) => (
            <button
              key={c.key}
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs text-foreground hover:bg-primary/10 transition-colors"
              onClick={() => removeParam(c.key)}
            >
              {c.label}
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
