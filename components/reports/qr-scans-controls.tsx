"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, X } from "lucide-react";

function useDebouncedCallback(callback: (value: string) => void, delay: number) {
  const timeoutRef = useRef<number | null>(null);

  const debounced = useCallback(
    (value: string) => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => callback(value), delay);
    },
    [callback, delay]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  return debounced;
}

export function QrScansControls() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleSearch = useDebouncedCallback((term: string) => setParam("q", term), 250);

  const clearAll = () => {
    router.replace(pathname);
  };

  const csvUrl = (() => {
    const params = new URLSearchParams(searchParams);
    return `/api/reports/qr-scans/export?${params.toString()}`;
  })();

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <Input
          placeholder="Search SKU/Invoice, IP, browser..."
          defaultValue={searchParams.get("q")?.toString() || ""}
          onChange={(e) => handleSearch(e.target.value)}
          className="md:w-[420px]"
        />
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <Input type="date" value={searchParams.get("from")?.toString() || ""} onChange={(e) => setParam("from", e.target.value)} />
          <Input type="date" value={searchParams.get("to")?.toString() || ""} onChange={(e) => setParam("to", e.target.value)} />
          <Select value={searchParams.get("sort")?.toString() || "createdAt_desc"} onValueChange={(v) => setParam("sort", v)}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Sort" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt_desc">Newest</SelectItem>
              <SelectItem value="createdAt_asc">Oldest</SelectItem>
            </SelectContent>
          </Select>
          <Select value={searchParams.get("pageSize")?.toString() || "25"} onValueChange={(v) => setParam("pageSize", v)}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="Rows" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 md:ml-auto">
          <Button asChild variant="secondary">
            <a href={csvUrl} target="_blank" rel="noreferrer">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </a>
          </Button>
          <Button variant="outline" onClick={clearAll}>
            <X className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}

