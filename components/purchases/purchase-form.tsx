"use client";

import { useForm, useFieldArray, useWatch, UseFormReturn, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Plus, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import Link from "next/link";
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

const WEIGHT_UNITS = ["cts", "grams", "pcs", "kgs", "ratti"];

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
  remarks: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, "Add at least one item"),
});

type FormValues = z.infer<typeof formSchema>;
type PaymentDraft = {
    amount: number;
    method: "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE";
    date: string;
    reference: string;
    chequeNumber: string;
    bankName: string;
    chequePayee: string;
    chequeDate: string;
    autoFill?: boolean;
};

function emptyPayment(amount: number, method: PaymentDraft["method"] = "CASH"): PaymentDraft {
    return {
        amount,
        method,
        date: new Date().toISOString().split("T")[0],
        reference: "",
        chequeNumber: "",
        bankName: "",
        chequePayee: "",
        chequeDate: "",
        autoFill: true,
    };
}

interface PurchaseFormProps {
  vendors: { id: string; name: string }[];
  categories?: { id: string; name: string; code?: string | null }[];
  gemstones?: { id: string; name: string; code?: string | null }[];
  colors?: { id: string; name: string; code?: string | null }[];
  suggestedInvoiceNo?: string;
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
    isSingle,
    categories,
}: { 
    index: number; 
    form: UseFormReturn<FormValues>; 
    remove: (index: number) => void; 
    isSingle: boolean; 
    categories: { id: string; name: string; code?: string | null }[];
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
                            <Select onValueChange={(val) => handleCategoryChange(val)} value={field.value || ""}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Category" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {categories.length > 0 ? categories.map((c) => (
                                        <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                                    )) : (
                                        <>
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
                                        </>
                                    )}
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
            <div className="md:col-span-2 space-y-2">
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

            {/* Qty, Unit, Cost - Compact */}
            <div className="md:col-span-3 grid grid-cols-3 gap-2">
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
                    name={`items.${index}.weightType`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className={index !== 0 ? "sr-only md:not-sr-only" : ""}>Unit</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Unit" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {WEIGHT_UNITS.map((u) => (
                                        <SelectItem key={u} value={u}>{u}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
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

            <div className="md:col-span-12">
              <FormField
                control={form.control}
                name={`items.${index}.remarks`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Remarks</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Item-specific remarks" {...field} />
                    </FormControl>
                    <FormMessage />
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

export function PurchaseForm({ vendors, categories = [], initialData, suggestedInvoiceNo }: PurchaseFormProps) {
  const [isPending, setIsPending] = useState(false);
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [payments, setPayments] = useState<PaymentDraft[]>([]);
    const [balanceConfirmed, setBalanceConfirmed] = useState(false);
  const router = useRouter();

  const defaultValues: FormValues = initialData
    ? {
        vendorId: initialData.vendorId,
        purchaseDate: new Date(initialData.purchaseDate).toISOString().split("T")[0],
        invoiceNo: initialData.invoiceNo || "",
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
    invoiceNo: suggestedInvoiceNo || "",
    remarks: "",
    items: [
        { 
            itemName: "",
            category: categories[0]?.name || "",
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
        if (isPending) return;
        if (!initialData) {
            setPayments((current) => current.length ? syncAutoBalance(current) : [emptyPayment(totalValue)]);
            setPaymentOpen(true);
            return;
        }
        await savePurchase(data, []);
    }

    async function savePurchase(data: FormValues, purchasePayments: PaymentDraft[]) {
    setIsPending(true);
    const formData = new FormData();
    formData.append("vendorId", data.vendorId);
    formData.append("purchaseDate", data.purchaseDate);
    if (initialData && data.invoiceNo) formData.append("invoiceNo", data.invoiceNo);
    formData.append("payments", JSON.stringify(purchasePayments));
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
            console.error(result.errors);
            const validationErrors = Object.values(result.errors)
                .flat()
                .filter((message): message is string => typeof message === "string");
            toast.error(validationErrors.join("; ") || "Validation failed");
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

    async function confirmPayment() {
        if (isPending) return;
        const data = form.getValues();
        const paidAmount = allocatedAmount(payments);
        if (paidAmount > totalValue) {
            toast.error("Payment total cannot exceed the purchase total");
            return;
        }
        for (const payment of payments) {
            if (["UPI", "BANK_TRANSFER"].includes(payment.method) && !payment.reference.trim()) {
                toast.error("Reference number is required for UPI and bank transfer");
                return;
            }
            if (payment.method === "CHEQUE" && (!payment.chequeNumber || !payment.bankName || !payment.chequePayee || !payment.chequeDate)) {
                toast.error("Complete all cheque details before saving");
                return;
            }
        }
        const remaining = remainingAmount(payments);
        if (remaining > 0 && !balanceConfirmed) {
            setBalanceConfirmed(true);
            toast.warning(
                `${formatAmount(remaining)} of ${formatAmount(totalValue)} is not allocated to any payment. ` +
                "Adjust the amounts or use Auto-fill balance, then confirm again to save as PARTIAL."
            );
            return;
        }
        setPaymentOpen(false);
        await savePurchase(data, payments);
    }

  const totalValue = form.watch("items")?.reduce((sum, item) => sum + Number(item.totalCost || 0), 0) || 0;

  const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

  const formatAmount = (value: number) =>
    round2(value).toLocaleString("en-IN", { style: "currency", currency: "INR" });

  const allocatedAmount = (rows: PaymentDraft[]) =>
    round2(rows.reduce((sum, row) => sum + Number(row.amount || 0), 0));

  const remainingAmount = (rows: PaymentDraft[]) =>
    round2(Math.max(0, totalValue - allocatedAmount(rows)));

  // Balance the target row so every row except it adds up to the purchase total.
  const balanceFor = (rows: PaymentDraft[], target: number) =>
    round2(
      Math.max(
        0,
        totalValue - rows.reduce((sum, row, i) => (i === target ? sum : sum + Number(row.amount || 0)), 0)
      )
    );

  // Keeps the auto-filled row equal to the unpaid balance so split payments
  // always add up to the purchase total.
  function syncAutoBalance(rows: PaymentDraft[]): PaymentDraft[] {
    if (rows.length < 2) return rows;
    for (let index = rows.length - 1; index >= 0; index--) {
      if (rows[index].autoFill) {
        const nextAmount = balanceFor(rows, index);
        if (round2(Number(rows[index].amount || 0)) === nextAmount) return rows;
        const next = [...rows];
        next[index] = { ...next[index], amount: nextAmount };
        return next;
      }
    }
    return rows;
  }

  const resetBalanceConfirmation = () => setBalanceConfirmed(false);

  const updatePayment = (index: number, patch: Partial<PaymentDraft>) => {
    resetBalanceConfirmation();
    setPayments((rows) =>
      syncAutoBalance(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
    );
  };

  const addPaymentRow = () => {
    resetBalanceConfirmation();
    setPayments((rows) => {
      const remaining = remainingAmount(rows);
      // Only the newest row tracks the unpaid balance.
      return [...rows.map((row) => ({ ...row, autoFill: false })), emptyPayment(remaining)];
    });
  };

  const removePaymentRow = (index: number) => {
    resetBalanceConfirmation();
    setPayments((rows) => {
      const kept = rows.filter((_, i) => i !== index);
      const withAutoRow = kept.map((row, i) => ({ ...row, autoFill: i === kept.length - 1 }));
      return syncAutoBalance(withAutoRow);
    });
  };

  const autoFillBalance = () => {
    resetBalanceConfirmation();
    setPayments((rows) => {
      if (!rows.length) return rows;
      const autoIndex = rows.reduce<number | null>((found, row, i) => (row.autoFill ? i : found), null);
      const target = autoIndex ?? rows.length - 1;
      const next = [...rows];
      next[target] = { ...next[target], amount: balanceFor(rows, target), autoFill: true };
      return next;
    });
  };

  const allocated = allocatedAmount(payments);
  const remaining = remainingAmount(payments);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="rounded-xl border bg-muted/30 p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Purchase reference</p>
            <h3 className="text-lg font-semibold">{suggestedInvoiceNo || "Auto-generated"}</h3>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Total</p>
            <p className="text-xl font-bold text-emerald-600">₹{totalValue.toLocaleString("en-IN")}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">{initialData ? "Edit Purchase" : "Purchase Details"}</h3>
            
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
                      {vendors.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <Link href="/vendors" className="hover:text-primary flex items-center gap-1">
                      View All Vendors <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
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
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 rounded-md border p-4 text-sm text-muted-foreground">
                  Payment confirmation is completed after clicking Create Purchase.
                </div>
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
                        categories={categories}
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
            <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Confirm Vendor Payment</DialogTitle>
                        <DialogDescription>Record the payment made now. You can split it across multiple methods.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2 rounded-md border bg-muted/40 p-3 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Purchase total</span>
                                <span className="font-medium">{formatAmount(totalValue)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Allocated</span>
                                <span className="font-medium">{formatAmount(allocated)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-muted-foreground">Remaining</span>
                                <span className="flex items-center gap-2">
                                    <span className={remaining > 0 ? "font-semibold text-amber-600" : "font-semibold text-emerald-600"}>
                                        {formatAmount(remaining)}
                                    </span>
                                    {remaining > 0 && payments.length > 1 && (
                                        <Button type="button" size="sm" variant="outline" onClick={autoFillBalance}>
                                            Auto-fill balance
                                        </Button>
                                    )}
                                </span>
                            </div>
                        </div>
                        {payments.map((payment, index) => (
                            <div key={index} className="grid grid-cols-1 gap-3 rounded-md border p-4 md:grid-cols-4">
                                <Input type="number" step="0.01" min="0" placeholder="Amount" value={payment.amount} onChange={(event) => updatePayment(index, { amount: Number(event.target.value), autoFill: false })} />
                                <Select value={payment.method} onValueChange={(method: PaymentDraft["method"]) => updatePayment(index, { method })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CASH">Cash</SelectItem>
                                        <SelectItem value="UPI">UPI</SelectItem>
                                        <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                                        <SelectItem value="CHEQUE">Cheque</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Input type="date" value={payment.date} onChange={(event) => updatePayment(index, { date: event.target.value })} />
                                {payment.method !== "CASH" && payment.method !== "CHEQUE" && <Input placeholder="Reference number" value={payment.reference} onChange={(event) => updatePayment(index, { reference: event.target.value })} />}
                                {payment.method === "CHEQUE" && <div className="md:col-span-4 grid grid-cols-1 gap-3 md:grid-cols-4"><Input placeholder="Cheque number" value={payment.chequeNumber} onChange={(event) => updatePayment(index, { chequeNumber: event.target.value })} /><Input placeholder="Bank name" value={payment.bankName} onChange={(event) => updatePayment(index, { bankName: event.target.value })} /><Input placeholder="Cheque payable to" value={payment.chequePayee} onChange={(event) => updatePayment(index, { chequePayee: event.target.value })} /><Input type="date" value={payment.chequeDate} onChange={(event) => updatePayment(index, { chequeDate: event.target.value })} /></div>}
                                {payments.length > 1 && (
                                    <div className="md:col-span-4 flex justify-end border-t pt-2">
                                        <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive/90" onClick={() => removePaymentRow(index)}>
                                            <Trash2 className="h-4 w-4 mr-2" /> Remove payment
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                        <Button type="button" variant="outline" onClick={addPaymentRow}><Plus className="mr-2 h-4 w-4" /> Add Payment Method</Button>
                        <div className="flex justify-end"><Button type="button" onClick={confirmPayment} disabled={isPending}>{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm & Create Purchase</Button></div>
                    </div>
                </DialogContent>
            </Dialog>
    </Form>
  );
}
