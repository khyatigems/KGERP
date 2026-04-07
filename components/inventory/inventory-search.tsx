"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useGlobalLoader } from "@/components/global-loader-provider";

function useDebouncedCallback(callback: (value: string) => void, delay: number) {
  const timeoutRef = useRef<number | null>(null);

  const debounced = useCallback(
    (value: string) => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        callback(value);
      }, delay);
    },
    [callback, delay]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debounced;
}

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
  const [isApplying, setIsApplying] = useState(false);
  const applyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (applyTimerRef.current !== null) window.clearTimeout(applyTimerRef.current);
    };
  }, []);

  const pulseApply = () => {
    setIsApplying(true);
    if (applyTimerRef.current !== null) window.clearTimeout(applyTimerRef.current);
    applyTimerRef.current = window.setTimeout(() => setIsApplying(false), 450);
  };

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams);
    if (term) {
      params.set("query", term);
    } else {
      params.delete("query");
    }
    params.delete("page");
    pulseApply();
    showLoader();
    replace(`${pathname}?${params.toString()}`);
  }, 300);

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== "ALL") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    pulseApply();
    showLoader();
    replace(`${pathname}?${params.toString()}`);
  };

  const handleClear = () => {
    pulseApply();
    showLoader();
    replace(pathname);
  };

  const removeParam = (key: string) => {
    const params = new URLSearchParams(searchParams);
    params.delete(key);
    params.delete("page");
    pulseApply();
    showLoader();
    replace(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  };

  const activeChips = (() => {
    const chips: Array<{ key: string; label: string }> = [];
    const q = (searchParams.get("query") || "").trim();
    const status = searchParams.get("status");
    const vendorId = searchParams.get("vendorId");
    const category = searchParams.get("category");
    const gemType = searchParams.get("gemType");
    const color = searchParams.get("color");
    const collectionId = searchParams.get("collectionId");

    if (q) chips.push({ key: "query", label: `Search: ${q}` });
    if (status) chips.push({ key: "status", label: `Status: ${status.replaceAll("_", " ")}` });
    if (vendorId) chips.push({ key: "vendorId", label: `Vendor: ${vendors.find((v) => v.id === vendorId)?.name || vendorId}` });
    if (category) chips.push({ key: "category", label: `Category: ${category}` });
    if (gemType) chips.push({ key: "gemType", label: `Gem: ${gemType}` });
    if (color) chips.push({ key: "color", label: `Color: ${color}` });
    if (collectionId) chips.push({ key: "collectionId", label: `Collection: ${collections.find((c) => c.id === collectionId)?.name || collectionId}` });
    return chips;
  })();

  return (
    <div className={`space-y-4 transition-all duration-300 ${isApplying ? "opacity-90" : "opacity-100"}`}>
      {isApplying && (
        <div className="h-1 w-full rounded-full bg-muted overflow-hidden border">
          <div className="h-full w-2/3 bg-gradient-to-r from-primary via-blue-500 to-primary animate-in fade-in duration-300" />
        </div>
      )}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <Input
          placeholder="Search SKU, Name, or Category..."
          className="flex-1"
          onChange={(e) => handleSearch(e.target.value)}
          defaultValue={searchParams.get("query")?.toString()}
        />
        {(searchParams.toString().length > 0) && (
          <Button variant="ghost" onClick={handleClear} className="px-2 lg:px-3">
            <X className="mr-2 h-4 w-4" />
            Clear All Filters
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Select
            value={searchParams.get("status")?.toString() || "ALL"}
            onValueChange={(val) => handleFilterChange("status", val)}
        >
            <SelectTrigger>
            <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="IN_STOCK">In Stock</SelectItem>
            <SelectItem value="SOLD">Sold</SelectItem>
            <SelectItem value="RESERVED">Reserved</SelectItem>
            <SelectItem value="MEMO">Memo</SelectItem>
            </SelectContent>
        </Select>

        <Select
            value={searchParams.get("vendorId")?.toString() || "ALL"}
            onValueChange={(val) => handleFilterChange("vendorId", val)}
        >
            <SelectTrigger>
            <SelectValue placeholder="Vendor" />
            </SelectTrigger>
            <SelectContent>
            <SelectItem value="ALL">All Vendors</SelectItem>
            {vendors.map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
            ))}
            </SelectContent>
        </Select>

        <Select
            value={searchParams.get("category")?.toString() || "ALL"}
            onValueChange={(val) => handleFilterChange("category", val)}
        >
            <SelectTrigger>
            <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            {categories.map((c) => (
                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
            ))}
            </SelectContent>
        </Select>

         <Select
            value={searchParams.get("gemType")?.toString() || "ALL"}
            onValueChange={(val) => handleFilterChange("gemType", val)}
        >
            <SelectTrigger>
            <SelectValue placeholder="Gem Type" />
            </SelectTrigger>
            <SelectContent>
            <SelectItem value="ALL">All Gems</SelectItem>
            {gemstones.map((g) => (
                <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>
            ))}
            </SelectContent>
        </Select>

         <Select
            value={searchParams.get("color")?.toString() || "ALL"}
            onValueChange={(val) => handleFilterChange("color", val)}
        >
            <SelectTrigger>
            <SelectValue placeholder="Color" />
            </SelectTrigger>
            <SelectContent>
            <SelectItem value="ALL">All Colors</SelectItem>
            {colors.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
            </SelectContent>
        </Select>

         <Select
            value={searchParams.get("collectionId")?.toString() || "ALL"}
            onValueChange={(val) => handleFilterChange("collectionId", val)}
        >
            <SelectTrigger>
            <SelectValue placeholder="Collection" />
            </SelectTrigger>
            <SelectContent>
            <SelectItem value="ALL">All Collections</SelectItem>
            {collections.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
            </SelectContent>
        </Select>

         <Select
            value={searchParams.get("rashiId")?.toString() || "ALL"}
            onValueChange={(val) => handleFilterChange("rashiId", val)}
        >
            <SelectTrigger>
            <SelectValue placeholder="Rashi" />
            </SelectTrigger>
            <SelectContent>
            <SelectItem value="ALL">All Rashis</SelectItem>
            {rashis.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
            ))}
            </SelectContent>
        </Select>

        <Select
            value={searchParams.get("weightRange")?.toString() || "ALL"}
            onValueChange={(val) => handleFilterChange("weightRange", val)}
        >
            <SelectTrigger>
            <SelectValue placeholder="Weight Range" />
            </SelectTrigger>
            <SelectContent>
            <SelectItem value="ALL">All Weights</SelectItem>
            <SelectItem value="0-1">0 - 1 cts</SelectItem>
            <SelectItem value="1-3">1 - 3 cts</SelectItem>
            <SelectItem value="3-5">3 - 5 cts</SelectItem>
            <SelectItem value="5-10">5 - 10 cts</SelectItem>
            <SelectItem value="10-plus">10+ cts</SelectItem>
            </SelectContent>
        </Select>

      </div>

      {activeChips.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {activeChips.map((c) => (
            <button
              key={c.key}
              type="button"
              className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground hover:bg-muted/30"
              onClick={() => removeParam(c.key)}
            >
              <span className="text-foreground">{c.label}</span>
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
