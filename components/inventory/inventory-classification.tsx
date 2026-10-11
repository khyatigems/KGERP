"use client";

import { type UseFormReturn } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CodeRow, FormInputValues } from "./inventory-form.types";

interface ClassificationSectionProps {
  form: UseFormReturn<FormInputValues>;
  certificates: CodeRow[];
  collections: CodeRow[];
}

export function ClassificationSection({ form, collections }: ClassificationSectionProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card/50 p-5 space-y-4">
        <h3 className="text-base font-semibold">Classification</h3>

        <FormField
          control={form.control}
          name="collectionCodeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Collection</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select collection" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {collections.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
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
