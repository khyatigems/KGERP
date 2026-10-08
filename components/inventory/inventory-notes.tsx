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
  skuPreview?: string;
}

export function NotesSection({ form, skuPreview }: NotesSectionProps) {
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isGeneratingEbayDescription, setIsGeneratingEbayDescription] = useState(false);
  const [isGeneratingEtsyDescription, setIsGeneratingEtsyDescription] = useState(false);
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
                          sku: skuPreview || values.sku || "",
                          mediaUrls: values.mediaUrls || [],
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
                      const fallback = generateFallbackDescription(values, skuPreview || values.sku);
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
                  onClick={async () => {
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
                      // Fetch eBay settings with category-specific images
                      const settingsResponse = await fetch("/api/ebay/settings", {
                        method: "GET",
                      });
                      
                      let categoryImages: string[] | undefined;
                      let settings: any = {};
                      
                      if (settingsResponse.ok) {
                        const settingsData = await settingsResponse.json();
                        if (settingsData.success && settingsData.data) {
                          settings = settingsData.data;
                          if (values.category) {
                            const categoryMap = settingsData.data.categoryImageUrls || {};
                            categoryImages = categoryMap[values.category] || settingsData.data.globalBannerImages;
                          }
                        }
                      }
                      
                      // Fetch the next real SKU sequence number (without incrementing)
                      let realSku = values.sku || "";
                      if (skuPreview?.includes("####")) {
                        try {
                          const skuRes = await fetch("/api/sku/next");
                          const skuData = await skuRes.json();
                          const seqStr = String(skuData.nextSequence ?? 1).padStart(5, '0');
                          realSku = skuPreview.replace("####", seqStr);
                        } catch {
                          realSku = skuPreview;
                        }
                      } else if (skuPreview) {
                        realSku = skuPreview;
                      }
                      
                      const html = buildEbayHtmlDescription(
                        {
                          ...ebayFields,
                          sku: realSku,
                          mediaUrls: (values.mediaUrls || []).filter(Boolean),
                          mediaUrl: values.mediaUrl || "",
                        },
                        {
                          categoryImages,
                          settings,
                        }
                      );
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
          name="etsyDescription"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between gap-3">
                <FormLabel>Etsy plain-text description</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 shrink-0 gap-1.5 text-xs text-muted-foreground"
                  disabled={isGeneratingEtsyDescription}
                  onClick={async () => {
                    const values = form.getValues();
                    setIsGeneratingEtsyDescription(true);
                    try {
                      const response = await fetch("/api/ai/etsy-description", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          inventory: {
                            itemName: values.itemName,
                            category: values.category,
                            gemType: values.gemType,
                            color: values.color,
                            shape: values.shape,
                            dimensionsMm: values.dimensionsMm,
                            weightValue: values.weightValue,
                            weightUnit: values.weightUnit,
                            treatment: values.treatment,
                            origin: values.origin,
                            fluorescence: values.fluorescence,
                            transparency: values.transparency,
                            hasCertification: Boolean(
                              (values.certification && values.certification.trim().toLowerCase() !== "none")
                              || values.certificateComments?.trim()
                              || values.certificateCodeIds?.length
                            ),
                            braceletType: values.braceletType,
                            beadSizeMm: values.beadSizeMm,
                            beadCount: values.beadCount,
                            holeSizeMm: values.holeSizeMm,
                            innerCircumferenceMm: values.innerCircumferenceMm,
                            standardSize: values.standardSize,
                          },
                        }),
                      });
                      const result = await response.json();
                      if (!response.ok) throw new Error(result.error || "Unable to generate Etsy description.");
                      if (typeof result.description !== "string" || !result.description.trim()) {
                        throw new Error("Description generation returned empty text.");
                      }
                      form.setValue("etsyDescription", result.description.trim(), { shouldDirty: true });
                      if (result.warning) {
                        toast.warning(`${result.warning} Review the text before saving.`);
                      } else {
                        toast.success("Etsy description generated. Review it before saving.");
                      }
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Unable to generate Etsy description.");
                    } finally {
                      setIsGeneratingEtsyDescription(false);
                    }
                  }}
                >
                  {isGeneratingEtsyDescription ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {isGeneratingEtsyDescription ? "Generating..." : "Generate Etsy description"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Saved separately as plain text on the inventory record. Certificate numbers, lab identifiers, prices, and internal notes are not sent to the description generator.
              </p>
              <FormControl>
                <Textarea className="min-h-48 text-sm" maxLength={5000} placeholder="Generate or write the reusable Etsy description here." {...field} />
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
