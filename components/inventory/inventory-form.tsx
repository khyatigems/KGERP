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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { createInventory, updateInventory } from "@/app/(dashboard)/inventory/actions";
import { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import type { Inventory, Media } from "@prisma/client";

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
};

const formSchema = z.object({
  itemName: z.string().min(1, "Item name is required"),
  internalName: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  gemType: z.string().min(1, "Gem type is required"),
  color: z.string().min(1, "Color is required"),
  shape: z.string().min(1, "Shape is required"),
  dimensionsMm: z.string().optional(),
  weightValue: z.coerce.number().positive("Weight must be positive"),
  weightUnit: z.string().default("cts"),
  weightRatti: z.coerce.number().optional(),
  treatment: z.string().optional(),
  certification: z.string().optional(),
  vendorId: z.string().min(1, "Vendor is required"),
  pricingMode: z.enum(["PER_CARAT", "FLAT"]),
  purchaseRatePerCarat: z.coerce.number().optional(),
  sellingRatePerCarat: z.coerce.number().optional(),
  flatPurchaseCost: z.coerce.number().optional(),
  flatSellingPrice: z.coerce.number().optional(),
  notes: z.string().optional(),
  stockLocation: z.string().optional(),
  mediaUrl: z.string().url().optional().or(z.literal("")),
  categoryCodeId: z.string().min(1, "Category code is required"),
  gemstoneCodeId: z.string().min(1, "Gemstone code is required"),
  colorCodeId: z.string().min(1, "Color code is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface InventoryFormProps {
  vendors: { id: string; name: string }[];
  categories: CodeRow[];
  gemstones: CodeRow[];
  colors: CodeRow[];
  initialData?: InventoryWithExtras & { media: Media[] };
}

export function InventoryForm({ vendors, categories, gemstones, colors, initialData }: InventoryFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [skuPreview, setSkuPreview] = useState<string>("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    defaultValues: {
      itemName: initialData?.itemName || "",
      internalName: initialData?.internalName || "",
      category: initialData?.category || categories[0]?.name || "",
      gemType: initialData?.gemType || gemstones[0]?.name || "",
      color: initialData?.color || colors[0]?.name || "",
      shape: initialData?.shape || "",
      dimensionsMm: initialData?.dimensionsMm || "",
      weightValue: initialData?.weightValue || 0,
      weightUnit: initialData?.weightUnit || "cts",
      weightRatti: initialData?.weightRatti || 0,
      treatment: initialData?.treatment || "None",
      certification: initialData?.certification || "None",
      vendorId: initialData?.vendorId || "",
      pricingMode: (initialData?.pricingMode as "PER_CARAT" | "FLAT") || "PER_CARAT",
      purchaseRatePerCarat: initialData?.purchaseRatePerCarat || 0,
      sellingRatePerCarat: initialData?.sellingRatePerCarat || 0,
      flatPurchaseCost: initialData?.flatPurchaseCost || 0,
      flatSellingPrice: initialData?.flatSellingPrice || 0,
      mediaUrl: initialData?.media?.[0]?.url || "",
      notes: initialData?.notes || "",
      stockLocation: initialData?.stockLocation || "",
      categoryCodeId:
        initialData?.categoryCodeId ||
        (categories.find((c) => c.name === (initialData?.category || ""))?.id ??
          categories[0]?.id ??
          ""),
      gemstoneCodeId:
        initialData?.gemstoneCodeId ||
        (gemstones.find((g) => g.name === (initialData?.gemType || ""))?.id ??
          gemstones[0]?.id ??
          ""),
      colorCodeId:
        initialData?.colorCodeId ||
        (colors.find((c) => c.name === (initialData?.color || ""))?.id ??
          colors[0]?.id ??
          ""),
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
    const catCode = selectedCategory?.code || "CAT";
    const gemCode = selectedGemstone?.code || "GEM";
    const colCode = selectedColor?.code || "XX";
    const wgt = Number(weightValue || 0).toFixed(2);
    
    setSkuPreview(`KG-${catCode}-${gemCode}-${colCode}-${wgt}-####`);
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

  async function handleImageUpload(file: File) {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      setUploadError("Image upload is not configured. Please set Cloudinary details.");
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      const data = new FormData();
      data.append("file", file);
      data.append("upload_preset", uploadPreset);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: data,
      });

      if (!response.ok) {
      const errorData = await response.json();
      console.error("Cloudinary error:", errorData);
      setUploadError(errorData.error?.message || "Failed to upload image. Please try again.");
      return;
    }

      type CloudinaryUploadResult = {
        secure_url?: string;
      };

      const result = (await response.json()) as CloudinaryUploadResult;

      if (!result.secure_url) {
        setUploadError("Upload succeeded but no URL returned.");
        return;
      }

      form.setValue("mediaUrl", result.secure_url);
    } catch {
      setUploadError("Unexpected error during image upload.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  // We wrap the server action to handle client-side loading state if needed,
  // or just pass formData directly if we weren't doing extra client-side logic.
  // But useFormState handles the submission.
  // To integrate react-hook-form with useFormState, we can use a hidden submit button
  // or handle submission manually.
  // However, since we want validation first, we should use form.handleSubmit.

  async function onSubmit(data: FormValues) {
    setIsPending(true);
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });

    // Call the server action
    // We can't directly call formAction inside handleSubmit easily if we want to use the hook's return value.
    // So we'll just call the action directly or use a transition.
    
    // Actually, createInventory is a Server Action.
    // If we want to use useFormState, we usually bind it to the form action attribute.
    // But we want client-side validation first.
    
    // Pattern:
    // 1. Validate with Zod (client).
    // 2. If valid, submit FormData to server action.
    
    try {
        if (initialData) {
            await updateInventory(initialData.id, null, formData);
        } else {
            await createInventory(null, formData);
        }
    } catch (error) {
        console.error(error);
    } finally {
        setIsPending(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            
            <div className="p-4 bg-muted/50 rounded-lg border border-dashed flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">SKU Preview</span>
                <span className="font-mono font-bold text-primary text-lg">{skuPreview}</span>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="gemType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gem Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
            </div>

            <div className="grid grid-cols-3 gap-4">
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
               <div className="grid grid-cols-2 gap-4">
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
                <div className="grid grid-cols-2 gap-4">
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
              name="mediaUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Input placeholder="https://example.com/image.jpg" {...field} />
                    </FormControl>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          await handleImageUpload(file);
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? "Uploading..." : "Upload"}
                    </Button>
                  </div>
                  {uploadError && (
                    <p className="text-xs text-red-500">{uploadError}</p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any additional details..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "Update Inventory Item" : "Create Inventory Item"}
        </Button>
      </form>
    </Form>
  );
}
