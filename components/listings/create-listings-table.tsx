"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addListing } from "@/app/(dashboard)/inventory/listing-actions";
import { toast } from "sonner";

type InventoryRow = {
  id: string;
  sku: string;
  itemName: string;
  category: string | null;
  gemType: string | null;
  color: string | null;
  pricingMode: string | null;
  sellingRatePerCarat: number | null;
  weightValue: number | null;
  flatSellingPrice: number | null;
  sellingPrice: number | null;
  status: string;
  createdAt: string;
  listings?: Array<{ platform: string }>;
};

type Filters = {
  q: string;
  category: string;
  gemType: string;
  color: string;
  status: string;
  minPrice: string;
  maxPrice: string;
  sort: string;
  pageSize: string;
};

const defaultFilters: Filters = {
  q: "",
  category: "",
  gemType: "",
  color: "",
  status: "IN_STOCK",
  minPrice: "",
  maxPrice: "",
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

export function CreateListingsTable() {
  const router = useRouter();
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const debouncedFilters = useDebouncedValue(filters, 250);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [itemById, setItemById] = useState<Record<string, InventoryRow>>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [platform, setPlatform] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [listingPrices, setListingPrices] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(debouncedFilters).forEach(([k, v]) => {
      if (!v) return;
      params.set(k, v);
    });
    params.set("page", String(page));
    params.set("pageSize", debouncedFilters.pageSize || "25");
    params.set("includeListings", "1");
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
        const items = (json.items || []) as InventoryRow[];
        setRows(items);
        setTotal(Number(json.total || 0));
        setItemById((prev) => {
          const next = { ...prev };
          for (const it of items) next[it.id] = it;
          return next;
        });
      } finally {
        setLoading(false);
      }
    };
    run();
    return () => ac.abort();
  }, [query]);

  const totalPages = Math.max(1, Math.ceil(total / Number(filters.pageSize || "25")));

  const setFilter = (patch: Partial<Filters>) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  const toggleSelectAll = () => {
    const ids = rows.map((r) => r.id);
    const allSelected = ids.length > 0 && ids.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    if (!isDialogOpen) return;
    const initialPrices: Record<string, string> = {};
    selectedIds.forEach((id) => {
      const item = itemById[id];
      if (!item) return;
      const systemPrice =
        typeof item.sellingPrice === "number" && Number.isFinite(item.sellingPrice)
          ? item.sellingPrice
          : item.pricingMode === "PER_CARAT"
          ? (item.sellingRatePerCarat || 0) * (item.weightValue || 0)
          : item.flatSellingPrice || 0;
      initialPrices[id] = Number(systemPrice || 0).toFixed(2);
    });
    setListingPrices(initialPrices);
  }, [isDialogOpen, selectedIds, itemById]);

  const handlePriceChange = (id: string, value: string) => {
    setListingPrices((prev) => ({ ...prev, [id]: value }));
  };

  const handleBulkCreate = async () => {
    if (!platform) {
      toast.error("Please select a platform");
      return;
    }

    const invalidPrices = Array.from(selectedIds).some((id) => {
      const price = parseFloat(listingPrices[id] || "0");
      return Number.isNaN(price) || price <= 0;
    });
    if (invalidPrices) {
      toast.error("Please enter valid prices for all items");
      return;
    }

    setIsSubmitting(true);
    try {
      const results = await Promise.all(
        Array.from(selectedIds).map(async (inventoryId) => {
          const priceValue = parseFloat(listingPrices[inventoryId]);
          return addListing({
            inventoryId,
            platform,
            listedPrice: priceValue,
            currency,
            status: "LISTED",
            listingUrl: "",
            listingRef: "",
          });
        })
      );

      const failures = results.filter((r) => !r.success);
      if (failures.length > 0) {
        toast.error(`Failed to create ${failures.length} listings`);
      }
      toast.success(`Created ${results.length - failures.length} listings successfully`);
      setIsDialogOpen(false);
      setSelectedIds(new Set());
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create listings");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
        <Input value={filters.q} onChange={(e) => setFilter({ q: e.target.value })} placeholder="Search SKU/name..." className="md:col-span-2" />
        <Input value={filters.category} onChange={(e) => setFilter({ category: e.target.value })} placeholder="Category" />
        <Input value={filters.gemType} onChange={(e) => setFilter({ gemType: e.target.value })} placeholder="Gem Type" />
        <Input value={filters.color} onChange={(e) => setFilter({ color: e.target.value })} placeholder="Color" />
        <Select value={filters.status} onValueChange={(v) => setFilter({ status: v })}>
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
        <Input value={filters.minPrice} onChange={(e) => setFilter({ minPrice: e.target.value })} placeholder="Min Price" />
        <Input value={filters.maxPrice} onChange={(e) => setFilter({ maxPrice: e.target.value })} placeholder="Max Price" />
        <Select value={filters.sort} onValueChange={(v) => setFilter({ sort: v })}>
          <SelectTrigger><SelectValue placeholder="Sort" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt_desc">Newest</SelectItem>
            <SelectItem value="createdAt_asc">Oldest</SelectItem>
            <SelectItem value="sku_asc">SKU A-Z</SelectItem>
            <SelectItem value="sku_desc">SKU Z-A</SelectItem>
            <SelectItem value="price_asc">Price Low-High</SelectItem>
            <SelectItem value="price_desc">Price High-Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.pageSize} onValueChange={(v) => { setPage(1); setFilters((p) => ({ ...p, pageSize: v })); }}>
          <SelectTrigger><SelectValue placeholder="Rows" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" onClick={() => { setPage(1); setFilters(defaultFilters); }}>
          Reset
        </Button>
      </div>

      <div className="flex items-center justify-between rounded-lg border bg-background p-4">
        <div className="text-sm text-muted-foreground">
          {selectedIds.size} items selected
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={selectedIds.size === 0}>
              Create Listings ({selectedIds.size})
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Listings</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div>
                <Label htmlFor="platform">Platform</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WEBSITE">Website</SelectItem>
                    <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                    <SelectItem value="INSTAGRAM">Instagram</SelectItem>
                    <SelectItem value="EBAY">eBay</SelectItem>
                    <SelectItem value="AMAZON">Amazon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              {Array.from(selectedIds).map((id) => {
                const item = itemById[id];
                return (
                  <div key={id} className="flex items-center gap-3 rounded border p-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-xs">{item?.sku || id}</div>
                      <div className="text-sm truncate">{item?.itemName || "-"}</div>
                    </div>
                    <div className="w-36">
                      <Input
                        type="number"
                        step="0.01"
                        value={listingPrices[id] || ""}
                        onChange={(e) => handlePriceChange(id, e.target.value)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleBulkCreate} disabled={isSubmitting || selectedIds.size === 0}>
                {isSubmitting ? "Creating..." : "Create Listings"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox checked={rows.length > 0 && rows.every((r) => selectedIds.has(r.id))} onCheckedChange={toggleSelectAll} />
              </TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Listed On</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  {loading ? "Loading..." : "No eligible items found."}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((item) => (
                <TableRow key={item.id} data-state={selectedIds.has(item.id) ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox checked={selectedIds.has(item.id)} onCheckedChange={() => toggleSelect(item.id)} />
                  </TableCell>
                  <TableCell className="font-mono">{item.sku}</TableCell>
                  <TableCell>{item.itemName}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>
                    {formatCurrency(
                      item.sellingPrice ??
                        (item.pricingMode === "PER_CARAT"
                          ? (item.sellingRatePerCarat || 0) * (item.weightValue || 0)
                          : item.flatSellingPrice || 0)
                    )}
                  </TableCell>
                  <TableCell>
                    {item.listings && item.listings.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {item.listings.map((l, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {l.platform}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Not Listed Yet</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.status}</Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Page {page} / {totalPages} • {total} items
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading}>
            Previous
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

