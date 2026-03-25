"use client";

import { useForm, type Resolver, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect } from "react";
import { Loader2, Check, ChevronsUpDown, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createSale } from "@/app/(dashboard)/sales/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Inventory } from "@prisma/client";
import { useSearchParams } from "next/navigation";

const formSchema = z.object({
  items: z.array(z.object({
    inventoryId: z.string().uuid("Please select an item"),
    sellingPrice: z.coerce.number().positive("Selling price must be positive"),
    discount: z.coerce.number().min(0).default(0),
  })).min(1, "Select at least one item"),
  platform: z.string().min(1, "Platform is required"),
  saleDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date",
  }),
  customerId: z.string().uuid().optional().or(z.literal("")),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email().optional().or(z.literal("")),
  customerAddress: z.string().optional(),
  billingAddress: z.string().optional(),
  customerCity: z.string().optional(),
  placeOfSupply: z.string().optional(),
  shippingAddress: z.string().optional(),
  shippingCharge: z.coerce.number().min(0).optional(),
  additionalCharge: z.coerce.number().min(0).optional(),
  paymentMode: z.string().optional(),
  singlePaymentReference: z.string().optional(),
  paymentStatus: z.string().default("PENDING"),
  shippingMethod: z.string().optional(),
  trackingId: z.string().optional(),
  remarks: z.string().optional(),
  autoDelistListings: z.boolean().default(true),
  autoFillSplitFromSingle: z.boolean().default(true),
  initialPayments: z.array(z.object({
    amount: z.coerce.number().positive("Amount must be greater than zero"),
    method: z.string().min(1, "Method is required"),
    date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
    reference: z.string().optional(),
    notes: z.string().optional(),
  })).default([]),
});

type FormValues = z.infer<typeof formSchema>;

interface ExistingCustomer {
  id: string;
  name: string;
  phone?: string | null;
  phoneSecondary?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
}

interface SaleFormProps {
  inventoryItems: Inventory[];
  existingCustomers?: ExistingCustomer[];
}

export function SaleForm({ inventoryItems, existingCustomers = [] }: SaleFormProps) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(false);
  const searchParams = useSearchParams();

  const [invoiceOptions, setInvoiceOptions] = useState({
    showWeight: true,
    showRatti: true,
    showDimensions: true,
    showGemType: true,
    showCategory: true,
    showColor: true,
    showShape: true,
    showRashi: true,
    showCertificates: true,
    showSku: true,
    showPrice: true,
    showShippingCharge: false,
    showAdditionalCharge: false,
  });

  const fieldLabels: Record<string, string> = {
    showWeight: "Weight",
    showRatti: "Weight in Ratti",
    showDimensions: "Dimensions",
    showGemType: "Gem Type",
    showCategory: "Category",
    showColor: "Color",
    showShape: "Shape",
    showRashi: "Rashi",
    showCertificates: "Certificates",
    showSku: "SKU",
    showPrice: "Price Breakdown",
    showShippingCharge: "Show Shipping Charges",
    showAdditionalCharge: "Show Additional Charges",
  };
  
  const preSelectedInventoryId = searchParams.get("inventoryId");
  const quoteId = searchParams.get("quoteId");

  const getItemPrice = (inventoryId: string) => {
    const item = inventoryItems.find(i => i.id === inventoryId);
    if (!item) return 0;
    if (item.pricingMode === "PER_CARAT") {
      return (item.sellingRatePerCarat || 0) * (item.weightValue || 0);
    }
    return item.flatSellingPrice || 0;
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    defaultValues: {
      items: preSelectedInventoryId
        ? [{ inventoryId: preSelectedInventoryId, sellingPrice: getItemPrice(preSelectedInventoryId), discount: 0 }]
        : [],
      platform: "WHATSAPP",
      saleDate: new Date().toISOString().split("T")[0],
      customerId: "",
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      customerAddress: "",
      billingAddress: "",
      customerCity: "",
      placeOfSupply: "",
      shippingAddress: "",
      shippingCharge: 0,
      additionalCharge: 0,
      paymentMode: "UPI",
      paymentStatus: "PAID",
      shippingMethod: "COURIER",
      trackingId: "",
      remarks: "",
      autoDelistListings: true,
      autoFillSplitFromSingle: true,
      initialPayments: [],
    },
  });

  const selectedItems = form.watch("items");
  const autoFillSplitFromSingle = form.watch("autoFillSplitFromSingle");
  const shippingChargeValue = form.watch("shippingCharge");
  const additionalChargeValue = form.watch("additionalCharge");
  const initialPaymentsValue = form.watch("initialPayments");
  const autoDelist = form.watch("autoDelistListings");
  const shippingAddressValue = form.watch("shippingAddress");

  const computedInvoiceTotal = (() => {
    const itemsTotal = (selectedItems || []).reduce((sum, item) => {
      const price = Number(item.sellingPrice || 0);
      const discount = Number(item.discount || 0);
      return sum + Math.max(0, price - discount);
    }, 0);
    return itemsTotal + Number(shippingChargeValue || 0) + Number(additionalChargeValue || 0);
  })();

  const allocatedPaymentTotal = (initialPaymentsValue || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const computedPaymentStatus = (() => {
    if (allocatedPaymentTotal >= computedInvoiceTotal - 0.01 && computedInvoiceTotal > 0) return "PAID";
    if (allocatedPaymentTotal > 0) return "PARTIAL";
    return "UNPAID";
  })();

  useEffect(() => {
    if (billingSameAsShipping) {
      form.setValue("billingAddress", shippingAddressValue || "");
    }
  }, [billingSameAsShipping, shippingAddressValue, form]);
  
  const [activeListings, setActiveListings] = useState<
    { inventoryId: string; listings: { id: string; platform: string; listingUrl: string | null }[] }[]
  >([]);

  useEffect(() => {
    async function fetchListings() {
      if (!selectedItems.length) {
        setActiveListings([]);
        return;
      }
      try {
        const results = await Promise.all(
          selectedItems.map(async (selected) => {
            const res = await fetch(`/api/inventory/${selected.inventoryId}/listings`);
            if (!res.ok) {
              return { inventoryId: selected.inventoryId, listings: [] };
            }
            const data = await res.json();
            return { inventoryId: selected.inventoryId, listings: data.activeListings || [] };
          })
        );
        setActiveListings(results);
      } catch {
        setActiveListings([]);
      }
    }
    fetchListings();
  }, [selectedItems]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const {
    fields: paymentFields,
    append: appendPayment,
    remove: removePayment,
    replace: replacePayments,
  } = useFieldArray({
    control: form.control,
    name: "initialPayments",
  });

  useEffect(() => {
    if (autoFillSplitFromSingle && paymentFields.length > 0) {
      replacePayments([]);
    }
  }, [autoFillSplitFromSingle, paymentFields.length, replacePayments]);

  async function onSubmit(data: FormValues) {
    setIsPending(true);
    const formData = new FormData();
    formData.append("items", JSON.stringify(data.items));
    formData.append("platform", data.platform);
    formData.append("saleDate", data.saleDate);
    if (data.customerId) formData.append("customerId", data.customerId);
    if (data.customerName) formData.append("customerName", data.customerName);
    if (data.customerPhone) formData.append("customerPhone", data.customerPhone);
    if (data.customerEmail) formData.append("customerEmail", data.customerEmail);
    if (data.customerAddress) formData.append("customerAddress", data.customerAddress);
    if (data.billingAddress) formData.append("billingAddress", data.billingAddress);
    if (data.customerCity) formData.append("customerCity", data.customerCity);
    if (data.placeOfSupply) formData.append("placeOfSupply", data.placeOfSupply);
    if (data.shippingAddress) formData.append("shippingAddress", data.shippingAddress);
    formData.append("shippingCharge", String(data.shippingCharge || 0));
    formData.append("additionalCharge", String(data.additionalCharge || 0));
    if (data.paymentMode) formData.append("paymentMode", data.paymentMode);
    if (data.singlePaymentReference) formData.append("singlePaymentReference", data.singlePaymentReference);
    if (autoFillSplitFromSingle) {
      if (data.paymentStatus) formData.append("paymentStatus", data.paymentStatus);
    } else {
      formData.append("paymentStatus", computedPaymentStatus);
    }
    if (data.shippingMethod) formData.append("shippingMethod", data.shippingMethod);
    if (data.trackingId) formData.append("trackingId", data.trackingId);
    if (data.remarks) formData.append("remarks", data.remarks);
    formData.append("autoDelistListings", data.autoDelistListings ? "true" : "false");
    formData.append("autoFillSplitFromSingle", data.autoFillSplitFromSingle ? "true" : "false");
    formData.append("initialPayments", JSON.stringify(data.initialPayments || []));
    
    if (quoteId) {
        formData.append("quotationId", quoteId);
    }

    formData.append("invoiceDisplayOptions", JSON.stringify(invoiceOptions));

    try {
        const result = await createSale(null, formData);
        
        if (result && 'success' in result && result.success) {
            toast.success(result.message || "Sale created & invoice generated successfully");
            // Redirect to sales or invoices? Usually Sales list.
            router.push("/sales");
        } else if (result && 'message' in result) {
            toast.error(result.message);
        } else if (result && 'errors' in result) {
            toast.error("Validation failed");
        }
    } catch (error) {
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
          {/* Item & Transaction Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Transaction Details</h3>
            
            <FormField
              control={form.control}
              name="items"
              render={() => (
                <FormItem className="flex flex-col">
                  <FormLabel>Inventory Items</FormLabel>
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between",
                          !fields.length && "text-muted-foreground"
                        )}
                        type="button"
                      >
                        Add Item
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput placeholder="Search inventory..." />
                        <CommandList>
                          <CommandEmpty>No item found.</CommandEmpty>
                          <CommandGroup>
                            {inventoryItems.map((item) => {
                              const isSelected = fields.some((f) => f.inventoryId === item.id);
                              return (
                                <CommandItem
                                  value={`${item.sku} ${item.itemName}`}
                                  key={item.id}
                                  onSelect={() => {
                                    if (!isSelected) {
                                      append({
                                        inventoryId: item.id,
                                        sellingPrice: getItemPrice(item.id),
                                        discount: 0,
                                      });
                                    }
                                    setOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      isSelected ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {item.sku} - {item.itemName}
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {fields.length > 0 && (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="w-[120px]">Price</TableHead>
                      <TableHead className="w-[120px]">Discount</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => {
                      const item = inventoryItems.find(i => i.id === field.inventoryId);
                      if (!item) return null;
                      return (
                        <TableRow key={field.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">{item.itemName}</span>
                              <span className="text-xs text-muted-foreground">{item.sku}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.sellingPrice`}
                              render={({ field: priceField }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input type="number" {...priceField} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.discount`}
                              render={({ field: discountField }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input type="number" {...discountField} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => remove(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="saleDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sale Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="platform"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Platform</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select platform" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                          <SelectItem value="WEBSITE">Website</SelectItem>
                          <SelectItem value="EBAY">eBay</SelectItem>
                          <SelectItem value="ETSY">Etsy</SelectItem>
                          <SelectItem value="INSTAGRAM">Instagram</SelectItem>
                          <SelectItem value="OFFLINE">Offline / Walk-in</SelectItem>
                          <SelectItem value="OTHERS">Others</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

            {activeListings.some(entry => entry.listings.length > 0) && (
              <div className="border rounded-md p-3 bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100 border-amber-200 dark:border-amber-800 text-sm space-y-2">
                <div className="font-semibold">
                  Some selected items are currently listed on other platforms:
                </div>
                <ul className="list-disc list-inside">
                  {activeListings.flatMap((entry) => {
                    const item = inventoryItems.find(i => i.id === entry.inventoryId);
                    return entry.listings.map((listing) => (
                      <li key={listing.id}>
                        {item ? `${item.sku} - ${item.itemName}` : entry.inventoryId} ({listing.platform})
                        {listing.listingUrl ? (
                          <>
                            {" "}
                            -{" "}
                            <a
                              href={listing.listingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline"
                            >
                              View listing
                            </a>
                          </>
                        ) : null}
                      </li>
                    ));
                  })}
                </ul>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={autoDelist}
                    onChange={(e) =>
                      form.setValue(
                        "autoDelistListings",
                        e.target.checked,
                        { shouldDirty: true }
                      )
                    }
                  />
                  <span>
                    After recording this sale, mark all these listings as
                    DELISTED
                  </span>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
                {autoFillSplitFromSingle ? (
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
                            <SelectItem value="UPI">UPI</SelectItem>
                            <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                            <SelectItem value="CASH">Cash</SelectItem>
                            <SelectItem value="CREDIT_NOTE">Credit Note</SelectItem>
                            <SelectItem value="PAYPAL">PayPal</SelectItem>
                            <SelectItem value="CC">Credit Card</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <div className="rounded-md border px-3 py-2 text-sm">
                    <div className="text-xs text-muted-foreground">Payment Mode</div>
                    <div className="font-semibold">Auto from split rows</div>
                  </div>
                )}
                {autoFillSplitFromSingle ? (
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
                            <SelectItem value="UNPAID">Pending</SelectItem>
                            <SelectItem value="PARTIAL">Partial</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <div className="rounded-md border px-3 py-2 text-sm">
                    <div className="text-xs text-muted-foreground">Status (Auto)</div>
                    <div className="font-semibold">{computedPaymentStatus}</div>
                  </div>
                )}
            </div>

            {autoFillSplitFromSingle && form.watch("paymentMode") === "CREDIT_NOTE" && (
              <FormField
                control={form.control}
                name="singlePaymentReference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credit Note Code</FormLabel>
                    <FormControl>
                      <Input placeholder="CN23-8492" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="rounded-md border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Initial Payments (Multi-payment)</p>
                  <p className="text-xs text-muted-foreground">
                    Total: {computedInvoiceTotal.toFixed(2)} | Allocated: {allocatedPaymentTotal.toFixed(2)} | Pending: {Math.max(0, computedInvoiceTotal - allocatedPaymentTotal).toFixed(2)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    appendPayment({
                      amount: 0,
                      method: form.getValues("paymentMode") || "UPI",
                      date: form.getValues("saleDate"),
                      reference: "",
                      notes: "",
                    })
                  }
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Payment
                </Button>
              </div>

              <FormField
                control={form.control}
                name="autoFillSplitFromSingle"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
                    </FormControl>
                    <FormLabel className="text-sm font-normal">
                      Auto-fill split from single payment fields
                    </FormLabel>
                    <Badge variant="secondary" className="ml-2">
                      {autoFillSplitFromSingle ? "Single-payment mode" : "Split-payment mode"}
                    </Badge>
                  </FormItem>
                )}
              />

              {autoFillSplitFromSingle ? (
                <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  Using single-payment mode. Split rows are hidden for cleaner entry.  
                  Keep this ON to use Payment Mode + Status flow, or turn OFF to record manual split payments.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Amount</TableHead>
                      <TableHead className="w-[160px]">Method</TableHead>
                      <TableHead className="w-[150px]">Date</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentFields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`initialPayments.${index}.amount`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input type="number" step="0.01" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`initialPayments.${index}.method`}
                            render={({ field }) => (
                              <FormItem>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Method" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="UPI">UPI</SelectItem>
                                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                                    <SelectItem value="CASH">Cash</SelectItem>
                                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                                    <SelectItem value="CREDIT_NOTE">Credit Note</SelectItem>
                                    <SelectItem value="OTHER">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`initialPayments.${index}.date`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`initialPayments.${index}.reference`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input placeholder="Txn Ref / CN Code" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removePayment(index)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>

          {/* Customer & Shipping */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Customer & Shipping</h3>
            
              <FormItem>
                <FormLabel>Existing Customer</FormLabel>
                <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between"
                    >
                      {(() => {
                        const name = form.getValues("customerName");
                        const phone = form.getValues("customerPhone");
                        if (!name) {
                          return "Select existing customer";
                        }
                        const displayPhone = phone ? ` | ${phone}` : "";
                        return `${name}${displayPhone}`;
                      })()}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput placeholder="Search customer..." />
                      <CommandList>
                        <CommandEmpty>No customer found.</CommandEmpty>
                        <CommandGroup className="max-h-[300px] overflow-auto">
                          {existingCustomers.map((customer) => (
                            <CommandItem
                              key={customer.id}
                              value={`${customer.name} ${customer.phone || ""} ${customer.email || ""}`}
                              onSelect={() => {
                                form.setValue("customerId", customer.id);
                                form.setValue("customerName", customer.name);
                                form.setValue("customerPhone", customer.phone || "");
                                form.setValue("customerEmail", customer.email || "");
                                const addressParts = [
                                  customer.address,
                                  [customer.city, customer.state, customer.country].filter(Boolean).join(", "),
                                  customer.pincode ? `Pincode: ${customer.pincode}` : "",
                                ].filter(Boolean).join("\n");
                                form.setValue("customerAddress", addressParts);
                                form.setValue("billingAddress", addressParts);
                                form.setValue("customerCity", customer.city || "");
                                form.setValue("placeOfSupply", customer.city || "");
                                form.setValue("shippingAddress", addressParts);
                                setCustomerOpen(false);
                              }}
                            >
                              <div className="flex flex-col">
                                <span>{customer.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {customer.phone || ""}
                                  {customer.phone && customer.email ? " · " : ""}
                                  {customer.email || ""}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </FormItem>

            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="John Doe"
                      {...field}
                      onChange={(e) => {
                        form.setValue("customerId", "");
                        field.onChange(e);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="customerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+91..." type="tel" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="email@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

            <FormField
              control={form.control}
              name="billingAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Billing Address</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Billing address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customerCity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="City" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="placeOfSupply"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Place of Supply</FormLabel>
                    <FormControl>
                      <Input placeholder="Place of supply" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="billingSameAsShipping"
                checked={billingSameAsShipping}
                onCheckedChange={(value) => setBillingSameAsShipping(Boolean(value))}
              />
              <Label htmlFor="billingSameAsShipping">Billing same as Shipping</Label>
            </div>

            <FormField
              control={form.control}
              name="shippingAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shipping Address</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Shipping address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="shippingMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shipping Via</FormLabel>
                      <FormControl>
                        <Input placeholder="DHL / FedEx" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="trackingId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tracking ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Tracking #" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="shippingCharge"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shipping Charges</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="additionalCharge"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Charges</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
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
                    <Textarea placeholder="Any notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="border rounded-md p-4 bg-muted/20 space-y-4">
              <h3 className="font-medium">Invoice Display Options</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {Object.entries(invoiceOptions).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`inv-${key}`} 
                      checked={value} 
                      onCheckedChange={(c) => setInvoiceOptions(prev => ({ ...prev, [key]: !!c }))} 
                    />
                    <Label htmlFor={`inv-${key}`} className="cursor-pointer font-normal">
                      {fieldLabels[key] || key}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Submit Button */}
        <div className="hidden md:block">
            <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Process Sale & Generate Invoice
            </Button>
        </div>

        {/* Mobile Sticky Action Bar */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-background border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-40">
            <Button type="submit" className="w-full" size="lg" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Process Sale
            </Button>
        </div>
      </form>
    </Form>
  );
}
