"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { createPurchase } from "@/app/(dashboard)/purchases/actions";

const purchaseItemSchema = z.object({
  itemName: z.string().min(1, "Item name required"),
  category: z.string().optional(),
  shape: z.string().optional(),
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
}

export function PurchaseForm({ vendors }: PurchaseFormProps) {
  const [isPending, setIsPending] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      vendorId: "",
      purchaseDate: new Date().toISOString().split("T")[0],
      invoiceNo: "",
      paymentMode: "BANK_TRANSFER",
      paymentStatus: "PENDING",
      remarks: "",
      items: [
          { 
              itemName: "", 
              quantity: 0, 
              costPerUnit: 0, 
              totalCost: 0, 
              weightType: "cts" 
          }
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Watch items to auto-calc total cost per row if needed?
  // For simplicity, let user input or basic calc could be added.
  
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
        await createPurchase(null, formData);
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
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Purchase Details</h3>
            
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
            
            <div className="border rounded-md divide-y">
                {fields.map((field, index) => (
                    <div key={field.id} className="p-4 grid grid-cols-1 md:grid-cols-6 gap-4 items-end bg-card">
                        <FormField
                          control={form.control}
                          name={`items.${index}.itemName`}
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel className={index !== 0 ? "sr-only" : ""}>Item Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Item Name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={index !== 0 ? "sr-only" : ""}>Qty</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="Qty" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`items.${index}.costPerUnit`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={index !== 0 ? "sr-only" : ""}>Cost/Unit</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="Rate" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                         <FormField
                          control={form.control}
                          name={`items.${index}.totalCost`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={index !== 0 ? "sr-only" : ""}>Total</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="Total" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end pb-1">
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon"
                                onClick={() => remove(index)}
                                disabled={fields.length === 1}
                            >
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
            {form.formState.errors.items && (
                 <p className="text-sm font-medium text-destructive">{form.formState.errors.items.message}</p>
            )}
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Record Purchase
        </Button>
      </form>
    </Form>
  );
}
