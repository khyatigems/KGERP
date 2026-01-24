"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { Loader2, Check, ChevronsUpDown, X } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
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
import { createQuotation, updateQuotation } from "@/app/(dashboard)/quotes/actions";
import { Inventory } from "@prisma/client-custom-v2";
import { useSearchParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const formSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerMobile: z.string().optional(),
  customerEmail: z.string().email().optional().or(z.literal("")),
  customerCity: z.string().optional(),
  expiryDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date",
  }),
  items: z.array(z.object({
    inventoryId: z.string(),
    price: z.number().min(0)
  })).min(1, "Select at least one item"),
});

type FormValues = z.infer<typeof formSchema>;

interface ExistingCustomer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
}

interface QuotationFormProps {
  availableItems: Inventory[];
  existingCustomers?: ExistingCustomer[];
  initialData?: {
    id: string;
    customerName: string | null;
    customerMobile?: string | null;
    customerEmail?: string | null;
    customerCity?: string | null;
    expiryDate: string | Date;
    items?: { inventoryId: string; quotedPrice?: number }[];
  };
}

export function QuotationForm({ availableItems, existingCustomers = [], initialData }: QuotationFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [open, setOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const searchParams = useSearchParams();
  const preSelectedInventoryId = searchParams.get("inventoryId");

  // Default expiry: 7 days from now
  const defaultExpiry = new Date();
  defaultExpiry.setDate(defaultExpiry.getDate() + 7);
  const defaultExpiryStr = defaultExpiry.toISOString().split("T")[0];

  // Helper to get default price for an item
  const getItemPrice = (inventoryId: string) => {
    const item = availableItems.find(i => i.id === inventoryId);
    if (!item) return 0;
    if (item.pricingMode === "PER_CARAT") {
      return (item.sellingRatePerCarat || 0) * (item.weightValue || 0);
    }
    return item.flatSellingPrice || 0;
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: initialData?.customerName || "",
      customerMobile: initialData?.customerMobile || "",
      customerEmail: initialData?.customerEmail || "",
      customerCity: initialData?.customerCity || "",
      expiryDate: initialData?.expiryDate
        ? new Date(initialData.expiryDate).toISOString().split("T")[0]
        : defaultExpiryStr,
      items: initialData?.items
        ? initialData.items.map((i) => ({ 
            inventoryId: i.inventoryId, 
            price: i.quotedPrice ?? getItemPrice(i.inventoryId) 
          }))
        : preSelectedInventoryId
        ? [{ inventoryId: preSelectedInventoryId, price: getItemPrice(preSelectedInventoryId) }]
        : [],
    },
  });

  const selectedItems = form.watch("items");

  const toggleItem = (itemId: string) => {
    const current = form.getValues("items");
    const exists = current.find((i) => i.inventoryId === itemId);
    
    if (exists) {
      form.setValue(
        "items",
        current.filter((i) => i.inventoryId !== itemId)
      );
    } else {
      form.setValue("items", [...current, { inventoryId: itemId, price: getItemPrice(itemId) }]);
    }
  };

  const updateItemPrice = (index: number, price: number) => {
    const current = form.getValues("items");
    const updated = [...current];
    updated[index].price = price;
    form.setValue("items", updated);
  };

  async function onSubmit(data: FormValues, status: "DRAFT" | "ACTIVE") {
    setIsPending(true);
    const formData = new FormData();
    formData.append("customerName", data.customerName);
    if (data.customerMobile) formData.append("customerMobile", data.customerMobile);
    if (data.customerEmail) formData.append("customerEmail", data.customerEmail);
    if (data.customerCity) formData.append("customerCity", data.customerCity);
    formData.append("expiryDate", data.expiryDate);
    formData.append("items", JSON.stringify(data.items));
    formData.append("status", status);

    try {
        if (initialData?.id) {
            await updateQuotation(initialData.id, null, formData);
        } else {
            await createQuotation(null, formData);
        }
    } catch (error) {
        console.error(error);
    } finally {
        setIsPending(false);
    }
  }

  const totalAmount = selectedItems.reduce((sum, item) => sum + item.price, 0);

  return (
    <Form {...form}>
      <form className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Customer Details</h3>
            {existingCustomers.length > 0 && (
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
                        const phone = form.getValues("customerMobile");
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
                                form.setValue("customerName", customer.name);
                                form.setValue("customerMobile", customer.phone || "");
                                form.setValue("customerEmail", customer.email || "");
                                form.setValue("customerCity", customer.city || "");
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
            )}
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
            <FormField
              control={form.control}
              name="customerMobile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile Number</FormLabel>
                  <FormControl>
                    <Input placeholder="+91 9876543210" type="tel" {...field} />
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
                    <Input placeholder="john@example.com" {...field} />
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
             <FormField
              control={form.control}
              name="expiryDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expiry Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Select Items</h3>
            
            <FormField
              control={form.control}
              name="items"
              render={() => (
                <FormItem className="flex flex-col">
                  <FormLabel>Add Item</FormLabel>
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !selectedItems.length && "text-muted-foreground"
                          )}
                        >
                          Select items...
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput placeholder="Search inventory..." />
                        <CommandList>
                          <CommandEmpty>No item found.</CommandEmpty>
                          <CommandGroup className="max-h-[300px] overflow-auto">
                            {availableItems.map((item) => {
                                const isSelected = selectedItems.some(i => i.inventoryId === item.id);
                                return (
                                  <CommandItem
                                    value={`${item.sku} ${item.itemName}`}
                                    key={item.id}
                                    onSelect={() => {
                                      toggleItem(item.id);
                                      setOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        isSelected
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    <div className="flex flex-col">
                                        <span>{item.itemName}</span>
                                        <span className="text-xs text-muted-foreground">{item.sku}</span>
                                    </div>
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

            {selectedItems.length > 0 && (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead className="w-[120px]">Price</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {selectedItems.map((selected, index) => {
                                const item = availableItems.find(i => i.id === selected.inventoryId);
                                if (!item) return null;
                                return (
                                    <TableRow key={selected.inventoryId}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm">{item.itemName}</span>
                                                <span className="text-xs text-muted-foreground">{item.sku}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Input 
                                                type="number" 
                                                value={selected.price} 
                                                onChange={(e) => updateItemPrice(index, parseFloat(e.target.value) || 0)}
                                                className="h-8"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => toggleItem(selected.inventoryId)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                    <div className="p-4 bg-muted/50 flex justify-between items-center font-medium">
                        <span>Total Amount</span>
                        <span>{formatCurrency(totalAmount)}</span>
                    </div>
                </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-4 pb-20 md:pb-0">
            <Button 
                type="button" 
                variant="secondary" 
                disabled={isPending}
                onClick={form.handleSubmit((data) => onSubmit(data, "DRAFT"))}
            >
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Draft
            </Button>
            <Button 
                type="button" 
                disabled={isPending}
                onClick={form.handleSubmit((data) => onSubmit(data, "ACTIVE"))}
            >
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create & Send
            </Button>
        </div>
      </form>
    </Form>
  );
}
