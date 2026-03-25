"use client";
 
import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";
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
import { useRouter } from "next/navigation";
import { createCode } from "@/app/(dashboard)/settings/codes/actions";
import { Loader2, ChevronDown, ChevronUp, Sparkles, Plus, X, Check } from "lucide-react";
import type { Inventory, InventoryMedia } from "@prisma/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type CodeRow = {
  id: string;
  name: string;
  code: string;
  status: string;
  remarks?: string | null;
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
  beadSizeLabel?: string | null;
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
  certificates?: { id: string }[];
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
  origin: z.string().optional(),
  fluorescence: z.string().optional(),
  certification: z.string().optional(),
  certificateCodeIds: z.array(z.string()).optional(),
  transparency: z.string().optional(),
  vendorId: z.string().min(1, "Vendor is required"),
  pricingMode: z.enum(["PER_CARAT", "FLAT"]),
  purchaseRatePerCarat: z.coerce.number().optional(),
  sellingRatePerCarat: z.coerce.number().optional(),
  flatPurchaseCost: z.coerce.number().optional(),
  flatSellingPrice: z.coerce.number().optional(),
  notes: z.string().optional(),
  certificateComments: z.string().optional(),
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
  beadSize: z.string().max(32).optional().transform(v => (v || "").trim() || undefined),
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
}).superRefine((values, ctx) => {
  if (values.pricingMode === "PER_CARAT") {
    if (!values.purchaseRatePerCarat || values.purchaseRatePerCarat <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["purchaseRatePerCarat"], message: "Purchase rate per carat is required" });
    }
    if (!values.sellingRatePerCarat || values.sellingRatePerCarat <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["sellingRatePerCarat"], message: "Selling rate per carat is required" });
    }
  } else {
    if (!values.flatPurchaseCost || values.flatPurchaseCost <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["flatPurchaseCost"], message: "Flat purchase cost is required" });
    }
    if (!values.flatSellingPrice || values.flatSellingPrice <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["flatSellingPrice"], message: "Flat selling price is required" });
    }
  }
});

type FormValues = z.infer<typeof formSchema>;

const ORIGIN_PRESETS = ["Burma (Myanmar)", "Sri Lanka (Ceylon)", "Kashmir", "Madagascar", "Mozambique", "Thailand", "Colombia", "Zambia"];
const FLUORESCENCE_PRESETS = ["None", "Faint", "Medium", "Strong", "Very Strong"];
const TREATMENT_PRESETS = ["None", "Untreated", "Heat", "Oil", "Resin", "Irradiation", "Diffusion", "Glass-Filled"];

function generateFallbackDescription(values: FormValues) {
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
  certificates?: CodeRow[];
  initialData?: InventoryWithExtras & { media: InventoryMedia[]; rashiCodes?: { id: string }[] };
}

export function InventoryForm({ vendors, categories, gemstones, colors, cuts, collections, rashis, certificates = [], initialData }: InventoryFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [additionalProductInfo, setAdditionalProductInfo] = useState("");
  const [skuPreview, setSkuPreview] = useState<string>("");
  const [isSkuPreviewOpen, setIsSkuPreviewOpen] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    message: string;
    errors: Record<string, string[]>;
  } | null>(null);

  const [useCustomOrigin, setUseCustomOrigin] = useState(false);
  const [useCustomTreatment, setUseCustomTreatment] = useState(false);
  const [useCustomFluorescence, setUseCustomFluorescence] = useState(false);


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
      certificateCodeIds: initialData?.certificates?.map(c => c.id) || [],
      transparency: initialData?.transparency || "",
      origin: initialData?.origin || "",
      fluorescence: initialData?.fluorescence || "",
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
      beadSizeMm: initialData?.beadSizeMm ?? undefined,
      beadSize: initialData?.beadSizeLabel || (initialData?.beadSizeMm ? `${initialData.beadSizeMm}mm` : ""),
      beadCount: initialData?.beadCount ?? undefined,
      holeSizeMm: initialData?.holeSizeMm ?? undefined,
      innerCircumferenceMm: initialData?.innerCircumferenceMm ?? undefined,
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

  // Color Picker State
  const [colorsList, setColorsList] = useState(colors);
  const [isAddingColor, setIsAddingColor] = useState(false);
  const [newColorName, setNewColorName] = useState("");
  const [newColorCode, setNewColorCode] = useState("");
  const [isCreatingColor, setIsCreatingColor] = useState(false);
  const [shouldRedirectAfterSave, setShouldRedirectAfterSave] = useState(true);
  const [fileUploadResetKey, setFileUploadResetKey] = useState(0);
  const [createdInfo, setCreatedInfo] = useState<{
    inventoryId: string;
    sku: string;
    itemName: string;
    quantityAdded: number;
    totalStock: number;
  } | null>(null);
  const [createdDialogOpen, setCreatedDialogOpen] = useState(false);
  const [createdRedirectPending, setCreatedRedirectPending] = useState(false);

  useEffect(() => {
    if (!initialData) return;
    const origin = String(initialData.origin || "").trim();
    const fluorescence = String(initialData.fluorescence || "").trim();
    const treatment = String(initialData.treatment || "").trim();
    if (origin && !ORIGIN_PRESETS.includes(origin)) setUseCustomOrigin(true);
    if (fluorescence && !FLUORESCENCE_PRESETS.includes(fluorescence)) setUseCustomFluorescence(true);
    if (treatment && !TREATMENT_PRESETS.includes(treatment)) setUseCustomTreatment(true);
  }, [initialData]);

  type CreatedInventoryResult = {
    inventoryId: string;
    sku: string;
    itemName: string;
    quantityAdded: number;
    totalStock: number;
  };

  const isCreatedInventoryResult = (value: unknown): value is CreatedInventoryResult => {
    if (!value || typeof value !== "object") return false;
    const v = value as Record<string, unknown>;
    return (
      typeof v.inventoryId === "string" &&
      typeof v.sku === "string" &&
      typeof v.itemName === "string" &&
      typeof v.quantityAdded === "number" &&
      typeof v.totalStock === "number"
    );
  };

  const handleCreateColor = async () => {
      if (!newColorName || !newColorCode) return;

      setIsCreatingColor(true);
      const formData = new FormData();
      formData.append("name", newColorName);
      formData.append("code", newColorCode);
      formData.append("status", "ACTIVE");

      try {
          const res = await createCode("colors", formData);
          if (res.error) {
              toast.error(res.error);
          } else if (res.data) {
              toast.success("Color added successfully");
              setColorsList(prev => [...prev, { ...res.data, code: res.data.code || "", status: "ACTIVE", createdAt: new Date(), updatedAt: new Date() }].sort((a, b) => a.name.localeCompare(b.name)));
              form.setValue("color", res.data.name);
              form.setValue("colorCodeId", res.data.id);
              setIsAddingColor(false);
              setNewColorName("");
              setNewColorCode("");
          }
      } catch (error) {
          console.error(error);
          toast.error("Failed to create color");
      } finally {
          setIsCreatingColor(false);
      }
  };

  const pricingMode = form.watch("pricingMode");
  const weightValue = form.watch("weightValue");
  const weightUnit = form.watch("weightUnit");
  const categoryName = form.watch("category");
  const gemName = form.watch("gemType");
  const colorName = form.watch("color");
  const beadSize = form.watch("beadSize");

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

  useEffect(() => {
    const v = (beadSize || "").trim();
    if (!v) {
      form.setValue("beadSizeMm", undefined);
      return;
    }
    const m = v.match(/^(\d+(?:\.\d+)?)\s*mm?$/i);
    if (!m) return;
    const n = Number(m[1]);
    if (Number.isFinite(n)) {
      form.setValue("beadSizeMm", n);
    }
  }, [beadSize, form]);

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

  async function submitInventory(data: FormValues, ignoreDuplicates = false, shouldRedirect = true) {
    setIsPending(true);
    setDuplicateWarning(null); // Clear previous warnings
    
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

    if (ignoreDuplicates) {
      formData.append("ignoreDuplicates", "true");
    }

    try {
        let result;
        if (initialData) {
            result = await updateInventory(initialData.id, null, formData);
        } else {
            result = await createInventory(null, formData);
        }
        
        if (result?.success) {
             const msg = result.message || (initialData ? "Inventory updated successfully!" : "Inventory created & added to label cart!");
             toast.success(msg);

             const created = !initialData && isCreatedInventoryResult(result) ? result : null;
             
             // Save & Add New: keep on page and show details dialog (optional)
             if (!shouldRedirect && created) {
               setCreatedInfo(created);
               setCreatedDialogOpen(true);
               setCreatedRedirectPending(false);
             }
             
             if (!initialData && !shouldRedirect) {
                 const preserved = form.getValues();
                 form.reset({
                   itemName: "",
                   internalName: "",
                   category: preserved.category,
                   gemType: preserved.gemType,
                   color: preserved.color,
                   shape: preserved.shape,
                   dimensionsMm: "",
                   weightValue: 0,
                   weightUnit: preserved.weightUnit,
                   weightRatti: 0,
                   treatment: preserved.treatment,
                   origin: preserved.origin,
                   fluorescence: preserved.fluorescence,
                   certification: preserved.certification,
                   certificateCodeIds: preserved.certificateCodeIds,
                   transparency: preserved.transparency,
                   vendorId: preserved.vendorId,
                   pricingMode: preserved.pricingMode,
                   purchaseRatePerCarat: preserved.purchaseRatePerCarat,
                   sellingRatePerCarat: preserved.sellingRatePerCarat,
                   flatPurchaseCost: preserved.flatPurchaseCost,
                   flatSellingPrice: preserved.flatSellingPrice,
                   notes: "",
                   certificateComments: "",
                   stockLocation: preserved.stockLocation,
                   mediaUrl: "",
                   mediaUrls: [],
                   categoryCodeId: preserved.categoryCodeId,
                   gemstoneCodeId: preserved.gemstoneCodeId,
                   colorCodeId: preserved.colorCodeId,
                   collectionCodeId: preserved.collectionCodeId,
                   rashiCodeIds: preserved.rashiCodeIds,
                   cutCodeId: preserved.cutCodeId,
                   braceletType: preserved.braceletType,
                   beadSizeMm: preserved.beadSizeMm,
                   beadCount: preserved.beadCount,
                   holeSizeMm: preserved.holeSizeMm,
                   innerCircumferenceMm: preserved.innerCircumferenceMm,
                   standardSize: preserved.standardSize,
                   beadSize: preserved.beadSize,
                   braceletSize: preserved.braceletSize,
                   holeSize: preserved.holeSize,
                   ringSize: preserved.ringSize,
                   ringAdjustable: preserved.ringAdjustable,
                   pendantLoop: preserved.pendantLoop,
                   figureHeight: preserved.figureHeight,
                   figureWidth: preserved.figureWidth,
                   chipSize: preserved.chipSize,
                   packingType: preserved.packingType,
                 });
                 setSkuPreview("");
                 setFileUploadResetKey(prev => prev + 1);
             }
             
             if (shouldRedirect) {
                 // Immediately go back to inventory list after successful save
                 try {
                   if (created) {
                     localStorage.setItem("inventory-last-saved", JSON.stringify({
                       sku: created.sku,
                       itemName: created.itemName
                     }));
                   }
                 } catch {
                 }
                 router.push("/inventory");
                 return;
             } else {
                 window.scrollTo({ top: 0, behavior: 'smooth' });
             }
        } else if (result && (result.message || result.errors)) {
             // Check for duplicate warning
             // eslint-disable-next-line @typescript-eslint/no-explicit-any
             if ((result as any).isDuplicateWarning) {
               setDuplicateWarning({
                 message: result.message || "Potential duplicate detected",
                 // eslint-disable-next-line @typescript-eslint/no-explicit-any
                 errors: (result.errors as any) || {}
               });
               setIsPending(false); // Stop loading to show dialog
               return; 
             }

             let errorMsg = result.message || "Validation failed.";
             if (result.errors) {
                const errorEntries = Object.entries(result.errors);
                if (errorEntries.length > 0) {
                    const [field, messages] = errorEntries[0];
                    errorMsg += ` ${field}: ${messages}`;
                }
             }
             toast.error(errorMsg);
             if (result.errors) {
                 console.error("Form errors:", result.errors);
             }
        }

    } catch (error) {
        console.error(error);
        toast.error("An unexpected error occurred.");
    } finally {
        // Only set pending false if we didn't trigger the warning dialog (which needs user interaction)
        // But we actually do want to stop pending state so user can click buttons in dialog.
        // Wait, if I set pending false, the main form buttons re-enable. That's fine.
        setIsPending(false);
    }
  }

  async function onSubmit(data: FormValues) {
        setShouldRedirectAfterSave(true);
        await submitInventory(data, false, true);
    }

    async function onSaveAndAddNew(data: FormValues) {
        setShouldRedirectAfterSave(false);
        await submitInventory(data, false, false);
    }

  const handleSaveAnyway = async () => {
    const data = form.getValues();
    await submitInventory(data, true, shouldRedirectAfterSave);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                  <FormLabel className="flex items-center justify-between">
                    Color
                    <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 px-2 text-xs text-muted-foreground hover:text-primary"
                        onClick={() => setIsAddingColor(!isAddingColor)}
                    >
                        {isAddingColor ? <X className="w-3 h-3 mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                        {isAddingColor ? "Cancel" : "Add Color"}
                    </Button>
                  </FormLabel>
                  {isAddingColor && (
                      <div className="mb-2 p-3 border rounded-md bg-muted/30 space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                  <label className="text-xs font-medium">Name</label>
                                  <Input 
                                      value={newColorName}
                                      onChange={(e) => {
                                          const val = e.target.value;
                                          setNewColorName(val);
                                          if (!newColorCode && val) {
                                              setNewColorCode(val.slice(0, 4).toUpperCase());
                                          }
                                      }}
                                      placeholder="e.g. Sky Blue"
                                      className="h-8 text-xs"
                                  />
                              </div>
                              <div className="space-y-1">
                                  <label className="text-xs font-medium">Code</label>
                                  <Input 
                                      value={newColorCode}
                                      onChange={(e) => setNewColorCode(e.target.value.toUpperCase().slice(0, 6))}
                                      placeholder="e.g. SKY"
                                      className="h-8 text-xs"
                                  />
                              </div>
                          </div>
                          <Button 
                              type="button" 
                              size="sm" 
                              className="w-full h-7 text-xs"
                              onClick={handleCreateColor}
                              disabled={!newColorName || !newColorCode || isCreatingColor}
                          >
                              {isCreatingColor ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
                              Save New Color
                          </Button>
                      </div>
                  )}
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select color" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {colorsList.map((c) => (
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
                    <div className="flex items-center justify-between">
                      <FormLabel>Treatment</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1.5"
                        onClick={() => setUseCustomTreatment((v) => !v)}
                      >
                        {useCustomTreatment ? "Use Preset" : "Custom"}
                      </Button>
                    </div>
                    <FormControl>
                      {useCustomTreatment ? (
                        <Input placeholder="e.g. Heat Treated" {...field} />
                      ) : (
                        <Select
                          onValueChange={(val) => field.onChange(val)}
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select treatment" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="None">None</SelectItem>
                            <SelectItem value="Untreated">Untreated</SelectItem>
                            <SelectItem value="Heat">Heat</SelectItem>
                            <SelectItem value="Oil">Oil</SelectItem>
                            <SelectItem value="Resin">Resin</SelectItem>
                            <SelectItem value="Irradiation">Irradiation</SelectItem>
                            <SelectItem value="Diffusion">Diffusion</SelectItem>
                            <SelectItem value="Glass-Filled">Glass-Filled</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="origin"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Origin</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1.5"
                        onClick={() => setUseCustomOrigin((v) => !v)}
                      >
                        {useCustomOrigin ? "Use Preset" : "Custom"}
                      </Button>
                    </div>
                    <FormControl>
                      {useCustomOrigin ? (
                        <Input placeholder="e.g. Burma, Ceylon" {...field} />
                      ) : (
                        <Select
                          onValueChange={(val) => field.onChange(val)}
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select origin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Burma (Myanmar)">Burma (Myanmar)</SelectItem>
                            <SelectItem value="Sri Lanka (Ceylon)">Sri Lanka (Ceylon)</SelectItem>
                            <SelectItem value="Kashmir">Kashmir</SelectItem>
                            <SelectItem value="Madagascar">Madagascar</SelectItem>
                            <SelectItem value="Mozambique">Mozambique</SelectItem>
                            <SelectItem value="Thailand">Thailand</SelectItem>
                            <SelectItem value="Colombia">Colombia</SelectItem>
                            <SelectItem value="Zambia">Zambia</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="fluorescence"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Fluorescence</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1.5"
                        onClick={() => setUseCustomFluorescence((v) => !v)}
                      >
                        {useCustomFluorescence ? "Use Preset" : "Custom"}
                      </Button>
                    </div>
                    <FormControl>
                      {useCustomFluorescence ? (
                        <Input placeholder="e.g. None, Faint" {...field} />
                      ) : (
                        <Select
                          onValueChange={(val) => field.onChange(val)}
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select fluorescence" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="None">None</SelectItem>
                            <SelectItem value="Faint">Faint</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="Strong">Strong</SelectItem>
                            <SelectItem value="Very Strong">Very Strong</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="certificateCodeIds"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Certificates</FormLabel>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {certificates.map((item) => (
                        <FormField
                          key={item.id}
                          control={form.control}
                          name="certificateCodeIds"
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
                                  {item.name} {item.remarks && <span className="text-muted-foreground text-xs">({item.remarks})</span>}
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
                      key={fileUploadResetKey}
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
                              additionalInfo: additionalProductInfo
                            })
                          });
                          if (!response.ok) {
                            throw new Error("AI request failed");
                          }
                          const result = await response.json();
                          const generated = typeof result?.description === "string" ? result.description.trim() : "";
                          const finalDescription = generated || generateFallbackDescription(values);
                          form.setValue("notes", finalDescription, { shouldDirty: true });
                          if (result?.warning) {
                            toast.warning(result.warning);
                          } else {
                            toast.success("Product description generated");
                          }
                        } catch {
                          const fallback = generateFallbackDescription(values);
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

        <div className="flex gap-4">
            <Button type="submit" disabled={isPending} className="transition-all duration-200 hover:scale-105 active:scale-95 flex-1">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {initialData ? "Update Inventory Item" : "Create Inventory Item"}
            </Button>

            {!initialData && (
                <Button 
                    type="button" 
                    variant="secondary"
                    disabled={isPending} 
                    onClick={form.handleSubmit(onSaveAndAddNew)}
                    className="transition-all duration-200 hover:scale-105 active:scale-95 flex-1"
                >
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save & Add New
                </Button>
            )}
        </div>
      </form>

      <AlertDialog
        open={createdDialogOpen}
        onOpenChange={(open) => {
          setCreatedDialogOpen(open);
          if (!open) {
            const shouldGo = createdRedirectPending;
            setCreatedRedirectPending(false);
            if (shouldGo) router.push("/inventory");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stock Added Successfully</AlertDialogTitle>
            <AlertDialogDescription>
              {createdInfo ? (
                <div className="space-y-3 pt-2">
                  <div className="rounded-md border bg-muted/40 p-3">
                    <div className="text-xs text-muted-foreground">SKU</div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-mono text-sm font-semibold">{createdInfo.sku || "-"}</div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const sku = createdInfo.sku || "";
                          if (!sku) return;
                          try {
                            await navigator.clipboard.writeText(sku);
                            toast.success("SKU copied");
                          } catch {
                            toast.error("Failed to copy SKU");
                          }
                        }}
                      >
                        Copy SKU
                      </Button>
                    </div>
                    <div className="mt-2 text-sm">{createdInfo.itemName || "-"}</div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                      <div>Quantity Added: <span className="font-semibold">{createdInfo.quantityAdded}</span></div>
                      <div>Total Stock: <span className="font-semibold">{createdInfo.totalStock}</span></div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 md:flex-row">
                    <Button type="button" variant="secondary" onClick={() => router.push(`/inventory/${createdInfo.inventoryId}`)}>
                      View Item
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => router.push(`/inventory/${createdInfo.inventoryId}/edit`)}>
                      Edit Item
                    </Button>
                  </div>
                </div>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCreatedDialogOpen(false)}>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!duplicateWarning} onOpenChange={(open) => !open && setDuplicateWarning(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
               <span className="text-xl">⚠️</span> {duplicateWarning?.message}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2">
              <p>The system detected a potential duplicate item:</p>
              <div className="bg-red-50 p-3 rounded-md text-red-700 text-sm font-medium border border-red-200">
                 {Object.values(duplicateWarning?.errors || {}).flat().map((e, i) => (
                   <div key={i}>{e}</div>
                 ))}
              </div>
              <p>How would you like to proceed?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDuplicateWarning(null)}>
               Edit Details
            </AlertDialogCancel>
            <AlertDialogAction 
               onClick={handleSaveAnyway}
               className="bg-red-600 hover:bg-red-700 text-white"
            >
               Save Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
}
