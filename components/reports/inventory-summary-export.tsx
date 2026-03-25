"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

type ColKey =
  | "sku"
  | "itemName"
  | "category"
  | "gemType"
  | "weightValue"
  | "sellingPrice"
  | "costPrice"
  | "hsnCode"
  | "certificateNumber";

const ALL_COLS: Array<{ key: ColKey; label: string; description: string }> = [
  { key: "sku", label: "SKU", description: "Stock keeping unit" },
  { key: "itemName", label: "Item", description: "Display item name" },
  { key: "category", label: "Category", description: "Category / type" },
  { key: "gemType", label: "Gem Type", description: "Gemstone type" },
  { key: "weightValue", label: "Weight", description: "Weight value" },
  { key: "sellingPrice", label: "Selling Price", description: "Selling price" },
  { key: "costPrice", label: "Cost Price", description: "Cost price" },
  { key: "hsnCode", label: "HSN", description: "HSN code" },
  { key: "certificateNumber", label: "Certificate", description: "Certificate no/number" },
];

const DEFAULT_COLS: ColKey[] = ["sku", "itemName", "category", "gemType", "weightValue", "sellingPrice"];

export function InventorySummaryExport() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Record<ColKey, boolean>>(() => {
    return Object.fromEntries(
      ALL_COLS.map((c) => [c.key, DEFAULT_COLS.includes(c.key)])
    ) as Record<ColKey, boolean>;
  });

  const cols = useMemo(() => ALL_COLS.filter((c) => selected[c.key]).map((c) => c.key), [selected]);

  const download = () => {
    const url = `/api/reports/inventory-summary/xlsx?cols=${encodeURIComponent(cols.join(","))}`;
    window.open(url, "_blank");
    setOpen(false);
  };

  const downloadCollections = () => {
    const url = `/api/reports/inventory-summary/xlsx?mode=collection&cols=${encodeURIComponent(["sku","itemName","collection","category","gemType","sellingPrice"].join(","))}`;
    window.open(url, "_blank");
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setOpen(true)} title="Exports sheets: InStock, Sold, Summary, ByCategory, ByGemType, ByCollection, Items_Collection">
          Export Inventory Summary
        </Button>
        <Button variant="outline" size="sm" onClick={downloadCollections} title="Exports collection-wise items + full collection summary (includes zero-stock collections)">
          Export Collections
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Inventory Summary Export</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">Choose columns for InStock and Sold sheets.</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ALL_COLS.map((c) => (
                <label key={c.key} className="flex items-start gap-2 rounded-md border p-3 cursor-pointer">
                  <Checkbox checked={selected[c.key]} onCheckedChange={(v) => setSelected((p) => ({ ...p, [c.key]: Boolean(v) }))} />
                  <div>
                    <div className="text-sm font-medium">{c.label}</div>
                    <div className="text-xs text-muted-foreground">{c.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={download} disabled={!cols.length}>Download Excel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
