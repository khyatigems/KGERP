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
import { createQuotation } from "@/app/(dashboard)/quotes/actions";
import { Inventory } from "@prisma/client";

const formSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerMobile: z.string().optional(),
  customerEmail: z.string().email().optional().or(z.literal("")),
  customerCity: z.string().optional(),
  expiryDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date",
  }),
  itemIds: z.array(z.string()).min(1, "Select at least one item"),
});

type FormValues = z.infer<typeof formSchema>;

interface QuotationFormProps {
  availableItems: Inventory[];
}

export function QuotationForm({ availableItems }: QuotationFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [open, setOpen] = useState(false);

  // Default expiry: 7 days from now
  const defaultExpiry = new Date();
  defaultExpiry.setDate(defaultExpiry.getDate() + 7);
  const defaultExpiryStr = defaultExpiry.toISOString().split("T")[0];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: "",
      customerMobile: "",
      customerEmail: "",
      customerCity: "",
      expiryDate: defaultExpiryStr,
      itemIds: [],
    },
  });

  const selectedItemIds = form.watch("itemIds");

  const toggleItem = (itemId: string) => {
    const current = form.getValues("itemIds");
    if (current.includes(itemId)) {
      form.setValue(
        "itemIds",
        current.filter((id) => id !== itemId)
      );
    } else {
      form.setValue("itemIds", [...current, itemId]);
    }
  };

  async function onSubmit(data: FormValues) {
    setIsPending(true);
    const formData = new FormData();
    formData.append("customerName", data.customerName);
    if (data.customerMobile) formData.append("customerMobile", data.customerMobile);
    if (data.customerEmail) formData.append("customerEmail", data.customerEmail);
    if (data.customerCity) formData.append("customerCity", data.customerCity);
    formData.append("expiryDate", data.expiryDate);
    // Append itemIds as JSON string to handle array easily in server action
    formData.append("itemIds", JSON.stringify(data.itemIds));

    try {
        await createQuotation(null, formData);
    } catch (error) {
        console.error(error);
    } finally {
        setIsPending(false);
    }
  }

  // Calculate total of selected items
  const selectedItems = availableItems.filter((item) =>
    selectedItemIds.includes(item.id)
  );
  
  const totalAmount = selectedItems.reduce((sum, item) => {
    const price =
      item.pricingMode === "PER_CARAT"
        ? (item.sellingRatePerCarat || 0) * item.weightValue
        : item.flatSellingPrice || 0;
    return sum + price;
  }, 0);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Customer Details</h3>
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
                    <Input placeholder="+91 9876543210" {...field} />
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
              name="itemIds"
              render={() => (
                <FormItem className="flex flex-col">
                  <FormLabel>Items</FormLabel>
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !selectedItemIds.length && "text-muted-foreground"
                          )}
                        >
                          {selectedItemIds.length > 0
                            ? `${selectedItemIds.length} items selected`
                            : "Select items"}
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
                                const price = item.pricingMode === "PER_CARAT"
                                    ? (item.sellingRatePerCarat || 0) * item.weightValue
                                    : item.flatSellingPrice || 0;
                                
                                return (
                                  <CommandItem
                                    value={`${item.sku} ${item.itemName}`}
                                    key={item.id}
                                    onSelect={() => {
                                      toggleItem(item.id);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedItemIds.includes(item.id)
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    <div className="flex flex-col">
                                        <span>{item.sku} - {item.itemName}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {formatCurrency(price)} | {item.weightValue} {item.weightUnit}
                                        </span>
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

            <div className="rounded-md border p-4 space-y-4">
                <div className="font-medium text-sm text-muted-foreground">Selected Items Summary</div>
                {selectedItems.length === 0 ? (
                    <div className="text-sm text-center py-4 text-muted-foreground">No items selected</div>
                ) : (
                    <div className="space-y-2">
                        {selectedItems.map(item => {
                            const price = item.pricingMode === "PER_CARAT"
                                ? (item.sellingRatePerCarat || 0) * item.weightValue
                                : item.flatSellingPrice || 0;
                            return (
                                <div key={item.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                                    <div className="flex flex-col">
                                        <span className="font-medium">{item.sku}</span>
                                        <span className="text-xs text-muted-foreground">{item.itemName}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span>{formatCurrency(price)}</span>
                                        <Button 
                                            size="icon" 
                                            variant="ghost" 
                                            className="h-6 w-6"
                                            onClick={() => toggleItem(item.id)}
                                            type="button" // Prevent submit
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t font-bold">
                    <span>Total Amount</span>
                    <span>{formatCurrency(totalAmount)}</span>
                </div>
            </div>
          </div>
        </div>

        <Button type="submit" disabled={isPending || selectedItemIds.length === 0}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Generate Quotation
        </Button>
      </form>
    </Form>
  );
}
