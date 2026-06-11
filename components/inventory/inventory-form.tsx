"use client";

import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormControl,
} from "@/components/ui/form";
import { createInventory, updateInventory } from "@/app/(dashboard)/inventory/actions";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { InventoryMedia } from "@prisma/client";
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
import { formSchema, type FormInputValues, type FormValues, type InventoryFormProps } from "./inventory-form.types";
import { BasicInfoSection } from "./inventory-basic-info";

const FileUpload = dynamic(
  () => import("@/components/inventory/file-upload").then((mod) => mod.FileUpload),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Loading media uploader...
      </div>
    ),
  }
);

const GemDetailsSection = dynamic(() => import("./inventory-gem-details").then((m) => m.GemDetailsSection), {
  loading: () => <div className="rounded-lg border bg-card/50 p-5 space-y-4 animate-pulse"><div className="h-6 w-24 bg-muted rounded" /><div className="h-20 bg-muted rounded" /></div>,
});

const ClassificationSection = dynamic(() => import("./inventory-classification").then((m) => m.ClassificationSection), {
  loading: () => <div className="rounded-lg border bg-card/50 p-5 space-y-4 animate-pulse"><div className="h-6 w-28 bg-muted rounded" /><div className="h-16 bg-muted rounded" /></div>,
});

const RashisSection = dynamic(() => import("./inventory-rashis").then((m) => m.RashisSection), {
  loading: () => <div className="rounded-lg border bg-card/50 p-5 space-y-4 animate-pulse"><div className="h-6 w-20 bg-muted rounded" /><div className="h-16 bg-muted rounded" /></div>,
});

const MeasurementsSection = dynamic(() => import("./inventory-measurements").then((m) => m.MeasurementsSection), {
  loading: () => <div className="rounded-lg border bg-card/50 p-5 space-y-4 animate-pulse"><div className="h-6 w-28 bg-muted rounded" /><div className="h-24 bg-muted rounded" /></div>,
});

const PricingSection = dynamic(() => import("./inventory-pricing").then((m) => m.PricingSection), {
  loading: () => <div className="rounded-lg border bg-card/50 p-5 space-y-4 animate-pulse"><div className="h-6 w-28 bg-muted rounded" /><div className="h-20 bg-muted rounded" /></div>,
});

const NotesSection = dynamic(() => import("./inventory-notes").then((m) => m.NotesSection), {
  loading: () => <div className="rounded-lg border bg-card/50 p-5 space-y-4 animate-pulse"><div className="h-6 w-16 bg-muted rounded" /><div className="h-40 bg-muted rounded" /></div>,
});

export function InventoryForm({ vendors, categories, gemstones, colors, cuts, collections, rashis, certificates = [], origins = [], initialData }: InventoryFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [skuPreview, setSkuPreview] = useState<string>("");
  const [isSkuPreviewOpen, setIsSkuPreviewOpen] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    message: string;
    errors: Record<string, string[]>;
  } | null>(null);
  const [shouldRedirectAfterSave, setShouldRedirectAfterSave] = useState(true);
  const [fileUploadResetKey, setFileUploadResetKey] = useState(0);
  const [formResetKey, setFormResetKey] = useState(0);
  const itemNameInputRef = useRef<HTMLInputElement | null>(null);
  const createDefaultsRef = useRef<FormValues | null>(null);

  const form = useForm<FormInputValues>({
    resolver: zodResolver(formSchema) as unknown as Resolver<FormInputValues>,
    defaultValues: {
      sku: initialData?.sku || "",
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
      pricingMode: (initialData?.pricingMode as "PER_CARAT" | "PER_RATTI" | "FLAT") || "PER_CARAT",
      purchaseRatePerCarat: initialData?.purchaseRatePerCarat || 0,
      sellingRatePerCarat: initialData?.sellingRatePerCarat || 0,
      purchaseRatePerRatti: initialData?.pricingMode === "PER_RATTI" ? (initialData?.purchaseRatePerCarat || 0) : 0,
      sellingRatePerRatti: initialData?.pricingMode === "PER_RATTI" ? (initialData?.sellingRatePerCarat || 0) : 0,
      flatPurchaseCost: initialData?.flatPurchaseCost || 0,
      flatSellingPrice: initialData?.flatSellingPrice || 0,
      mediaUrl: initialData?.media?.[0]?.mediaUrl || "",
      mediaUrls: initialData?.media?.map((m: InventoryMedia) => m.mediaUrl) || [],
      notes: initialData?.notes || "",
      description: initialData?.description || "",
      stockLocation: initialData?.stockLocation || "",
      collectionCodeId: initialData?.collectionCodeId || "",
      rashiCodeIds: initialData?.rashiCodes?.map((r: { id: string }) => r.id) || [],
      braceletType: initialData?.braceletType || "",
      beadSizeMm: initialData?.beadSizeMm ?? "",
      beadSize: initialData?.beadSizeLabel || (initialData?.beadSizeMm ? `${initialData.beadSizeMm}mm` : ""),
      beadCount: initialData?.beadCount ?? "",
      holeSizeMm: initialData?.holeSizeMm ?? "",
      innerCircumferenceMm: initialData?.innerCircumferenceMm ?? "",
      standardSize: initialData?.standardSize || "",
      categoryCodeId:
        initialData?.categoryCodeId ||
        (categories.find((c) => c.name === (initialData?.category || ""))?.id ??
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

  useEffect(() => {
    if (initialData) return;
    if (!createDefaultsRef.current) {
      try {
        createDefaultsRef.current = formSchema.parse(form.getValues());
      } catch {
        // ignore
      }
    }
  }, [initialData, form]);

  const watchCategory = form.watch("category");
  const watchGemType = form.watch("gemType");
  const watchColor = form.watch("color");
  const watchWeightValue = form.watch("weightValue");

  const selectedCategory = categories.find((c) => c.name === watchCategory);
  const selectedGemstone = gemstones.find((g) => g.name === watchGemType);
  const selectedColor = colors.find((c) => c.name === watchColor);

  useEffect(() => {
    const catCode = (selectedCategory?.code || "CAT").replace(/[^A-Z0-9]/g, "");
    const gemCode = (selectedGemstone?.code || "GEM").replace(/[^A-Z0-9]/g, "");
    const colCode = (selectedColor?.code || "XX").replace(/[^A-Z0-9]/g, "");
    const wgt = Number(watchWeightValue || 0).toFixed(2).replace('.', '');

    setSkuPreview(`KG${catCode}${gemCode}${colCode}${wgt}####`);
  }, [selectedCategory, selectedGemstone, selectedColor, watchWeightValue]);

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

  async function submitInventory(data: z.output<typeof formSchema>, ignoreDuplicates = false, shouldRedirect = true) {
    const fastErrors: Array<{ field: keyof FormInputValues; message: string }> = [];
    if (!String(data.itemName || "").trim()) fastErrors.push({ field: "itemName", message: "Item Name is required" });
    if (!String(data.category || "").trim()) fastErrors.push({ field: "category", message: "Category is required" });

    const mode = String(data.pricingMode || "");
    if (mode === "PER_CARAT") {
      const w = Number(data.weightValue || 0);
      const pr = Number(data.purchaseRatePerCarat || 0);
      const sr = Number(data.sellingRatePerCarat || 0);
      if (!(w > 0)) fastErrors.push({ field: "weightValue", message: "Weight is required for per-carat pricing" });
      if (!(pr > 0)) fastErrors.push({ field: "purchaseRatePerCarat", message: "Purchase Rate is required" });
      if (!(sr > 0)) fastErrors.push({ field: "sellingRatePerCarat", message: "Selling Rate is required" });
    } else if (mode === "PER_RATTI") {
      const pr = Number(data.purchaseRatePerRatti || 0);
      const sr = Number(data.sellingRatePerRatti || 0);
      if (!(pr > 0)) fastErrors.push({ field: "purchaseRatePerRatti", message: "Purchase Rate per ratti is required" });
      if (!(sr > 0)) fastErrors.push({ field: "sellingRatePerRatti", message: "Selling Rate per ratti is required" });
    } else if (mode === "FLAT") {
      const pc = Number(data.flatPurchaseCost || 0);
      const sp = Number(data.flatSellingPrice || 0);
      if (!(pc > 0)) fastErrors.push({ field: "flatPurchaseCost", message: "Total Cost is required" });
      if (!(sp > 0)) fastErrors.push({ field: "flatSellingPrice", message: "Total Selling Price is required" });
    }

    if (fastErrors.length) {
      for (const e of fastErrors) {
        form.setError(e.field, { type: "manual", message: e.message });
      }
      const first = fastErrors[0]?.field;
      if (first) {
        try {
          form.setFocus(first);
          const el = document.querySelector(`[name="${String(first)}"]`) as HTMLElement | null;
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
        } catch {}
      }
      toast.error(fastErrors[0]?.message || "Please check required fields.");
      return;
    }

    setIsPending(true);
    setDuplicateWarning(null);

    const optimisticToastId =
      !ignoreDuplicates
        ? toast.loading(initialData ? "Saving inventory..." : "Creating inventory...", { duration: Infinity })
        : null;

    // Map PER_RATTI form fields to PER_CARAT DB columns (reuse same column)
    if (data.pricingMode === "PER_RATTI") {
      (data as Record<string, unknown>).purchaseRatePerCarat = data.purchaseRatePerRatti;
      (data as Record<string, unknown>).sellingRatePerCarat = data.sellingRatePerRatti;
    }

    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'mediaUrls') return;
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });

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
      const t0 = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
      if (initialData) {
        result = await updateInventory(initialData.id, null, formData);
      } else {
        result = await createInventory(null, formData);
      }
      const t1 = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
      console.log(`[inventory-save] ${initialData ? "update" : "create"} finished in ${Math.round(Number(t1) - Number(t0))}ms`);

      if (result?.success) {
        const msg = result.message || (initialData ? "Inventory updated successfully!" : "Inventory created & added to label cart!");
        if (optimisticToastId != null) {
          try { toast.dismiss(optimisticToastId); } catch {}
        }

        const skuStr = isCreatedInventoryResult(result) ? result.sku : "";
        const toastMsg = skuStr
          ? initialData
            ? `Inventory updated: ${skuStr}`
            : `Inventory created: ${skuStr}`
          : msg;
        toast.success(toastMsg, { duration: 2500 });

        const created = !initialData && isCreatedInventoryResult(result) ? result : null;

        if (created) {
          try {
            localStorage.setItem("inventory-last-saved", JSON.stringify({
              sku: created.sku,
              itemName: created.itemName,
            }));
          } catch {}
        }

        if (!initialData && !shouldRedirect) {
          setFormResetKey((k) => k + 1);
          const base = createDefaultsRef.current || form.getValues();
          const resetValues: FormInputValues = {
            ...(base as Partial<FormInputValues>),
            itemName: "",
            internalName: "",
            category: categories[0]?.name || "",
            vendorId: "",
            mediaUrl: "",
            mediaUrls: [],
            notes: "",
            description: "",
            certificateComments: "",
            gemType: "",
            color: "",
            shape: "",
            dimensionsMm: "",
            weightValue: 0,
            weightUnit: "cts",
            weightRatti: undefined,
            treatment: "",
            origin: "",
            fluorescence: "",
            certification: "",
            certificateCodeIds: [],
            transparency: "",
            pricingMode: "PER_CARAT",
            purchaseRatePerCarat: undefined,
            sellingRatePerCarat: undefined,
            flatPurchaseCost: 0,
            flatSellingPrice: 0,
            stockLocation: "",
            categoryCodeId: "",
            gemstoneCodeId: "",
            colorCodeId: "",
            collectionCodeId: "",
            rashiCodeIds: [],
            cutCodeId: "",
            braceletType: "",
            standardSize: "",
            beadSizeMm: undefined,
            beadCount: undefined,
            holeSizeMm: undefined,
            innerCircumferenceMm: undefined,
            beadSize: "",
            braceletSize: "",
            holeSize: "",
            ringSize: "",
            ringAdjustable: "",
            pendantLoop: "",
            figureHeight: "",
            figureWidth: "",
            chipSize: "",
            packingType: "",
          };

          form.reset(resetValues, {
            keepDirty: false,
            keepTouched: false,
            keepErrors: false,
            keepIsSubmitted: false,
            keepSubmitCount: false,
          });
          form.clearErrors();
          setSkuPreview("");
          setFileUploadResetKey((prev) => prev + 1);
          setIsSkuPreviewOpen(false);
          itemNameInputRef.current?.focus();
        }

        if (shouldRedirect) {
          router.push("/inventory");
          return;
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else if (result && (result.message || result.errors)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((result as any).isDuplicateWarning) {
          if (optimisticToastId != null) {
            try { toast.dismiss(optimisticToastId); } catch {}
          }
          setDuplicateWarning({
            message: result.message || "Potential duplicate detected",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            errors: (result.errors as any) || {},
          });
          setIsPending(false);
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
        if (optimisticToastId != null) {
          try { toast.dismiss(optimisticToastId); } catch {}
        }
        toast.error(errorMsg);
        if (result.errors) {
          console.error("Form errors:", result.errors);
        }
      }
    } catch (error) {
      if (optimisticToastId != null) {
        try { toast.dismiss(optimisticToastId); } catch {}
      }
      console.error(error);
      toast.error("An unexpected error occurred.");
    } finally {
      setIsPending(false);
    }
  }

  const scrollToFirstError = () => {
    const errors = form.formState.errors;
    const keys = Object.keys(errors);
    if (keys.length > 0) {
      try {
        form.setFocus(keys[0] as keyof FormInputValues);
        const el = document.querySelector(`[name="${keys[0]}"]`) as HTMLElement | null;
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch {}
    }
  };

  const handleValidationErrors = (error: z.ZodError<FormInputValues>) => {
    const issues = error.issues;
    for (const issue of issues) {
      const field = issue.path[0];
      if (typeof field === "string") {
        form.setError(field as keyof FormInputValues, {
          type: "manual",
          message: issue.message,
        });
      }
    }

    const firstIssue = issues[0];
    const firstField = firstIssue?.path[0];
    if (typeof firstField === "string") {
      try {
        form.setFocus(firstField as keyof FormInputValues);
        const el = document.querySelector(`[name="${firstField}"]`) as HTMLElement | null;
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch {}
    } else {
      scrollToFirstError();
    }

    toast.error(firstIssue?.message || "Please check required fields.");
  };

  async function handleSubmitClick(shouldRedirect: boolean) {
    if (isPending) return;

    // Ensure code IDs are in sync with selected names before submit
    if (selectedCategory) form.setValue("categoryCodeId", selectedCategory.id);
    if (selectedGemstone) form.setValue("gemstoneCodeId", selectedGemstone.id);
    if (selectedColor) form.setValue("colorCodeId", selectedColor.id);

    console.info(`[inventory-form] ${shouldRedirect ? "create" : "save-add-new"} clicked`);
    setShouldRedirectAfterSave(shouldRedirect);
    form.clearErrors();

    const parsed = formSchema.safeParse(form.getValues());
    if (!parsed.success) {
      console.warn("[inventory-form] validation blocked save", parsed.error.flatten().fieldErrors);
      handleValidationErrors(parsed.error as z.ZodError<FormInputValues>);
      return;
    }

    await submitInventory(parsed.data, false, shouldRedirect);
  }

  const handleSaveAnyway = async () => {
    // Ensure code IDs are in sync before save
    if (selectedCategory) form.setValue("categoryCodeId", selectedCategory.id);
    if (selectedGemstone) form.setValue("gemstoneCodeId", selectedGemstone.id);
    if (selectedColor) form.setValue("colorCodeId", selectedColor.id);

    const data = form.getValues();
    await submitInventory(data as unknown as z.output<typeof formSchema>, true, shouldRedirectAfterSave);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmitClick(true);
        }}
        className="space-y-8"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <BasicInfoSection
              form={form}
              categories={categories}
              itemNameInputRef={itemNameInputRef}
              skuPreview={skuPreview}
              isSkuPreviewOpen={isSkuPreviewOpen}
              setIsSkuPreviewOpen={setIsSkuPreviewOpen}
            />

            <GemDetailsSection key={`gem-${formResetKey}`} form={form} gemstones={gemstones} colors={colors} cuts={cuts} origins={origins} />

            <ClassificationSection form={form} certificates={certificates} collections={collections} />

            <RashisSection form={form} rashis={rashis} />
          </div>

          <div className="space-y-6" key={`right-${formResetKey}`}>
            <MeasurementsSection form={form} categoryName={watchCategory} categories={categories} />

            <PricingSection form={form} vendors={vendors} categories={categories} gemstones={gemstones} />

            <div className="rounded-lg border bg-card/50 p-5 space-y-4">
              <h3 className="text-base font-semibold">Media Upload</h3>
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
                          if (urls.length > 0) {
                            form.setValue("mediaUrl", urls[0]);
                          }
                        }}
                        defaultFiles={field.value || []}
                        sku={skuPreview}
                        category={watchCategory}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <NotesSection key={`notes-${formResetKey}`} form={form} skuPreview={skuPreview} />
          </div>
        </div>

        <div className="flex gap-4">
          <Button
            type="button"
            disabled={isPending}
            onClick={() => void handleSubmitClick(true)}
            className="transition-all duration-200 hover:scale-105 active:scale-95 flex-1"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? "Update Inventory Item" : "Create Inventory Item"}
          </Button>

          {!initialData && (
            <Button
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={() => void handleSubmitClick(false)}
              className="transition-all duration-200 hover:scale-105 active:scale-95 flex-1"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save & Add New
            </Button>
          )}
        </div>
      </form>

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
