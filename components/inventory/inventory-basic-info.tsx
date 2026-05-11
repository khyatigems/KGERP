"use client";

import { useEffect, type RefObject } from "react";
import { type UseFormReturn } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { CodeRow, FormInputValues } from "./inventory-form.types";

interface BasicInfoSectionProps {
  form: UseFormReturn<FormInputValues>;
  categories: CodeRow[];
  itemNameInputRef: RefObject<HTMLInputElement | null>;
  skuPreview: string;
  isSkuPreviewOpen: boolean;
  setIsSkuPreviewOpen: (v: boolean) => void;
}

export function BasicInfoSection({
  form,
  categories,
  itemNameInputRef,
  skuPreview,
  isSkuPreviewOpen,
  setIsSkuPreviewOpen,
}: BasicInfoSectionProps) {
  const categoryName = form.watch("category");
  const gemType = form.watch("gemType");
  const beadSize = form.watch("beadSize");

  const selectedCat = categories.find((c) => c.name === categoryName);
  const isBraceletCategory = (() => {
    if (typeof categoryName === "string" && categoryName.toLowerCase().includes("bracelet")) return true;
    if (selectedCat && selectedCat.code.toLowerCase().includes("brl")) return true;
    if (typeof gemType === "string" && gemType.toLowerCase().includes("bracelet")) return true;
    return false;
  })();

  useEffect(() => {
    const v = (beadSize || "").trim();
    if (!v) {
      form.setValue("beadSizeMm", "", { shouldValidate: false });
      return;
    }
    const m = v.match(/^(\d+(?:\.\d+)?)\s*mm?$/i);
    if (!m) return;
    const n = Number(m[1]);
    if (Number.isFinite(n)) {
      form.setValue("beadSizeMm", n);
    }
  }, [beadSize, form]);

  useEffect(() => {
    const selectedCategory = categories.find((c) => c.name === categoryName);
    if (selectedCategory && form.getValues("categoryCodeId") !== selectedCategory.id) {
      form.setValue("categoryCodeId", selectedCategory.id);
    }
  }, [categoryName, categories, form]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card/50 p-5 space-y-4">
        <h3 className="text-base font-semibold">Basic Information</h3>

        {isBraceletCategory && (
          <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800 space-y-4">
            <h4 className="font-medium text-sm flex items-center gap-2 text-purple-700 dark:text-purple-300">
              Bracelet Attributes
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="braceletType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "Elastic"}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Elastic">Elastic</SelectItem>
                        <SelectItem value="Thread">Thread</SelectItem>
                        <SelectItem value="Adjustable">Adjustable</SelectItem>
                        <SelectItem value="Silver">Silver</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="standardSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Standard Size</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "M"}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select Size" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="XS">XS</SelectItem>
                        <SelectItem value="S">S</SelectItem>
                        <SelectItem value="M">M</SelectItem>
                        <SelectItem value="L">L</SelectItem>
                        <SelectItem value="XL">XL</SelectItem>
                        <SelectItem value="Free Size">Free Size</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="beadSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bead Size</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="e.g. 4mm-6mm, XS-L, A-Grade" list="bead-size-options" {...field} />
                    </FormControl>
                    <datalist id="bead-size-options">
                      <option value="4mm" />
                      <option value="6mm" />
                      <option value="8mm" />
                      <option value="10mm" />
                      <option value="4mm-6mm" />
                      <option value="6mm-8mm" />
                      <option value="XS" />
                      <option value="S" />
                      <option value="M" />
                      <option value="L" />
                      <option value="XL" />
                      <option value="XS-L" />
                      <option value="A-Grade" />
                      <option value="AA-Grade" />
                      <option value="AAA-Grade" />
                    </datalist>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="beadCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bead Count</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g. 24" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="innerCircumferenceMm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inner Circumference (mm)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" placeholder="e.g. 160" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="holeSizeMm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hole Size (mm)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" placeholder="e.g. 1.0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}

        <div className="rounded-lg border border-dashed bg-muted/50 overflow-hidden">
          <button
            type="button"
            onClick={() => setIsSkuPreviewOpen(!isSkuPreviewOpen)}
            className="flex w-full items-center justify-between p-4 text-sm font-medium hover:bg-muted/70 transition-colors"
          >
            <span className="text-muted-foreground">SKU Preview</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-primary">{skuPreview}</span>
              {isSkuPreviewOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </button>
          {isSkuPreviewOpen && (
            <div className="px-4 pb-4 text-xs text-muted-foreground">
              The SKU is auto-generated based on Category, Gem Type, Color, and Weight.
            </div>
          )}
        </div>

        <FormField
          control={form.control}
          name="itemName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Item Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Blue Sapphire 2ct"
                  {...field}
                  ref={(el) => {
                    field.ref(el);
                    (itemNameInputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="internalName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Internal Name / Code</FormLabel>
              <FormControl>
                <Input placeholder="Optional internal reference" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.filter((c, i, arr) => arr.findIndex((x) => x.name === c.name) === i).map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name} ({c.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
