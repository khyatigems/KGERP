"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

type InvoiceOption = {
  id: string;
  invoiceNumber: string;
  invoiceDate: string | Date | null;
  items: Array<{ inventoryId: string; sku: string; itemName: string; sellingPrice: number; quantity: number }>;
};

type ReturnItemState = {
  selected: boolean;
  quantity: number;
  sellingPrice: number;
  resaleable: boolean;
};

export function SalesReturnForm({ invoices }: { invoices: InvoiceOption[] }) {
  const [invoiceId, setInvoiceId] = useState<string>("");
  const [disposition, setDisposition] = useState<"REFUND" | "REPLACEMENT">("REFUND");
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ returnNumber: string; creditNoteId?: string; creditNoteNumber?: string } | null>(null);

  const invoice = useMemo(() => invoices.find((i) => i.id === invoiceId) || null, [invoiceId, invoices]);

  const [itemsState, setItemsState] = useState<Record<string, ReturnItemState>>({});

  const syncItems = (inv: InvoiceOption | null) => {
    if (!inv) {
      setItemsState({});
      return;
    }
    const next: Record<string, ReturnItemState> = {};
    for (const it of inv.items) {
      next[it.inventoryId] = {
        selected: false,
        quantity: it.quantity || 1,
        sellingPrice: it.sellingPrice || 0,
        resaleable: true,
      };
    }
    setItemsState(next);
  };

  const onInvoiceChange = (id: string) => {
    setInvoiceId(id);
    setResult(null);
    syncItems(invoices.find((i) => i.id === id) || null);
  };

  const selectedItems = useMemo(() => {
    if (!invoice) return [];
    return invoice.items
      .filter((it) => itemsState[it.inventoryId]?.selected)
      .map((it) => ({
        inventoryId: it.inventoryId,
        quantity: itemsState[it.inventoryId].quantity,
        sellingPrice: itemsState[it.inventoryId].sellingPrice,
        resaleable: itemsState[it.inventoryId].resaleable,
      }));
  }, [invoice, itemsState]);

  const submit = async () => {
    if (!invoiceId) {
      toast.error("Select an invoice");
      return;
    }
    if (!selectedItems.length) {
      toast.error("Select at least one item to return");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/sales-returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, items: selectedItems, disposition, remarks }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "Failed to create sales return");
        return;
      }
      setResult({ returnNumber: data.returnNumber, creditNoteId: data.creditNoteId, creditNoteNumber: data.creditNoteNumber });
      toast.success(`Sales return created: ${data.returnNumber}`);
      if (data.creditNoteNumber) toast.success(`Credit note created: ${data.creditNoteNumber}`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to create sales return");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <div className="text-sm font-medium">Invoice</div>
          <Select value={invoiceId} onValueChange={onInvoiceChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select invoice" />
            </SelectTrigger>
            <SelectContent>
              {invoices.map((inv) => (
                <SelectItem key={inv.id} value={inv.id}>
                  {inv.invoiceNumber}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Disposition</div>
          <Select value={disposition} onValueChange={(v) => setDisposition(v as "REFUND" | "REPLACEMENT")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="REFUND">Refund (Credit Note)</SelectItem>
              <SelectItem value="REPLACEMENT">Replacement</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Remarks</div>
          <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional note..." />
        </div>
      </div>

      {invoice && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Return</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right w-[140px]">Qty</TableHead>
                <TableHead className="text-right w-[140px]">Resaleable</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((it) => {
                const st = itemsState[it.inventoryId];
                return (
                  <TableRow key={it.inventoryId}>
                    <TableCell>
                      <Checkbox
                        checked={!!st?.selected}
                        onCheckedChange={(v) =>
                          setItemsState((prev) => ({
                            ...prev,
                            [it.inventoryId]: { ...prev[it.inventoryId], selected: Boolean(v) },
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell className="font-medium">{it.sku}</TableCell>
                    <TableCell>{it.itemName}</TableCell>
                    <TableCell className="text-right">{it.sellingPrice.toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min={1}
                        value={st?.quantity ?? 1}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          setItemsState((prev) => ({
                            ...prev,
                            [it.inventoryId]: { ...prev[it.inventoryId], quantity: Number.isFinite(n) && n > 0 ? n : 1 },
                          }));
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Checkbox
                        checked={st?.resaleable ?? true}
                        onCheckedChange={(v) =>
                          setItemsState((prev) => ({
                            ...prev,
                            [it.inventoryId]: { ...prev[it.inventoryId], resaleable: Boolean(v) },
                          }))
                        }
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {selectedItems.length ? `${selectedItems.length} item(s) selected` : ""}
        </div>
        <Button onClick={submit} disabled={isSubmitting}>
          Create Sales Return
        </Button>
      </div>

      {result && (
        <div className="rounded-md border p-4 space-y-2">
          <div className="font-medium">Created</div>
          <div className="text-sm">Return #: {result.returnNumber}</div>
          {result.creditNoteNumber && <div className="text-sm">Credit Note #: {result.creditNoteNumber}</div>}
          {result.creditNoteId && (
            <Button variant="outline" onClick={() => window.open(`/api/credit-notes/${result.creditNoteId}/pdf`, "_blank")}>
              Download Credit Note PDF
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

