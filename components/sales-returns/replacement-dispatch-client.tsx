"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function ReplacementDispatchClient({
  salesReturnId,
  items,
  customerName,
}: {
  salesReturnId: string;
  customerName?: string;
  items: Array<{ id: string; sku: string; itemName: string; sellingPrice: number | null }>;
}) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((it) => (it.sku + " " + it.itemName).toLowerCase().includes(term));
  }, [items, q]);

  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected]);

  const toggle = (id: string) => setSelected((prev) => ({ ...prev, [id]: !prev[id] }));

  const submit = async () => {
    const arr = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([id]) => ({ inventoryId: id }));
    if (!arr.length) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/sales-returns/${salesReturnId}/replacement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: arr, customerName }),
      });
      const data = await res.json();
      alert(res.ok ? `Memo created: ${data.memoId}` : (data?.error || "Failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Customer: <span className="font-medium">{customerName || "-"}</span>
        </div>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search SKU or Item..." className="md:w-[280px]" />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((it) => (
              <TableRow key={it.id}>
                <TableCell className="font-medium">{it.sku}</TableCell>
                <TableCell>{it.itemName}</TableCell>
                <TableCell className="text-right">{(it.sellingPrice || 0).toLocaleString("en-IN")}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant={selected[it.id] ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggle(it.id)}
                  >
                    {selected[it.id] ? "Selected" : "Select"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{selectedCount ? `${selectedCount} item(s) selected` : ""}</div>
        <Button onClick={submit} disabled={!selectedCount || isSubmitting}>
          Create Memo
        </Button>
      </div>
    </div>
  );
}

