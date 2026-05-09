"use client";

import { useEffect } from "react";
import { type UseFormReturn } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FormInputValues } from "./inventory-form.types";

interface MeasurementsSectionProps {
  form: UseFormReturn<FormInputValues>;
  categoryName: string;
}

export function MeasurementsSection({ form, categoryName }: MeasurementsSectionProps) {
  const weightValue = form.watch("weightValue");
  const weightUnit = form.watch("weightUnit");

  const calculatedRatti = (() => {
    const val = Number(weightValue) || 0;
    if (weightUnit === "cts") return Number((val * 1.09).toFixed(2));
    else if (weightUnit === "gms") return Number((val * 5 * 1.09).toFixed(2));
    return 0;
  })();

  useEffect(() => {
    if (form.getValues("weightRatti") !== calculatedRatti) {
      form.setValue("weightRatti", calculatedRatti);
    }
  }, [calculatedRatti, form]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card/50 p-5 space-y-4">
        <h3 className="text-base font-semibold">Measurements</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="weightValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Weight</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="weightUnit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Unit" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="cts">Carats (cts)</SelectItem>
                    <SelectItem value="gms">Grams (gms)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="weightRatti"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Weight (Ratti)</FormLabel>
                <FormControl>
                  <Input {...field} readOnly className="bg-muted" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="dimensionsMm"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dimensions (mm)</FormLabel>
              <FormControl>
                <Input placeholder="e.g. 8.5 x 6.2 x 4.1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {categoryName === "Beads" && (
          <div className="p-4 bg-muted/30 rounded-lg border space-y-4">
            <h4 className="font-medium text-sm">Bead Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="beadSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bead Size (mm)</FormLabel>
                    <FormControl><Input placeholder="e.g. 8mm" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="beadCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Count / String Length</FormLabel>
                    <FormControl><Input placeholder="e.g. 108 beads or 15 inches" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="holeSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hole Size (Optional)</FormLabel>
                    <FormControl><Input placeholder="e.g. 1mm" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}

        {categoryName === "Ring" && (
          <div className="p-4 bg-muted/30 rounded-lg border space-y-4">
            <h4 className="font-medium text-sm">Ring Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ringSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ring Size</FormLabel>
                    <FormControl><Input placeholder="US 7 or Ind 14" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ringAdjustable"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adjustable?</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}

        {categoryName === "Pendant" && (
          <div className="p-4 bg-muted/30 rounded-lg border space-y-4">
            <h4 className="font-medium text-sm">Pendant Details</h4>
            <FormField
              control={form.control}
              name="pendantLoop"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Loop / Bail Included?</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {categoryName === "Figure / Idol" && (
          <div className="p-4 bg-muted/30 rounded-lg border space-y-4">
            <h4 className="font-medium text-sm">Figure Dimensions</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="figureHeight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Height (mm)</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="figureWidth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Width (mm)</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}

        {categoryName === "Chips" && (
          <div className="p-4 bg-muted/30 rounded-lg border space-y-4">
            <h4 className="font-medium text-sm">Chip Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="chipSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chip Size</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Small">Small</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Large">Large</SelectItem>
                        <SelectItem value="Mixed">Mixed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="packingType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Packing Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Packet">Packet</SelectItem>
                        <SelectItem value="String">String</SelectItem>
                        <SelectItem value="Loose">Loose</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
