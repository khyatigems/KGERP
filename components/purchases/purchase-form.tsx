"use client";

import { useForm, useFieldArray, useWatch, UseFormReturn, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { createPurchase, updatePurchase } from "@/app/(dashboard)/purchases/actions";

// --- Constants ---

const SHAPE_OPTIONS = [
  "Oval", "Round", "Cushion", "Emerald", "Pear", "Marquise", "Heart", "Square", "Trillion", "Cabochon", "Freeform", "Rough", // Loose
  "Ganesh", "Buddha", "Turtle", "Elephant", "Pyramid", "Tower / Pencil", "Shri Yantra", "Coin", // Carvings
  "Special", "Mixed", "Assorted", // General
  "Other"
];

const SIZE_UNITS = ["mm", "ct", "gram", "string", "piece", "mixed", "NA"];

const BEAD_SIZES = ["4", "6", "8", "10", "12", "Mixed", "Other"];

const CHIPS_TYPES = ["Small Chips", "Medium Chips", "Large Chips", "Mixed Chips"];

// --- Schemas ---

const purchaseItemSchema = z.object({
  itemName: z.string().min(1, "Item name required"),
  category: z.string().min(1, "Category is required"),
  shape: z.string().optional(),
  sizeValue: z.string().optional(),
  sizeUnit: z.string().optional(),
  beadSizeMm: z.coerce.number().optional(),
  weightType: z.string().default("cts"),
  quantity: z.coerce.number().positive("Qty must be positive"),
  costPerUnit: z.coerce.number().min(0),
  totalCost: z.coerce.number().min(0),
  remarks: z.string().optional(),
});

const formSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  purchaseDate: z.string(),
  invoiceNo: z.string().optional(),
  paymentMode: z.string().optional(),
  paymentStatus: z.string().default("PENDING"),
  remarks: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, "Add at least one item"),
});

type FormValues = z.infer<typeof formSchema>;

interface PurchaseFormProps {
  vendors: { id: string; name: string }[];
  initialData?: {
    id: string;
    vendorId: string;
    purchaseDate: string | Date;
    invoiceNo?: string | null;
    paymentMode?: string | null;
    paymentStatus?: string | null;
    remarks?: string | null;
    items: {
      itemName: string;
      category: string | null;
      shape: string | null;
      sizeValue: string | null;
      sizeUnit: string | null;
      beadSizeMm: number | null;
      weightType: string | null;
      quantity: number;
      costPerUnit: number;
      totalCost: number;
      remarks: string | null;
    }[];
  };
}

// --- Components ---

function PurchaseItemRow({ 
    index, 
    form, 
    remove, 
    isSingle 
}: { 
    index: number; 
    form: UseFormReturn<FormValues>; 
    remove: (index: number) => void; 
    isSingle: boolean; 
}) {
    const category = useWatch({ control: form.control, name: `items.${index}.category` });
    const shape = useWatch({ control: form.control, name: `items.${index}.shape` });

    // Helper to determine if we should show the custom shape input
    const isCustomShape = shape && !SHAPE_OPTIONS.includes(shape) && shape !== "Other";
    const showShapeInput = shape === "Other" || isCustomShape;

    // Handle Category Changes Logic
    const handleCategoryChange = (val: string) => {
        form.setValue(`items.${index}.category`, val);
        
        // Rule: If category = Mixed Lot, default shape = Mixed
        if (val === "Mixed Lot") {
            form.setValue(`items.${index}.shape`, "Mixed");
        }
    };

    // Handle Bead Size Shortcut
    const handleBeadSizeChange = (val: string) => {
        if (val === "Other") return; // Do nothing, let user type
        // Auto-fill Size Value and Unit
        form.setValue(`items.${index}.sizeValue`, val);
        form.setValue(`items.${index}.sizeUnit`, "mm");
    };

    // Handle Chips Type Shortcut
    const handleChipsTypeChange = (val: string) => {
        // Auto-fill Size Value and Unit
        form.setValue(`items.${index}.sizeValue`, val); // e.g. "Small Chips" -> Size Value? Or just "Small"? User said "Chips Type" dropdown. 
        // Example: Category "Chips", Size Value "Mixed", Unit "mixed".
        // Let's set Size Value to the type (e.g. "Small Chips") and Unit to "mixed" or "NA"?
        // Or strip "Chips"? "Small".
        // Let's use the full value for clarity.
        form.setValue(`items.${index}.sizeValue`, val);
        form.setValue(`items.${index}.sizeUnit`, "mixed");
    };

    return (
        <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-start bg-card border-b last:border-0">
            {/* Row 1: Basic Info */}
            <div className="md:col-span-3 space-y-2">
                <FormField
                    control={form.control}
                    name={`items.${index}.itemName`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className={index !== 0 ? "sr-only md:not-sr-only" : ""}>Item Name</FormLabel>
                            <FormControl>
                                <Input placeholder="Item Name" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <div className="md:col-span-2 space-y-2">
                <FormField
                    control={form.control}
                    name={`items.${index}.category`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className={index !== 0 ? "sr-only md:not-sr-only" : ""}>Category</FormLabel>
                            <Select onValueChange={(val) => handleCategoryChange(val)} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Category" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Loose Gemstone">Loose Gemstone</SelectItem>
                                    <SelectItem value="Bracelet">Bracelet</SelectItem>
                                    <SelectItem value="Ring">Ring</SelectItem>
                                    <SelectItem value="Pendant">Pendant</SelectItem>
                                    <SelectItem value="Figure / Idol">Figure / Idol</SelectItem>
                                    <SelectItem value="Seven Chakra">Seven Chakra</SelectItem>
                                    <SelectItem value="Chips">Chips</SelectItem>
                                    <SelectItem value="Beads">Beads</SelectItem>
                                    <SelectItem value="Mixed Lot">Mixed Lot</SelectItem>
                                    <SelectItem value="Raw / Rough">Raw / Rough</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            {/* Shape - Conditional */}
            <div className="md:col-span-2 space-y-2">
                <FormField
                    control={form.control}
                    name={`items.${index}.shape`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className={index !== 0 ? "sr-only md:not-sr-only" : ""}>Shape</FormLabel>
                            <div className="space-y-2">
                                <Select 
                                    onValueChange={(val) => {
                                        field.onChange(val);
                                    }} 
                                    value={SHAPE_OPTIONS.includes(field.value || "") ? field.value : (field.value ? "Other" : undefined)}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Shape" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {SHAPE_OPTIONS.map(opt => (
                                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {showShapeInput && (
                                    <Input 
                                        placeholder="Type shape..." 
                                        value={field.value === "Other" ? "" : field.value} 
                                        onChange={(e) => field.onChange(e.target.value)} 
                                    />
                                )}
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            {/* Size / Dimension - Flexible */}
            <div className="md:col-span-3 space-y-2">
                 <FormLabel className={index !== 0 ? "sr-only md:not-sr-only" : ""}>Size / Dimension</FormLabel>
                 <div className="flex space-x-2">
                    <FormField
                        control={form.control}
                        name={`items.${index}.sizeValue`}
                        render={({ field }) => (
                            <FormItem className="flex-1">
                                <FormControl>
                                    <Input placeholder="Value (e.g. 8, 45x30)" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name={`items.${index}.sizeUnit`}
                        render={({ field }) => (
                            <FormItem className="w-24">
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Unit" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {SIZE_UNITS.map(u => (
                                            <SelectItem key={u} value={u}>{u}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )}
                    />
                 </div>
                 
                 {/* Shortcuts based on Category */}
                 {(category === "Beads" || category === "Bracelet") && (
                     <div className="mt-1">
                        <Select onValueChange={handleBeadSizeChange}>
                             <SelectTrigger className="h-7 text-xs">
                                <SelectValue placeholder="Quick Bead Size..." />
                             </SelectTrigger>
                             <SelectContent>
                                {BEAD_SIZES.map(s => (
                                    <SelectItem key={s} value={s}>{s === "Other" || s === "Mixed" ? s : `${s}mm`}</SelectItem>
                                ))}
                             </SelectContent>
                        </Select>
                     </div>
                 )}
                 {category === "Chips" && (
                     <div className="mt-1">
                        <Select onValueChange={handleChipsTypeChange}>
                             <SelectTrigger className="h-7 text-xs">
                                <SelectValue placeholder="Quick Chips Type..." />
                             </SelectTrigger>
                             <SelectContent>
                                {CHIPS_TYPES.map(t => (
                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                             </SelectContent>
                        </Select>
                     </div>
                 )}
            </div>

            {/* Qty, Cost, Total - Compact */}
            <div className="md:col-span-2 grid grid-cols-2 gap-2">
                 <FormField
                    control={form.control}
                    name={`items.${index}.quantity`}
                    render={({ field }) => (
                        <FormItem>
                             <FormLabel className={index !== 0 ? "sr-only md:not-sr-only" : ""}>Qty</FormLabel>
                            <FormControl>
                                <Input
                                    type="number"
                                    placeholder="Qty"
                                    {...field}
                                    onChange={(e) => {
                                        field.onChange(e.target.value);
                                        const qty = Number(e.target.value) || 0;
                                        const rate = Number(form.getValues(`items.${index}.costPerUnit`)) || 0;
                                        form.setValue(`items.${index}.totalCost`, qty * rate);
                                    }}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name={`items.${index}.costPerUnit`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className={index !== 0 ? "sr-only md:not-sr-only" : ""}>Rate</FormLabel>
                            <FormControl>
                                <Input
                                    type="number"
                                    placeholder="Rate"
                                    {...field}
                                    onChange={(e) => {
                                        field.onChange(e.target.value);
                                        const rate = Number(e.target.value) || 0;
                                        const qty = Number(form.getValues(`items.${index}.quantity`)) || 0;
                                        form.setValue(`items.${index}.totalCost`, qty * rate);
                                    }}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />
            </div>
            
            {/* Delete & Total Display */}
            <div className="md:col-span-12 flex justify-between items-center pt-2 border-t mt-2">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <span>Total:</span>
                    <FormField
                        control={form.control}
                        name={`items.${index}.totalCost`}
                        render={({ field }) => (
                            <span className="font-medium text-foreground">
                                {Number(field.value).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                            </span>
                        )}
                    />
                </div>
                <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={() => remove(index)}
                    disabled={isSingle}
                    className="text-destructive hover:text-destructive/90"
                >
                    <Trash2 className="h-4 w-4 mr-2" /> Remove Item
                </Button>
            </div>
        </div>
    );
}

// --- Main Export ---

export function PurchaseForm({ vendors, initialData }: PurchaseFormProps) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const defaultValues: FormValues = initialData
    ? {
        vendorId: initialData.vendorId,
        purchaseDate: new Date(initialData.purchaseDate).toISOString().split("T")[0],
        invoiceNo: initialData.invoiceNo || "",
        paymentMode: initialData.paymentMode || "BANK_TRANSFER",
        paymentStatus: initialData.paymentStatus || "PENDING",
        remarks: initialData.remarks || "",
        items: initialData.items.map((item) => ({
          itemName: item.itemName,
          category: item.category || "Other",
          shape: item.shape || "",
          sizeValue: item.sizeValue || "",
          sizeUnit: item.sizeUnit || "",
          beadSizeMm: item.beadSizeMm ?? undefined,
          weightType: item.weightType || "cts",
          quantity: item.quantity,
          costPerUnit: item.costPerUnit,
          totalCost: item.totalCost,
          remarks: item.remarks || "",
        })),
      }
    : {
    vendorId: "",
    purchaseDate: new Date().toISOString().split("T")[0],
    invoiceNo: "",
    paymentMode: "BANK_TRANSFER",
    paymentStatus: "PENDING",
    remarks: "",
    items: [
        { 
            itemName: "",
            category: "",
            quantity: 0, 
            costPerUnit: 0, 
            totalCost: 0, 
            weightType: "cts" 
        }
    ],
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    values: defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  async function onSubmit(data: FormValues) {
    setIsPending(true);
    const formData = new FormData();
    formData.append("vendorId", data.vendorId);
    formData.append("purchaseDate", data.purchaseDate);
    if (data.invoiceNo) formData.append("invoiceNo", data.invoiceNo);
    if (data.paymentMode) formData.append("paymentMode", data.paymentMode);
    if (data.paymentStatus) formData.append("paymentStatus", data.paymentStatus);
    if (data.remarks) formData.append("remarks", data.remarks);
    
    formData.append("items", JSON.stringify(data.items));

    try {
        let result;
        if (initialData) {
            result = await updatePurchase(initialData.id, null, formData);
        } else {
            result = await createPurchase(null, formData);
        }

        if (result && 'success' in result && result.success) {
            toast.success(result.message || "Purchase saved successfully");
            router.push("/purchases");
        } else if (result && 'message' in result) {
            toast.error(result.message);
        } else if (result && 'errors' in result) {
            // Handle server-side validation errors if needed
            console.error(result.errors);
            toast.error("Validation failed");
        }
    } catch (error) {
        if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
            throw error;
        }
        console.error(error);
        toast.error("An unexpected error occurred");
    } finally {
        setIsPending(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">{initialData ? "Edit Purchase" : "Purchase Details"}</h3>
            
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
                      {vendors.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name}
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
                  name="purchaseDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="invoiceNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice No</FormLabel>
                      <FormControl>
                        <Input placeholder="INV-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="paymentMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Mode</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Mode" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                          <SelectItem value="CASH">Cash</SelectItem>
                          <SelectItem value="UPI">UPI</SelectItem>
                          <SelectItem value="CREDIT">Credit</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="paymentStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PAID">Paid</SelectItem>
                          <SelectItem value="PENDING">Pending</SelectItem>
                          <SelectItem value="PARTIAL">Partial</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Items</h3>
                <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => append({ 
                        itemName: "",
                        category: "",
                        quantity: 0, 
                        costPerUnit: 0, 
                        totalCost: 0, 
                        weightType: "cts" 
                    })}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                </Button>
            </div>
            
            <div className="border rounded-md">
                {fields.map((field, index) => (
                    <PurchaseItemRow 
                        key={field.id} 
                        index={index} 
                        form={form} 
                        remove={remove} 
                        isSingle={fields.length === 1}
                    />
                ))}
            </div>
            {form.formState.errors.items && (
                 <p className="text-sm font-medium text-destructive">{form.formState.errors.items.message}</p>
            )}
        </div>

        <div className="flex justify-end gap-4">
            <Button type="submit" disabled={isPending} className="transition-all duration-200 hover:scale-105 active:scale-95">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {initialData ? "Update Purchase" : "Create Purchase"}
            </Button>
        </div>
      </form>
    </Form>
  );
}
