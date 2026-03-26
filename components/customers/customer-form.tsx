"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { createCustomer, updateCustomer } from "@/app/(dashboard)/customers/actions";

const phoneSchema = z
  .string()
  .optional()
  .or(z.literal(""))
  .refine((val) => {
    if (!val) return true;
    const digits = val.replace(/[^\d]/g, "");
    return digits.length >= 7 && digits.length <= 15;
  }, "Invalid phone number");

const formSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: phoneSchema,
  phoneSecondary: phoneSchema,
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  pincode: z.string().optional().or(z.literal("")).refine((v) => {
    if (!v) return true;
    return /^[0-9A-Za-z-]{4,10}$/.test(v);
  }, "Invalid pincode"),
  pan: z.string().optional(),
  gstin: z.string().optional(),
  notes: z.string().optional(),
  customerType: z.string().optional(),
  assignedSalesperson: z.string().optional(),
  interestedIn: z.string().optional(),
  budgetRange: z.string().optional(),
  whatsappNumber: z.string().optional(),
  preferredContact: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type CustomerModel = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  phoneSecondary?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  pan?: string | null;
  gstin?: string | null;
  notes?: string | null;
  customerType?: string | null;
  assignedSalesperson?: string | null;
  interestedIn?: string | null;
  budgetRange?: string | null;
  whatsappNumber?: string | null;
  preferredContact?: string | null;
};

export function CustomerForm({ customer }: { customer?: CustomerModel }) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: customer?.name || "",
      email: customer?.email || "",
      phone: customer?.phone || "",
      phoneSecondary: customer?.phoneSecondary || "",
      address: customer?.address || "",
      city: customer?.city || "",
      state: customer?.state || "",
      country: customer?.country || "",
      pincode: customer?.pincode || "",
      pan: customer?.pan || "",
      gstin: customer?.gstin || "",
      notes: customer?.notes || "",
      customerType: customer?.customerType || "Retail",
      assignedSalesperson: customer?.assignedSalesperson || "",
      interestedIn: customer?.interestedIn || "",
      budgetRange: customer?.budgetRange || "",
      whatsappNumber: customer?.whatsappNumber || "",
      preferredContact: customer?.preferredContact || "",
    },
  });

  async function onSubmit(values: FormValues) {
    setIsPending(true);
    // Client-side duplicate prevention by phone
    try {
      const phone = (values.phone || "").trim();
      if (phone) {
        const res = await fetch(`/api/customers/exists?phone=${encodeURIComponent(phone)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.exists) {
            toast.error("A customer with this mobile already exists. Please search and edit the existing record.");
            setIsPending(false);
            return;
          }
        }
      }
    } catch {}
    const fd = new FormData();
    Object.entries(values).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      fd.append(k, String(v));
    });

    try {
      const res = customer ? await updateCustomer(customer.id, null, fd) : await createCustomer(null, fd);
      if (res && (res as { success?: boolean }).success) {
        toast.success(customer ? "Customer updated" : "Customer created");
        router.push("/customers");
      } else if (res && (res as { message?: string }).message) {
        toast.error((res as { message: string }).message);
      } else if (res && (res as { errors?: Record<string, string[]> }).errors) {
        toast.error("Validation failed");
      } else {
        toast.error("Failed to save customer");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to save customer");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Contact</h3>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Customer Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+91 9876543210" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phoneSecondary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Secondary Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+91 9XXXXXXXXX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="customer@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Address</h3>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Postal Address</FormLabel>
                  <FormControl>
                    <Textarea placeholder="House, street, area" className="min-h-[90px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
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
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input placeholder="State" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input placeholder="Country" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pincode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pincode</FormLabel>
                    <FormControl>
                      <Input placeholder="244001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Business (Optional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customerType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || "Retail"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Retail">Retail</SelectItem>
                        <SelectItem value="Dealer">Dealer</SelectItem>
                        <SelectItem value="Export">Export</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="assignedSalesperson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned Salesperson</FormLabel>
                    <FormControl>
                      <Input placeholder="Salesperson Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PAN</FormLabel>
                    <FormControl>
                      <Input placeholder="ABCDE1234F" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gstin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GSTIN</FormLabel>
                    <FormControl>
                      <Input placeholder="09AAJCK8115C1ZL" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <h3 className="text-lg font-medium mt-6">Intelligence & Comms</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="whatsappNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+91 9876543210" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="preferredContact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Contact</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                        <SelectItem value="Call">Call</SelectItem>
                        <SelectItem value="Email">Email</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="budgetRange"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget Range</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select budget" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Low">Low (&lt; ₹50k)</SelectItem>
                        <SelectItem value="Medium">Medium (₹50k - ₹2L)</SelectItem>
                        <SelectItem value="High">High (&gt; ₹2L)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="interestedIn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interested In</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Ruby, Emerald, Diamond" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Notes</h3>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Info</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any extra contact information or notes..." className="min-h-[90px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Button type="submit" disabled={isPending} className="transition-all duration-200 hover:scale-105 active:scale-95">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {customer ? "Update Customer" : "Create Customer"}
        </Button>
      </form>
    </Form>
  );
}
