"use client";

import { useState } from "react";
import { toast } from "sonner";
import { type UseFormReturn } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, FileText } from "lucide-react";
import { buildEbayHtmlDescription } from "@/lib/ebay-description";
import { generateFallbackDescription, type FormInputValues } from "./inventory-form.types";

interface NotesSectionProps {
  form: UseFormReturn<FormInputValues>;
}

export function NotesSection({ form }: NotesSectionProps) {
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isGeneratingEbayDescription, setIsGeneratingEbayDescription] = useState(false);
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
                        throw new Error(`API error (${response.status})`);
                      }
                      const result = await response.json();
                      const description = typeof result?.description === "string" ? result.description.trim() : "";
                      if (description) {
                        form.setValue("notes", description, { shouldDirty: true });
                      }
                      if (result?.warning) {
                        toast.warning(result.warning);
                      } else if (description) {
                        toast.success("Product description generated");
                      } else {
                        throw new Error("Empty description");
                      }
                    } catch (err) {
                      console.error("[Smart Description] Error:", err);
                      const fallback = generateFallbackDescription(values);
                      form.setValue("notes", fallback, { shouldDirty: true });
                      toast.success("Product description generated from your inventory data.");
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
                  className="min-h-20 text-sm"
                  placeholder="Add Product Information for AI (optional). Example: buyer style, tone, selling focus, special highlights."
                  value={additionalProductInfo}
                  onChange={(e) => setAdditionalProductInfo(e.target.value)}
                />
              </div>
              <FormControl>
                <Textarea className="min-h-75 font-mono text-sm" placeholder="Any additional details..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>eBay HTML Description</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5 text-muted-foreground"
                  disabled={isGeneratingEbayDescription}
                  onClick={() => {
                    const values = form.getValues();
                    const ebayFields = {
                      ...values,
                      beadSizeMm:
                        values.beadSizeMm === undefined || values.beadSizeMm === ""
                          ? null
                          : Number(values.beadSizeMm),
                      beadCount:
                        values.beadCount === undefined || values.beadCount === ""
                          ? null
                          : Number(values.beadCount),
                      holeSizeMm:
                        values.holeSizeMm === undefined || values.holeSizeMm === ""
                          ? null
                          : Number(values.holeSizeMm),
                      innerCircumferenceMm:
                        values.innerCircumferenceMm === undefined || values.innerCircumferenceMm === ""
                          ? null
                          : Number(values.innerCircumferenceMm),
                    };
                    setIsGeneratingEbayDescription(true);
                    try {
                      const html = buildEbayHtmlDescription(ebayFields);
                      form.setValue("description", html, { shouldDirty: true });
                      toast.success("eBay HTML description generated");
                    } catch (error) {
                      console.error("[eBay HTML Description] Error:", error);
                      toast.error("Failed to generate eBay HTML description");
                    } finally {
                      setIsGeneratingEbayDescription(false);
                    }
                  }}
                >
                  {isGeneratingEbayDescription ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                  {isGeneratingEbayDescription ? "Generating..." : "Generate eBay HTML Description"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This HTML description is used for eBay export and can be customized for copy-paste uploads.
              </p>
              <FormControl>
                <Textarea className="min-h-96 font-mono text-sm" placeholder="Paste or generate HTML description for eBay" {...field} />
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
                <Textarea className="min-h-30 font-mono text-sm" placeholder="Optional comments to show on the certificate" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
