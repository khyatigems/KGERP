"use client";

import { useWatch, type UseFormReturn } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FormInputValues } from "./inventory-form.types";

interface PricingSectionProps {
  form: UseFormReturn<FormInputValues>;
  vendors: { id: string; name: string }[];
}

export function PricingSection({ form, vendors }: PricingSectionProps) {
  const pricingMode = useWatch({
    control: form.control,
    name: "pricingMode",
  }) || "PER_CARAT";

  const setPricingMode = (mode: "PER_CARAT" | "FLAT") => {
    if (mode === pricingMode) return;

    if (mode === "FLAT") {
      const purchaseRate = Number(form.getValues("purchaseRatePerCarat") || 0);
      const sellingRate = Number(form.getValues("sellingRatePerCarat") || 0);
      const currentFlatCost = Number(form.getValues("flatPurchaseCost") || 0);
      const currentFlatSelling = Number(form.getValues("flatSellingPrice") || 0);
      if (!currentFlatCost && purchaseRate > 0) {
        form.setValue("flatPurchaseCost", purchaseRate, { shouldDirty: true });
      }
      if (!currentFlatSelling && sellingRate > 0) {
        form.setValue("flatSellingPrice", sellingRate, { shouldDirty: true });
      }
      form.clearErrors(["flatPurchaseCost", "flatSellingPrice"]);
    } else {
      const flatCost = Number(form.getValues("flatPurchaseCost") || 0);
      const flatSelling = Number(form.getValues("flatSellingPrice") || 0);
      const currentPurchaseRate = Number(form.getValues("purchaseRatePerCarat") || 0);
      const currentSellingRate = Number(form.getValues("sellingRatePerCarat") || 0);
      if (!currentPurchaseRate && flatCost > 0) {
        form.setValue("purchaseRatePerCarat", flatCost, { shouldDirty: true });
      }
      if (!currentSellingRate && flatSelling > 0) {
        form.setValue("sellingRatePerCarat", flatSelling, { shouldDirty: true });
      }
      form.clearErrors(["purchaseRatePerCarat", "sellingRatePerCarat"]);
    }

    form.setValue("pricingMode", mode, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card/50 p-5 space-y-4">
        <h3 className="text-base font-semibold">Pricing & Source</h3>

        <FormField
          control={form.control}
          name="vendorId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Vendor</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Vendor" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="pricingMode"
          render={() => (
            <FormItem className="space-y-3">
              <FormLabel>Pricing Mode</FormLabel>
              <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/20 p-1">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setPricingMode("PER_CARAT")}
                  aria-pressed={pricingMode === "PER_CARAT"}
                  className={cn(
                    "h-9 rounded-md text-sm",
                    pricingMode === "PER_CARAT" && "bg-background text-foreground shadow-sm"
                  )}
                >
                  Per Carat
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setPricingMode("FLAT")}
                  aria-pressed={pricingMode === "FLAT"}
                  className={cn(
                    "h-9 rounded-md text-sm",
                    pricingMode === "FLAT" && "bg-background text-foreground shadow-sm"
                  )}
                >
                  Flat Total
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {pricingMode === "PER_CARAT" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="purchaseRatePerCarat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purchase Rate (/ct)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sellingRatePerCarat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Selling Rate (/ct)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="flatPurchaseCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Purchase Cost</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="flatSellingPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Selling Price</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <FormField
          control={form.control}
          name="stockLocation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Stock Location</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Box A1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
