"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  
  return debounced;
}

export function PurchaseSearch() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams);
    if (term) {
      params.set("q", term);
    } else {
      params.delete("q");
    }
    replace(`${pathname}?${params.toString()}`);
  }, 300);

  const handleClear = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("q");
    replace(`${pathname}?${params.toString()}`);
  };

  const query = searchParams.get("q")?.toString();

  return (
    <div className="flex items-center gap-2 flex-1 md:max-w-sm">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search invoice, vendor, items..."
          className="pl-8"
          onChange={(e) => handleSearch(e.target.value)}
          defaultValue={query}
        />
      </div>
      {query && (
        <Button variant="ghost" size="icon" onClick={handleClear} title="Clear search">
            <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
