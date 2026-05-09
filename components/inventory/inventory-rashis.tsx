"use client";

import { type UseFormReturn } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import type { CodeRow, FormInputValues } from "./inventory-form.types";

interface RashisSectionProps {
  form: UseFormReturn<FormInputValues>;
  rashis: CodeRow[];
}

export function RashisSection({ form, rashis }: RashisSectionProps) {
  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="rashiCodeIds"
        render={() => (
          <FormItem>
            <div className="mb-4">
              <FormLabel className="text-base">Rashis</FormLabel>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {rashis.map((item) => (
                <FormField
                  key={item.id}
                  control={form.control}
                  name="rashiCodeIds"
                  render={({ field }) => (
                    <FormItem
                      key={item.id}
                      className="flex flex-row items-start space-x-3 space-y-0"
                    >
                      <FormControl>
                        <Checkbox
                          checked={field.value?.includes(item.id)}
                          onCheckedChange={(checked) => {
                            return checked
                              ? field.onChange([...(field.value || []), item.id])
                              : field.onChange(
                                  field.value?.filter((value) => value !== item.id)
                                );
                          }}
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">
                        {item.name}
                      </FormLabel>
                    </FormItem>
                  )}
                />
              ))}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
