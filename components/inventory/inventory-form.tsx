"use client";
 
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/inventory/file-upload";
import { createInventory, updateInventory } from "@/app/(dashboard)/inventory/actions";
import { useState, useEffect } from "react";
import { Loader2, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Sparkles } from "lucide-react";
import type { Inventory, InventoryMedia } from "@prisma/client-custom-v2";

type CodeRow = {
  id: string;
  name: string;
  code: string;
  status: string;
};

type InventoryWithExtras = Inventory & {
  category?: string | null;
  weightRatti?: number | null;
  color?: string | null;
  categoryCodeId?: string | null;
  gemstoneCodeId?: string | null;
  colorCodeId?: string | null;
  cutCodeId?: string | null;
  // Add new fields to type if not in Inventory type yet (depends on if prisma generate ran successfully)
  braceletType?: string | null;
  beadSizeMm?: number | null;
  beadCount?: number | null;
  holeSizeMm?: number | null;
  innerCircumferenceMm?: number | null;
  standardSize?: string | null;
  
  // Relations for fallback
  categoryCode?: { name: string } | null;
  gemstoneCode?: { name: string } | null;
  colorCode?: { name: string } | null;
  cutCode?: { name: string } | null;
  collectionCode?: { name: string } | null;
};

const formSchema = z.object({
  itemName: z.string().min(1, "Item name is required"),
  internalName: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  gemType: z.string().optional(),
  color: z.string().optional(),
  shape: z.string().optional(),
  dimensionsMm: z.string().optional(),
  weightValue: z.coerce.number().min(0, "Weight must be non-negative"),
  weightUnit: z.string().default("cts"),
  weightRatti: z.coerce.number().optional(),
  treatment: z.string().optional(),
  certification: z.string().optional(),
  transparency: z.string().optional(),
  vendorId: z.string().min(1, "Vendor is required"),
  pricingMode: z.enum(["PER_CARAT", "FLAT"]),
  purchaseRatePerCarat: z.coerce.number().optional(),
  sellingRatePerCarat: z.coerce.number().optional(),
  flatPurchaseCost: z.coerce.number().optional(),
  flatSellingPrice: z.coerce.number().optional(),
  notes: z.string().optional(),
  stockLocation: z.string().optional(),
  mediaUrl: z.string().url().optional().or(z.literal("")),
  mediaUrls: z.array(z.string()).optional(),
  
  categoryCodeId: z.string().optional(),
  gemstoneCodeId: z.string().optional(),
  colorCodeId: z.string().optional(),
  collectionCodeId: z.string().optional(),
  rashiCodeIds: z.array(z.string()).optional(),
  cutCodeId: z.string().optional(),
  
  // Bracelet Attributes
  braceletType: z.string().optional(),
  beadSizeMm: z.coerce.number().optional(),
  beadCount: z.coerce.number().int().optional(),
  holeSizeMm: z.coerce.number().optional(),
  innerCircumferenceMm: z.coerce.number().optional(),
  standardSize: z.string().optional(),

  // Legacy/Other
  beadSize: z.string().optional(),
  braceletSize: z.string().optional(),
  // beadCount: z.string().optional(), // Replaced by typed version above if needed, or keep for legacy
  holeSize: z.string().optional(),
  ringSize: z.string().optional(),
  ringAdjustable: z.string().optional(),
  pendantLoop: z.string().optional(),
  figureHeight: z.string().optional(),
  figureWidth: z.string().optional(),
  chipSize: z.string().optional(),
  packingType: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function generateAiDescription(values: FormValues) {
  const {
    itemName,
    weightValue,
    weightUnit,
    gemType,
    color,
    shape,
    transparency,
    treatment,
    certification,
    dimensionsMm,
  } = values;

  const weightStr = `${weightValue} ${weightUnit === "cts" ? "Carats" : weightUnit}`;
  const title = `${itemName} – ${weightStr} 💎`;
  
  return `
${title}

Description:
This exquisite ${gemType || itemName} weighs an impressive ${weightValue} carats and showcases a deep, rich ${color || "hue"} with excellent brilliance. Expertly cut to enhance light performance, this gemstone reflects timeless elegance and enduring value.

${gemType || "This gemstone"} has long been associated with wisdom, prosperity, and royalty. Its bold presence and superior clarity make it an ideal choice for bespoke high-end jewelry or as a serious addition to a gemstone investment portfolio.

${certification ? `Independently lab certified (${certification}), this gemstone guarantees authenticity and quality—ensuring complete peace of mind for discerning buyers.` : "Guaranteed for authenticity and quality—ensuring complete peace of mind for discerning buyers."}

Key Specifications:

Gem Type: ${gemType || "Natural Gemstone"}
Shape: ${shape || "As per selection"}
Weight: ${weightStr}
Dimensions: ${dimensionsMm || "As per entered value"}
Color: ${color || "As per selection"}
Transparency: ${transparency || "As per selection"}
Treatment: ${treatment || "As per entered value"}
Certification: ${certification || "As per entered value"}

Closing Note:
A statement gemstone with undeniable presence—this ${weightStr} ${gemType || itemName} is crafted for collectors, investors, and luxury jewelry connoisseurs who value authenticity and impact. Exclusively offered by Khyati Precious Gems Private Limited.
`.trim();
}

interface InventoryFormProps {
  vendors: { id: string; name: string }[];
  categories: CodeRow[];
  gemstones: CodeRow[];
  colors: CodeRow[];
  collections: CodeRow[];
  rashis: CodeRow[];
  cuts: CodeRow[];
  initialData?: InventoryWithExtras & { media: InventoryMedia[]; rashiCodes?: { id: string }[] };
}

export function InventoryForm({ vendors, categories, gemstones, colors, cuts, collections, rashis, initialData }: InventoryFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);
  const [skuPreview, setSkuPreview] = useState<string>("");
  const [isSkuPreviewOpen, setIsSkuPreviewOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    defaultValues: {
      itemName: initialData?.itemName || "",
      internalName: initialData?.internalName || "",
      category: initialData?.category || initialData?.categoryCode?.name || categories[0]?.name || "",
      gemType: initialData?.gemType || initialData?.gemstoneCode?.name || "",
      color: initialData?.color || initialData?.colorCode?.name || "",
      shape: initialData?.shape || "",
      dimensionsMm: initialData?.dimensionsMm || "",
      weightValue: initialData?.weightValue || 0,
      weightUnit: initialData?.weightUnit || "cts",
      weightRatti: initialData?.weightRatti || 0,
      treatment: initialData?.treatment || "None",
      certification: initialData?.certification || "None",
      transparency: initialData?.transparency || "",
      vendorId: initialData?.vendorId || "",
      pricingMode: (initialData?.pricingMode as "PER_CARAT" | "FLAT") || "PER_CARAT",
      purchaseRatePerCarat: initialData?.purchaseRatePerCarat || 0,
      sellingRatePerCarat: initialData?.sellingRatePerCarat || 0,
      flatPurchaseCost: initialData?.flatPurchaseCost || 0,
      flatSellingPrice: initialData?.flatSellingPrice || 0,
      mediaUrl: initialData?.media?.[0]?.mediaUrl || "",
      mediaUrls: initialData?.media?.map((m: InventoryMedia) => m.mediaUrl) || [],
      notes: initialData?.notes || "",
      stockLocation: initialData?.stockLocation || "",
      collectionCodeId: initialData?.collectionCodeId || "",
      rashiCodeIds: initialData?.rashiCodes?.map((r: { id: string }) => r.id) || [],
      braceletType: initialData?.braceletType || "",
      beadSizeMm: initialData?.beadSizeMm || 0,
      beadCount: initialData?.beadCount || 0,
      holeSizeMm: initialData?.holeSizeMm || 0,
      innerCircumferenceMm: initialData?.innerCircumferenceMm || 0,
      standardSize: initialData?.standardSize || "",
      categoryCodeId:
        initialData?.categoryCodeId ||
        (categories.find((c) => c.name === (initialData?.category || ""))?.id ??
          categories[0]?.id ??
          ""),
      gemstoneCodeId:
        initialData?.gemstoneCodeId ||
        (gemstones.find((g) => g.name === (initialData?.gemType || ""))?.id ??
          ""),
      colorCodeId:
        initialData?.colorCodeId ||
        (colors.find((c) => c.name === (initialData?.color || ""))?.id ??
          ""),
      cutCodeId: initialData?.cutCodeId || "",
    },
  });

  const pricingMode = form.watch("pricingMode");
  const weightValue = form.watch("weightValue");
  const weightUnit = form.watch("weightUnit");
  const categoryName = form.watch("category");
  const gemName = form.watch("gemType");
  const colorName = form.watch("color");

  const selectedCategory = categories.find((c) => c.name === categoryName);
  const selectedGemstone = gemstones.find((g) => g.name === gemName);
  const selectedColor = colors.find((c) => c.name === colorName);

  useEffect(() => {
    const catCode = (selectedCategory?.code || "CAT").replace(/[^A-Z0-9]/g, "");
    const gemCode = (selectedGemstone?.code || "GEM").replace(/[^A-Z0-9]/g, "");
    const colCode = (selectedColor?.code || "XX").replace(/[^A-Z0-9]/g, "");
    const wgt = Number(weightValue || 0).toFixed(2).replace('.', '');
    
    setSkuPreview(`KG${catCode}${gemCode}${colCode}${wgt}####`);
  }, [selectedCategory, selectedGemstone, selectedColor, weightValue]);

  // Auto-calculate Ratti
  // 1 Carat = 1.09 Ratti
  // 1 Gram = 5 Carats = 5.45 Ratti
  const calculatedRatti = (() => {
      const val = Number(weightValue) || 0;
      if (weightUnit === "cts") {
          return Number((val * 1.09).toFixed(2));
      } else if (weightUnit === "gms") {
          return Number((val * 5 * 1.09).toFixed(2));
      }
      return 0;
  })();

  useEffect(() => {
    if (
      selectedCategory &&
      form.getValues("categoryCodeId") !== selectedCategory.id
    ) {
      form.setValue("categoryCodeId", selectedCategory.id);
    }
    if (
      selectedGemstone &&
      form.getValues("gemstoneCodeId") !== selectedGemstone.id
    ) {
      form.setValue("gemstoneCodeId", selectedGemstone.id);
    }
    if (selectedColor && form.getValues("colorCodeId") !== selectedColor.id) {
      form.setValue("colorCodeId", selectedColor.id);
    }
    if (form.getValues("weightRatti") !== calculatedRatti) {
      form.setValue("weightRatti", calculatedRatti);
    }
  }, [selectedCategory, selectedGemstone, selectedColor, calculatedRatti, form]);

  async function onSubmit(data: FormValues) {
    setIsPending(true);
    setSubmitResult(null);
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      // Skip mediaUrls as it's handled explicitly below to avoid double-entry (comma-separated string + individual entries)
      if (key === 'mediaUrls') return;
      
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });
    
    // Ensure mediaUrls are passed
    const mediaUrls = form.getValues("mediaUrls");
    if (mediaUrls && mediaUrls.length > 0) {
      mediaUrls.forEach(url => {
        formData.append("mediaUrls", url);
      });
    }

    try {
        let result;
        if (initialData) {
            result = await updateInventory(initialData.id, null, formData);
        } else {
            result = await createInventory(null, formData);
        }
        
        if (result && (result.message || result.errors)) {
             let errorMsg = result.message || "Validation failed.";
             if (result.errors) {
                const errorEntries = Object.entries(result.errors);
                if (errorEntries.length > 0) {
                    const [field, messages] = errorEntries[0];
                    errorMsg += ` ${field}: ${messages}`;
                }
             }
             setSubmitResult({
                 success: false,
                 message: errorMsg
             });
             if (result.errors) {
                 console.error("Form errors:", result.errors);
             }
        } else {
             setSubmitResult({
                 success: true,
                 message: initialData ? "Inventory updated successfully!" : "Inventory created successfully!"
             });
             // Optional: reset form if create
             if (!initialData) {
                 form.reset();
                 setSkuPreview("");
             }
             // Redirect after short delay
             setTimeout(() => {
                 router.push("/inventory");
             }, 1000);
        }

    } catch (error) {
        console.error(error);
        setSubmitResult({
            success: false,
            message: "An unexpected error occurred."
        });
    } finally {
        setIsPending(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {submitResult && (
            <div className={`p-4 rounded-md flex items-center gap-2 ${submitResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {submitResult.success ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                <span>{submitResult.message}</span>
            </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            
            {/* Bracelet Attributes Section */}
            {(categoryName === "Bracelets" || categoryName === "Bracelet") && (
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
                            name="beadSizeMm"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Bead Size (mm)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.1" placeholder="e.g. 8.5" {...field} />
                                    </FormControl>
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
                    <Input placeholder="e.g. Blue Sapphire 2ct" {...field} />
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
                      {categories.map((c) => (
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="gemType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gem Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                    <SelectContent>
                      {gemstones.map((g) => (
                        <SelectItem key={g.id} value={g.name}>
                          {g.name} ({g.code})
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
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select color" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {colors.map((c) => (
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

              <FormField
                control={form.control}
                name="shape"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shape</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select shape" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Round">Round</SelectItem>
                        <SelectItem value="Oval">Oval</SelectItem>
                        <SelectItem value="Cushion">Cushion</SelectItem>
                        <SelectItem value="Emerald">Emerald</SelectItem>
                        <SelectItem value="Pear">Pear</SelectItem>
                        <SelectItem value="Marquise">Marquise</SelectItem>
                        <SelectItem value="Heart">Heart</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cutCodeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cut</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select cut" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cuts.map((c) => (
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

              <FormField
                control={form.control}
                name="transparency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transparency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select transparency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Transparent">Transparent</SelectItem>
                        <SelectItem value="Translucent">Translucent</SelectItem>
                        <SelectItem value="Opaque">Opaque</SelectItem>
                        <SelectItem value="Semi-Transparent">Semi-Transparent</SelectItem>
                        <SelectItem value="Semi-Translucent">Semi-Translucent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="treatment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Treatment</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Heat Treated" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="certification"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Certification</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. GIA" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                        render={({ field }) => {
                          return (
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
                                          field.value?.filter(
                                            (value) => value !== item.id
                                          )
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                {item.name}
                              </FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            {/* Category Specific Fields */}
            {/* Bracelet legacy section removed in favor of new standardized section above */}

            {categoryName === "Beads" && (
                 <div className="p-4 bg-muted/30 rounded-lg border space-y-4 col-span-1 md:col-span-2">
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
                <div className="p-4 bg-muted/30 rounded-lg border space-y-4 col-span-1 md:col-span-2">
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
                <div className="p-4 bg-muted/30 rounded-lg border space-y-4 col-span-1 md:col-span-2">
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
                <div className="p-4 bg-muted/30 rounded-lg border space-y-4 col-span-1 md:col-span-2">
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
                <div className="p-4 bg-muted/30 rounded-lg border space-y-4 col-span-1 md:col-span-2">
                    <h4 className="font-medium text-sm">Chip Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="chipSize"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Chip Size</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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

          {/* Pricing & Vendor */}
          <div className="space-y-4">
             <h3 className="text-lg font-medium">Pricing & Source</h3>

             <FormField
                control={form.control}
                name="vendorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      defaultValue={field.value}
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

            <FormField
              control={form.control}
              name="mediaUrls"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Images & Videos</FormLabel>
                  <FormControl>
                    <FileUpload
                      onUploadComplete={(results) => {
                         const urls = results.map(r => r.url).filter(Boolean) as string[];
                         field.onChange(urls);
                         // Also update single mediaUrl for fallback/legacy if needed
                         if (urls.length > 0) {
                             form.setValue("mediaUrl", urls[0]);
                         }
                      }}
                      defaultFiles={field.value || []}
                      sku={skuPreview}
                      category={categoryName}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      className="h-7 text-xs gap-1.5 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                      onClick={() => {
                        const values = form.getValues();
                        const desc = generateAiDescription(values);
                        form.setValue("notes", desc, { shouldDirty: true });
                      }}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Generate AI Description
                    </Button>
                  </div>
                  <FormControl>
                    <Textarea className="min-h-[300px] font-mono text-sm" placeholder="Any additional details..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Button type="submit" disabled={isPending} className="transition-all duration-200 hover:scale-105 active:scale-95">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "Update Inventory Item" : "Create Inventory Item"}
        </Button>
      </form>
    </Form>
  );
}
