"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type InventoryRow = {
  id: string;
  sku: string;
  itemName: string;
  category: string | null;
  gemType: string | null;
  color: string | null;
  sellingPrice: number | null;
  status: string;
  createdAt: string;
};

type Preset = {
  name: string;
  filters: Filters;
};

type Filters = {
  q: string;
  category: string;
  gemType: string;
  color: string;
  status: string;
  minPrice: string;
  maxPrice: string;
  createdFrom: string;
  createdTo: string;
  sort: string;
  pageSize: string;
};

const presetKey = "khyatigems.listing.inventoryFilterPresets";

const defaultFilters: Filters = {
  q: "",
  category: "",
  gemType: "",
  color: "",
  status: "IN_STOCK",
  minPrice: "",
  maxPrice: "",
  createdFrom: "",
  createdTo: "",
  sort: "createdAt_desc",
  pageSize: "25",
};

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export function InventoryPicker({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (id: string) => void;
}) {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const debouncedFilters = useDebouncedValue(filters, 250);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(presetKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Preset[];
      if (Array.isArray(parsed)) setPresets(parsed);
    } catch {}
  }, []);

  const savePresets = (next: Preset[]) => {
    setPresets(next);
    try {
      localStorage.setItem(presetKey, JSON.stringify(next));
    } catch {}
  };

  const query = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(debouncedFilters).forEach(([k, v]) => {
      if (!v) return;
      params.set(k, v);
    });
    params.set("page", String(page));
    params.set("pageSize", debouncedFilters.pageSize || "25");
    return params.toString();
  }, [debouncedFilters, page]);

  useEffect(() => {
    const ac = new AbortController();
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/inventory/search?${query}`, { signal: ac.signal, cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        setRows(json.items || []);
        setTotal(Number(json.total || 0));
      } finally {
        setLoading(false);
      }
    };
    run();
    return () => ac.abort();
  }, [query]);

  const totalPages = Math.max(1, Math.ceil(total / Number(filters.pageSize || "25")));

  const onChange = (patch: Partial<Filters>) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  const onApplyPreset = (name: string) => {
    const preset = presets.find((p) => p.name === name);
    if (!preset) return;
    setPage(1);
    setFilters(preset.filters);
    setSelectedPreset(name);
  };

  const onSavePreset = () => {
    const name = presetName.trim();
    if (!name) return;
    const next = presets.filter((p) => p.name !== name).concat([{ name, filters }]);
    savePresets(next);
    setPresetName("");
  };

  const onDeletePreset = (name: string) => {
    const next = presets.filter((p) => p.name !== name);
    savePresets(next);
    if (selectedPreset === name) setSelectedPreset("");
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
        <Input value={filters.q} onChange={(e) => onChange({ q: e.target.value })} placeholder="Search SKU, name, notes..." className="md:col-span-2" />
        <Input value={filters.category} onChange={(e) => onChange({ category: e.target.value })} placeholder="Category" />
        <Input value={filters.gemType} onChange={(e) => onChange({ gemType: e.target.value })} placeholder="Gem Type" />
        <Input value={filters.color} onChange={(e) => onChange({ color: e.target.value })} placeholder="Color" />
        <Select value={filters.status} onValueChange={(v) => onChange({ status: v })}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="IN_STOCK">IN_STOCK</SelectItem>
            <SelectItem value="SOLD">SOLD</SelectItem>
            <SelectItem value="RESERVED">RESERVED</SelectItem>
            <SelectItem value="ON_MEMO">ON_MEMO</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
        <Input value={filters.minPrice} onChange={(e) => onChange({ minPrice: e.target.value })} placeholder="Min Price" />
        <Input value={filters.maxPrice} onChange={(e) => onChange({ maxPrice: e.target.value })} placeholder="Max Price" />
        <Input type="date" value={filters.createdFrom} onChange={(e) => onChange({ createdFrom: e.target.value })} />
        <Input type="date" value={filters.createdTo} onChange={(e) => onChange({ createdTo: e.target.value })} />
        <Select value={filters.sort} onValueChange={(v) => onChange({ sort: v })}>
          <SelectTrigger><SelectValue placeholder="Sort" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt_desc">Newest</SelectItem>
            <SelectItem value="createdAt_asc">Oldest</SelectItem>
            <SelectItem value="sku_asc">SKU A-Z</SelectItem>
            <SelectItem value="sku_desc">SKU Z-A</SelectItem>
            <SelectItem value="name_asc">Name A-Z</SelectItem>
            <SelectItem value="price_asc">Price Low-High</SelectItem>
            <SelectItem value="price_desc">Price High-Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.pageSize} onValueChange={(v) => { setPage(1); setFilters((p) => ({ ...p, pageSize: v })); }}>
          <SelectTrigger><SelectValue placeholder="Page size" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <Select onValueChange={onApplyPreset} value={selectedPreset}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filter presets" />
            </SelectTrigger>
            <SelectContent>
              {presets.length === 0 ? (
                <SelectItem value="__none" disabled>No presets</SelectItem>
              ) : (
                presets.map((p) => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)
              )}
            </SelectContent>
          </Select>
          <Input value={presetName} onChange={(e) => setPresetName(e.target.value)} placeholder="Preset name" className="md:w-[200px]" />
          <Button type="button" variant="secondary" onClick={onSavePreset}>Save Preset</Button>
          <Button type="button" variant="ghost" disabled={!selectedPreset} onClick={() => selectedPreset && onDeletePreset(selectedPreset)}>
            Delete Preset
          </Button>
        </div>
        <Button type="button" variant="outline" onClick={() => setFilters(defaultFilters)} className="w-fit">
          <RefreshCw className="mr-2 h-4 w-4" />
          Reset
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Select</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} className={row.id === value ? "bg-muted/40" : ""}>
                <TableCell className="font-mono text-xs">{row.sku}</TableCell>
                <TableCell>
                  <div className="font-medium">{row.itemName}</div>
                  <div className="text-xs text-muted-foreground">{[row.category, row.gemType, row.color].filter(Boolean).join(" • ")}</div>
                </TableCell>
                <TableCell><Badge variant="outline">{row.status}</Badge></TableCell>
                <TableCell className="text-right">{formatCurrency(row.sellingPrice ?? 0)}</TableCell>
                <TableCell className="text-right">
                  <Button type="button" size="sm" onClick={() => onSelect(row.id)} disabled={loading}>
                    {row.id === value ? "Selected" : "Select"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {loading ? "Loading..." : "No results"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {total} items
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm">{page} / {totalPages}</div>
          <Button type="button" variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
