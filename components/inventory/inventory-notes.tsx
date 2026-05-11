"use client";

import { useState } from "react";
import { toast } from "sonner";
import { type UseFormReturn } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import { generateFallbackDescription, type FormInputValues } from "./inventory-form.types";

interface NotesSectionProps {
  form: UseFormReturn<FormInputValues>;
}

export function NotesSection({ form }: NotesSectionProps) {
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [additionalProductInfo, setAdditionalProductInfo] = useState("");

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card/50 p-5 space-y-4">
        <h3 className="text-base font-semibold">Notes</h3>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Notes</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5 text-muted-foreground"
                  disabled={isGeneratingDescription}
                  onClick={async () => {
                    const values = form.getValues();
                    setIsGeneratingDescription(true);
                    try {
                      const response = await fetch("/api/ai/inventory-description", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          inventory: values,
                          additionalInfo: additionalProductInfo,
                        }),
                      });
                      if (!response.ok) {
                        throw new Error("AI request failed");
                      }
                      const result = await response.json();
                      const generated = typeof result?.description === "string" ? result.description.trim() : "";
                      // Use values directly without Zod validation for description generation
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const finalDescription = generated || generateFallbackDescription(values as any);
                      form.setValue("notes", finalDescription, { shouldDirty: true });
                      if (result?.warning) {
                        toast.warning(result.warning);
                      } else {
                        toast.success("Product description generated");
                      }
                    } catch (err) {
                      console.error("[Smart Description] Error:", err);
                      // Use values directly without Zod validation for fallback
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const fallback = generateFallbackDescription(values as any);
                      form.setValue("notes", fallback, { shouldDirty: true });
                      toast.warning("AI service unavailable. Added structured fallback description.");
                    } finally {
                      setIsGeneratingDescription(false);
                    }
                  }}
                >
                  {isGeneratingDescription ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {isGeneratingDescription ? "Generating..." : "Generate Smart Description"}
                </Button>
              </div>
              <div className="mb-2">
                <Textarea
                  className="min-h-[80px] text-sm"
                  placeholder="Add Product Information for AI (optional). Example: buyer style, tone, selling focus, special highlights."
                  value={additionalProductInfo}
                  onChange={(e) => setAdditionalProductInfo(e.target.value)}
                />
              </div>
              <FormControl>
                <Textarea className="min-h-[300px] font-mono text-sm" placeholder="Any additional details..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="certificateComments"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Certificate Comments</FormLabel>
              <FormControl>
                <Textarea className="min-h-[120px] font-mono text-sm" placeholder="Optional comments to show on the certificate" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
