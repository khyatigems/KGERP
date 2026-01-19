"use client";

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect } from "react";
import { Loader2, Check, ChevronsUpDown } from "lucide-react";
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
import { createSale } from "@/app/(dashboard)/sales/actions";
import { Inventory } from "@prisma/client";
import { useSearchParams } from "next/navigation";

const formSchema = z.object({
  inventoryId: z.string().uuid("Please select an item"),
  platform: z.string().min(1, "Platform is required"),
  saleDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date",
  }),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email().optional().or(z.literal("")),
  customerCity: z.string().optional(),
  sellingPrice: z.coerce.number().positive("Selling price must be positive"),
  discount: z.coerce.number().min(0).default(0),
  paymentMode: z.string().optional(),
  paymentStatus: z.string().default("PENDING"),
  shippingMethod: z.string().optional(),
  trackingId: z.string().optional(),
  remarks: z.string().optional(),
  autoDelistListings: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

interface SaleFormProps {
  inventoryItems: Inventory[];
}

export function SaleForm({ inventoryItems }: SaleFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [open, setOpen] = useState(false);
  const searchParams = useSearchParams();
  
  const preSelectedInventoryId = searchParams.get("inventoryId");
  const quoteId = searchParams.get("quoteId");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    defaultValues: {
      inventoryId: preSelectedInventoryId || "",
      platform: "WHATSAPP",
      saleDate: new Date().toISOString().split("T")[0],
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      customerCity: "",
      sellingPrice: 0,
      discount: 0,
      paymentMode: "UPI",
      paymentStatus: "PAID",
      shippingMethod: "COURIER",
      trackingId: "",
      remarks: "",
      autoDelistListings: true,
    },
  });

  // Effect to set price if inventory is selected
  const selectedInventoryId = form.watch("inventoryId");
  const autoDelist = form.watch("autoDelistListings");
  
  useEffect(() => {
    if (selectedInventoryId) {
        const item = inventoryItems.find(i => i.id === selectedInventoryId);
        if (item) {
            let price = 0;
            if (item.pricingMode === "PER_CARAT") {
                price = (item.sellingRatePerCarat || 0) * item.weightValue;
            } else {
                price = item.flatSellingPrice || 0;
            }
            // Only set if not already set or if user hasn't modified it? 
            // For now, let's just default it if it's 0
            if (form.getValues("sellingPrice") === 0) {
                form.setValue("sellingPrice", price);
            }
        }
    }
  }, [selectedInventoryId, inventoryItems, form]);

  const [activeListings, setActiveListings] = useState<
    { id: string; platform: string; listingUrl: string | null }[]
  >([]);

  useEffect(() => {
    async function fetchListings() {
      if (!selectedInventoryId) {
        setActiveListings([]);
        return;
      }
      try {
        const res = await fetch(
          `/api/inventory/${selectedInventoryId}/listings`
        );
        if (!res.ok) {
          setActiveListings([]);
          return;
        }
        const data = await res.json();
        setActiveListings(data.activeListings || []);
      } catch {
        setActiveListings([]);
      }
    }
    fetchListings();
  }, [selectedInventoryId]);

  async function onSubmit(data: FormValues) {
    setIsPending(true);
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });
    
    if (quoteId) {
        formData.append("quotationId", quoteId);
    }

    try {
        await createSale(null, formData);
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
          {/* Item & Transaction Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Transaction Details</h3>
            
            <FormField
              control={form.control}
              name="inventoryId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Inventory Item</FormLabel>
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={!!preSelectedInventoryId}
                        >
                          {field.value
                            ? (() => {
                                const item = inventoryItems.find(
                                  (i) => i.id === field.value
                                );
                                return item ? `${item.sku} - ${item.itemName}` : "Select item";
                              })()
                            : "Select item"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput placeholder="Search inventory..." />
                        <CommandList>
                          <CommandEmpty>No item found.</CommandEmpty>
                          <CommandGroup>
                            {inventoryItems.map((item) => (
                              <CommandItem
                                value={`${item.sku} ${item.itemName}`}
                                key={item.id}
                                onSelect={() => {
                                  form.setValue("inventoryId", item.id);
                                  setOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    item.id === field.value
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {item.sku} - {item.itemName}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="sellingPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Selling Price</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="discount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

            {activeListings.length > 0 && (
              <div className="border rounded-md p-3 bg-yellow-50 text-sm space-y-2">
                <div className="font-semibold">
                  This item is currently listed on other platforms:
                </div>
                <ul className="list-disc list-inside">
                  {activeListings.map((listing) => (
                    <li key={listing.id}>
                      {listing.platform}
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
                  ))}
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
                          <SelectItem value="PAYPAL">PayPal</SelectItem>
                          <SelectItem value="CC">Credit Card</SelectItem>
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
          </div>

          {/* Customer & Shipping */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Customer & Shipping</h3>
            
            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
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
                        <Input placeholder="+91..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customerCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="Mumbai" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

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
          </div>
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Process Sale & Generate Invoice
        </Button>
      </form>
    </Form>
  );
}
