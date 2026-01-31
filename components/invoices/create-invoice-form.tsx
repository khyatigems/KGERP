
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { createOrUpdateInvoiceFromSale } from "@/app/(dashboard)/invoices/actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CreateInvoiceFormProps {
  saleId: string;
  initialOptions: Record<string, boolean>;
}

export function CreateInvoiceForm({ saleId, initialOptions }: CreateInvoiceFormProps) {
  const [options, setOptions] = useState(initialOptions);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleChange = (key: string, checked: boolean) => {
    setOptions(prev => ({ ...prev, [key]: checked }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await createOrUpdateInvoiceFromSale(saleId, options);
      if (result.success) {
        toast.success(result.message);
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
    showPrice: "Price Breakdown"
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Object.entries(options).map(([key, value]) => (
          <div key={key} className="flex items-center space-x-2 border p-3 rounded-md hover:bg-gray-50 transition-colors">
            <Checkbox 
              id={key} 
              checked={value} 
              onCheckedChange={(c) => handleChange(key, c as boolean)} 
            />
            <Label htmlFor={key} className="cursor-pointer flex-1 font-medium">
              {fieldLabels[key] || key}
            </Label>
          </div>
        ))}
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
