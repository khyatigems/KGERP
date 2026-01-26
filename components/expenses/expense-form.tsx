"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { expenseSchema, type ExpenseFormValues } from "@/app/(dashboard)/expenses/schema";
import { createExpense, updateExpense } from "@/app/(dashboard)/expenses/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExpenseFormProps {
  categories: { id: string; name: string; gstAllowed: boolean }[];
  initialData?: any; // Type strictly if possible
}

export function ExpenseForm({ categories, initialData }: ExpenseFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isPending, setIsPending] = useState(false);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema) as any,
    defaultValues: initialData ? {
        expenseDate: new Date(initialData.expenseDate),
        categoryId: initialData.categoryId,
        description: initialData.description,
        vendorName: initialData.vendorName ?? "",
        referenceNo: initialData.referenceNo ?? "",
        baseAmount: initialData.baseAmount ?? 0,
        gstApplicable: initialData.gstApplicable === true,
        gstRate: initialData.gstRate ?? 0,
        gstAmount: initialData.gstAmount ?? 0,
        totalAmount: initialData.totalAmount ?? 0,
        paymentMode: initialData.paymentMode,
        paymentStatus: initialData.paymentStatus,
        paidAmount: initialData.paidAmount ?? 0,
        paymentDate: initialData.paymentDate ? new Date(initialData.paymentDate) : undefined,
        paymentRef: initialData.paymentRef ?? "",
        attachmentUrl: initialData.attachmentUrl ?? "",
    } : {
        expenseDate: new Date(),
        categoryId: "",
        description: "",
        vendorName: "",
        referenceNo: "",
        baseAmount: 0,
        gstApplicable: false,
        gstRate: 0,
        gstAmount: 0,
        totalAmount: 0,
        paymentMode: "CASH",
        paymentStatus: "PAID",
        paidAmount: 0,
        paymentDate: new Date(),
        paymentRef: "",
        attachmentUrl: "",
    },
  });

  const { watch, setValue } = form;
  const baseAmount = watch("baseAmount");
  const gstApplicable = watch("gstApplicable");
  const gstRate = watch("gstRate");
  const paymentStatus = watch("paymentStatus");
  const categoryId = watch("categoryId");

  // Auto-calculate Total Amount
  const calculateTotal = () => {
    let total = Number(baseAmount) || 0;
    let gst = 0;
    if (gstApplicable && gstRate) {
        gst = (total * gstRate) / 100;
        total += gst;
    }
    setValue("gstAmount", gst);
    setValue("totalAmount", total);
    
    // Auto-fill paid amount if PAID
    if (paymentStatus === "PAID") {
        setValue("paidAmount", total);
    }
  };

  async function onSubmit(data: ExpenseFormValues) {
    setIsPending(true);
    try {
        let result;
        if (initialData) {
            result = await updateExpense(initialData.id, data);
        } else {
            result = await createExpense(data);
        }

        if (result.success) {
            toast.success(initialData ? "Expense updated" : "Expense created");
            router.push("/expenses");
        } else {
            toast.error(result.error ? JSON.stringify(result.error) : "Failed to save expense");
        }
    } catch (error) {
        toast.error("An error occurred");
        console.error(error);
    } finally {
        setIsPending(false);
    }
  }

  const selectedCategory = categories.find(c => c.id === categoryId);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Step 1: Expense Details */}
        <div className={cn("space-y-4", step !== 1 && "hidden")}>
           <Card>
             <CardHeader>
               <CardTitle>Expense Details</CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
               <FormField
                 control={form.control}
                 name="expenseDate"
                 render={({ field }) => (
                   <FormItem className="flex flex-col">
                     <FormLabel>Date</FormLabel>
                     <Popover>
                       <PopoverTrigger asChild>
                         <FormControl>
                           <Button
                             variant={"outline"}
                             className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                           >
                             {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                             <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                           </Button>
                         </FormControl>
                       </PopoverTrigger>
                       <PopoverContent className="w-auto p-0" align="start">
                         <Calendar
                           mode="single"
                           selected={field.value}
                           onSelect={field.onChange}
                           disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                           initialFocus
                         />
                       </PopoverContent>
                     </Popover>
                     <FormMessage />
                   </FormItem>
                 )}
               />

               <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expense Category</FormLabel>
                    <Select
                      onValueChange={field.onChange} defaultValue={field.value}>
                       <FormControl>
                         <SelectTrigger>
                           <SelectValue placeholder="Select Category" />
                         </SelectTrigger>
                       </FormControl>
                       <SelectContent>
                         {categories.map((c) => (
                           <SelectItem key={c.id} value={c.id}>
                             {c.name}
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
                 name="description"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Description</FormLabel>
                     <FormControl>
                       <Input placeholder="Rent for Jan 2026" {...field} />
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />

               <FormField
                 control={form.control}
                 name="vendorName"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Vendor (Optional)</FormLabel>
                     <FormControl>
                       <Input placeholder="Landlord Name" {...field} />
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />
               
               <Button type="button" className="w-full" onClick={() => setStep(2)}>Next: Amount</Button>
             </CardContent>
           </Card>
        </div>

        {/* Step 2: Amount & Tax */}
        <div className={cn("space-y-4", step !== 2 && "hidden")}>
          <Card>
            <CardHeader>
              <CardTitle>Amount & Tax</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="baseAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (Excl. Tax)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => {
                            field.onChange(e);
                            setTimeout(calculateTotal, 0);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedCategory?.gstAllowed && (
                  <FormField
                    control={form.control}
                    name="gstApplicable"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => {
                                field.onChange(checked);
                                setTimeout(calculateTotal, 0);
                            }}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            GST Applicable
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
              )}

              {gstApplicable && (
                  <FormField
                    control={form.control}
                    name="gstRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GST Rate (%)</FormLabel>
                        <Select 
                            onValueChange={(val) => {
                                field.onChange(val);
                                setTimeout(calculateTotal, 0);
                            }} 
                            value={String(field.value)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Rate" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="5">5%</SelectItem>
                            <SelectItem value="12">12%</SelectItem>
                            <SelectItem value="18">18%</SelectItem>
                            <SelectItem value="28">28%</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              )}

              <div className="pt-4 border-t">
                  <div className="flex justify-between text-lg font-bold">
                      <span>Total Amount</span>
                      <span>{form.watch("totalAmount").toFixed(2)}</span>
                  </div>
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
                <Button type="button" className="flex-1" onClick={() => setStep(3)}>Next: Payment</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Step 3: Payment */}
        <div className={cn("space-y-4", step !== 3 && "hidden")}>
          <Card>
             <CardHeader>
               <CardTitle>Payment Details</CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
               <FormField
                 control={form.control}
                 name="paymentStatus"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Payment Status</FormLabel>
                     <Select 
                        onValueChange={(val) => {
                            field.onChange(val);
                            if (val === "PAID") {
                                setValue("paidAmount", form.watch("totalAmount"));
                            }
                        }} 
                        defaultValue={field.value}
                     >
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
                         <SelectItem value="CASH">Cash</SelectItem>
                         <SelectItem value="UPI">UPI</SelectItem>
                         <SelectItem value="BANK">Bank Transfer</SelectItem>
                         <SelectItem value="CARD">Card</SelectItem>
                         <SelectItem value="WALLET">Wallet</SelectItem>
                       </SelectContent>
                     </Select>
                     <FormMessage />
                   </FormItem>
                 )}
               />

               {paymentStatus !== "PENDING" && (
                   <FormField
                     control={form.control}
                     name="paidAmount"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Paid Amount</FormLabel>
                         <FormControl>
                           <Input type="number" {...field} />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
               )}

               <FormField
                 control={form.control}
                 name="referenceNo"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Reference / Transaction ID</FormLabel>
                     <FormControl>
                       <Input placeholder="Optional" {...field} />
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />

               <div className="flex gap-2">
                 <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(2)}>Back</Button>
                 <Button type="submit" className="flex-1" disabled={isPending}>
                    {isPending ? <Loader2 className="animate-spin" /> : "Save Expense"}
                 </Button>
               </div>
             </CardContent>
          </Card>
        </div>
      </form>
    </Form>
  );
}
