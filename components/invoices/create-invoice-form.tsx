
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createOrUpdateInvoiceFromSale } from "@/app/(dashboard)/invoices/actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CreateInvoiceFormProps {
  saleId: string;
  initialOptions: Record<string, boolean | number | string>;
}

export function CreateInvoiceForm({ saleId, initialOptions }: CreateInvoiceFormProps) {
  const [options, setOptions] = useState<Record<string, boolean>>(() => {
    const out: Record<string, boolean> = {};
    Object.entries(initialOptions).forEach(([k, v]) => {
      if (typeof v === "boolean") out[k] = v;
    });
    return out;
  });
  const [shippingCharge, setShippingCharge] = useState(() => {
    const v = initialOptions.shippingCharge;
    return typeof v === "number" ? v : Number(v || 0);
  });
  const [additionalCharge, setAdditionalCharge] = useState(() => {
    const v = initialOptions.additionalCharge;
    return typeof v === "number" ? v : Number(v || 0);
  });
  const [invoiceDiscountType, setInvoiceDiscountType] = useState(() => {
    const v = initialOptions.invoiceDiscountType;
    return v === "PERCENT" ? "PERCENT" : "AMOUNT";
  });
  const [invoiceDiscountValue, setInvoiceDiscountValue] = useState(() => {
    const v = initialOptions.invoiceDiscountValue;
    return typeof v === "number" ? v : Number(v || 0);
  });
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleChange = (key: string, checked: boolean) => {
    setOptions(prev => ({ ...prev, [key]: checked }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const payload: Record<string, unknown> = {
        ...options,
        shippingCharge: Number.isFinite(shippingCharge) ? shippingCharge : 0,
        additionalCharge: Number.isFinite(additionalCharge) ? additionalCharge : 0,
        invoiceDiscountType,
        invoiceDiscountValue: Number.isFinite(invoiceDiscountValue) ? invoiceDiscountValue : 0,
      };
      const result = await createOrUpdateInvoiceFromSale(saleId, payload);
      if (result.success) {
        const delta = "outstandingDelta" in result ? (result as { outstandingDelta?: unknown }).outstandingDelta : undefined;
        if (typeof delta === "number" && delta > 0.009) {
          toast.error(
            `Outstanding balance increased by ₹${Number(delta).toFixed(2)}. Please collect the additional amount before marking invoice as paid.`,
            { duration: 10000 }
          );
        } else {
          toast.success(result.message);
        }
        if (result.token) {
           window.open(`/invoice/${result.token}`, '_blank');
           router.push("/sales");
           router.refresh();
        }
      } else {
        toast.error(result.message);
      }
    });
  };

  const fieldLabels: Record<string, string> = {
    showWeight: "Weight",
    showRatti: "Weight in Ratti",
    showDimensions: "Dimensions",
    showGemType: "Gem Type",
    showCategory: "Category",
    showColor: "Color",
    showShape: "Shape",
    showRashi: "Rashi",
    showCertificates: "Certificates",
    showSku: "SKU",
    showPrice: "Price Breakdown",
    showShippingCharge: "Show Shipping Charges",
    showAdditionalCharge: "Show Additional Charges"
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Object.entries(options).map(([key, value]) => (
          <div key={key} className="flex items-center space-x-2 border p-3 rounded-md hover:bg-gray-50 transition-colors">
            <Checkbox 
              id={key} 
              checked={value} 
              onCheckedChange={(c) => handleChange(key, c === true)} 
            />
            <Label htmlFor={key} className="cursor-pointer flex-1 font-medium">
              {fieldLabels[key] || key}
            </Label>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="shippingCharge">Shipping Charges</Label>
          <Input
            id="shippingCharge"
            type="number"
            value={shippingCharge}
            onChange={(e) => setShippingCharge(Number(e.target.value || 0))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="additionalCharge">Additional Charges</Label>
          <Input
            id="additionalCharge"
            type="number"
            value={additionalCharge}
            onChange={(e) => setAdditionalCharge(Number(e.target.value || 0))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="invoiceDiscountType">Invoice Discount Type</Label>
          <Select value={invoiceDiscountType} onValueChange={setInvoiceDiscountType}>
            <SelectTrigger id="invoiceDiscountType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AMOUNT">Amount</SelectItem>
              <SelectItem value="PERCENT">Percent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="invoiceDiscountValue">Invoice Discount Value</Label>
          <Input
            id="invoiceDiscountValue"
            type="number"
            value={invoiceDiscountValue}
            onChange={(e) => setInvoiceDiscountValue(Number(e.target.value || 0))}
          />
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isPending ? "Generating..." : "Generate Invoice"}
        </Button>
      </div>
    </form>
  );
}
