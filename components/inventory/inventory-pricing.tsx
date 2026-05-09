"use client";

import { type UseFormReturn } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { FormInputValues } from "./inventory-form.types";

interface PricingSectionProps {
  form: UseFormReturn<FormInputValues>;
  vendors: { id: string; name: string }[];
}

export function PricingSection({ form, vendors }: PricingSectionProps) {
  const pricingMode = form.watch("pricingMode");

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
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Pricing Mode</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="flex flex-col space-y-1"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="PER_CARAT" />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Per Carat Pricing
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="FLAT" />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Flat Rate Pricing
                    </FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
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
                  <FormLabel>Total Cost</FormLabel>
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
