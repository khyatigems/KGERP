"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { t } from "@/lib/i18n";

type InvoiceOption = {
  id: string;
  invoiceNumber: string;
  invoiceDate: string | Date | null;
  subtotal: number;
  taxTotal: number;
  placeOfSupply: string;
  items: Array<{ inventoryId: string; sku: string; itemName: string; sellingPrice: number; quantity: number }>;
};

type ReturnItemState = {
  selected: boolean;
  quantity: number;
  sellingPrice: number;
  resaleable: boolean;
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function computeGstSplit(input: { taxable: number; rate: number; companyState: string; placeOfSupply: string }) {
  const totalTax = round2(input.taxable * input.rate);
  const company = (input.companyState || "").trim().toLowerCase();
  const pos = (input.placeOfSupply || "").trim().toLowerCase();
  const interstate = Boolean(company && pos && company !== pos);
  if (interstate) return { igst: totalTax, cgst: 0, sgst: 0, totalTax };
  const half = round2(totalTax / 2);
  const remainder = round2(totalTax - half - half);
  return { igst: 0, cgst: half + remainder, sgst: half, totalTax };
}

export function SalesReturnForm({ invoices, companyState }: { invoices: InvoiceOption[]; companyState: string }) {
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

  const totals = useMemo(() => {
    if (!invoice) return null;
    const taxable = selectedItems.reduce((s, it) => s + Number(it.quantity || 1) * Number(it.sellingPrice || 0), 0);
    const rate = invoice.subtotal > 0 ? invoice.taxTotal / invoice.subtotal : 0;
    const split = computeGstSplit({ taxable, rate, companyState, placeOfSupply: invoice.placeOfSupply });
    return {
      taxable: round2(taxable),
      rate,
      ...split,
      total: round2(taxable + split.totalTax),
    };
  }, [invoice, selectedItems, companyState]);

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
          <div className="text-sm font-medium" title="Select the original invoice for return">{t("invoice")}</div>
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
          <div className="text-sm font-medium" title="Refund creates credit note; Replacement creates dispatch">{t("disposition")}</div>
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
          <div className="text-sm font-medium" title="Optional internal note">{t("remarks")}</div>
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
                <TableHead className="text-right w-[160px]">Price</TableHead>
                <TableHead className="text-right w-[140px]">Qty</TableHead>
                <TableHead className="text-right w-[140px]" title="If unchecked or return > 7 days, item goes to HOLD">Resaleable</TableHead>
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
                    <TableCell className="text-right">{(st?.sellingPrice ?? it.sellingPrice).toLocaleString("en-IN")}</TableCell>
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

      {invoice && totals && (
        <div className="rounded-md border p-4 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
          <div>
            <div className="text-muted-foreground">Taxable</div>
            <div className="font-medium">{formatCurrency(totals.taxable)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">GST</div>
            <div className="font-medium">{formatCurrency(totals.totalTax)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">CGST / SGST / IGST</div>
            <div className="font-medium">
              {formatCurrency(totals.cgst)} / {formatCurrency(totals.sgst)} / {formatCurrency(totals.igst)}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Total</div>
            <div className="font-medium">{formatCurrency(totals.total)}</div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {selectedItems.length ? `${selectedItems.length} item(s) selected` : ""}
        </div>
        <Button onClick={submit} disabled={isSubmitting} title="Creates return record and credit note (if refund)">
          {t("create_sales_return")}
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
