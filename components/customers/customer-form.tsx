"use client";

import { useForm, type Resolver } from "react-hook-form";
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
  // International fields
  countryCode: z.string().optional(),
  isInternational: z.boolean().default(false),
  passportId: z.string().optional(),
  companyName: z.string().optional(),
  addressType: z.enum(["RESIDENTIAL", "COMMERCIAL"]).default("RESIDENTIAL"),
  phoneCountryCode: z.string().optional(),
  pan: z.string().optional(),
  gstin: z.string().optional(),
  notes: z.string().optional(),
  customerType: z.string().optional(),
  assignedSalesperson: z.string().optional(),
  interestedIn: z.string().optional(),
  budgetRange: z.string().optional(),
  whatsappNumber: z.string().optional(),
  preferredContact: z.string().optional(),
  dateOfBirth: z.string().optional(),
  anniversaryDate: z.string().optional(),
  communicationOptIn: z.string().optional(),
  preferredLanguage: z.string().optional(),
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
  // International fields
  countryCode?: string | null;
  isInternational?: boolean | null;
  passportId?: string | null;
  companyName?: string | null;
  addressType?: string | null;
  phoneCountryCode?: string | null;
  pan?: string | null;
  gstin?: string | null;
  notes?: string | null;
  customerType?: string | null;
  assignedSalesperson?: string | null;
  interestedIn?: string | null;
  budgetRange?: string | null;
  whatsappNumber?: string | null;
  preferredContact?: string | null;
  dateOfBirth?: string | null;
  anniversaryDate?: string | null;
  communicationOptIn?: boolean | null;
  preferredLanguage?: string | null;
};

export function CustomerForm({ customer }: { customer?: CustomerModel }) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
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
      // International fields
      countryCode: customer?.countryCode || "",
      isInternational: Boolean(customer?.isInternational ?? false),
      passportId: customer?.passportId || "",
      companyName: customer?.companyName || "",
      addressType: (customer?.addressType as "RESIDENTIAL" | "COMMERCIAL") || "RESIDENTIAL",
      phoneCountryCode: customer?.phoneCountryCode || "+91",
      pan: customer?.pan || "",
      gstin: customer?.gstin || "",
      notes: customer?.notes || "",
      customerType: customer?.customerType || "Retail",
      assignedSalesperson: customer?.assignedSalesperson || "",
      interestedIn: customer?.interestedIn || "",
      budgetRange: customer?.budgetRange || "",
      whatsappNumber: customer?.whatsappNumber || "",
      preferredContact: customer?.preferredContact || "",
      dateOfBirth: customer?.dateOfBirth ? String(customer.dateOfBirth).slice(0, 10) : "",
      anniversaryDate: customer?.anniversaryDate ? String(customer.anniversaryDate).slice(0, 10) : "",
      communicationOptIn: customer?.communicationOptIn === false ? "0" : "1",
      preferredLanguage: customer?.preferredLanguage || "en",
    },
  });

  async function onSubmit(values: FormValues) {
    setIsPending(true);
    // Client-side duplicate prevention by phone
    try {
      const phone = (values.phone || "").trim().replace(/[^\d+]/g, "");
      if (phone) {
        const qs = new URLSearchParams({ phone });
        if (customer?.id) qs.set("excludeId", customer.id);
        const res = await fetch(`/api/customers/exists?${qs.toString()}`);
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

        {/* International Fields Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">International Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      // Auto-set international flag if not India
                      const isInternational = value !== "India";
                      form.setValue("isInternational", isInternational, { shouldDirty: true });
                      // Auto-set country code
                      if (value === "United States") form.setValue("phoneCountryCode", "+1");
                      else if (value === "United Kingdom") form.setValue("phoneCountryCode", "+44");
                      else if (value === "United Arab Emirates") form.setValue("phoneCountryCode", "+971");
                      else if (value === "Singapore") form.setValue("phoneCountryCode", "+65");
                      else if (value === "Australia") form.setValue("phoneCountryCode", "+61");
                      else if (value === "Canada") form.setValue("phoneCountryCode", "+1");
                      else if (value === "Germany") form.setValue("phoneCountryCode", "+49");
                      else if (value === "France") form.setValue("phoneCountryCode", "+33");
                      else if (value === "Italy") form.setValue("phoneCountryCode", "+39");
                      else if (value === "Japan") form.setValue("phoneCountryCode", "+81");
                      else if (value === "China") form.setValue("phoneCountryCode", "+86");
                      else if (value === "India") form.setValue("phoneCountryCode", "+91");
                    }} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="India">India</SelectItem>
                        <SelectItem value="United States">United States</SelectItem>
                        <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                        <SelectItem value="United Arab Emirates">United Arab Emirates</SelectItem>
                        <SelectItem value="Singapore">Singapore</SelectItem>
                        <SelectItem value="Australia">Australia</SelectItem>
                        <SelectItem value="Canada">Canada</SelectItem>
                        <SelectItem value="Germany">Germany</SelectItem>
                        <SelectItem value="France">France</SelectItem>
                        <SelectItem value="Italy">Italy</SelectItem>
                        <SelectItem value="Japan">Japan</SelectItem>
                        <SelectItem value="China">China</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phoneCountryCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Country Code</FormLabel>
                    <FormControl>
                      <Input placeholder="+91" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isInternational"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="mt-0.5"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>International Customer</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Mark if customer is outside India for export compliance
                    </p>
                  </div>
                </FormItem>
              )}
            />

            {form.watch("isInternational") && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="passportId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Passport / ID Number (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Passport or ID number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="addressType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="RESIDENTIAL">Residential</SelectItem>
                            <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Company or organization name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Hide PAN/GSTIN for international customers */}
            {!form.watch("isInternational") && (
              <div className="space-y-4">
                <h4 className="text-md font-medium">Tax Information (India Only)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>
            )}
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
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="anniversaryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Anniversary Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="communicationOptIn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Communication Opt-In</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || "1"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select option" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">Yes</SelectItem>
                        <SelectItem value="0">No</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="preferredLanguage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Language</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || "en"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="hi">Hindi</SelectItem>
                        <SelectItem value="gu">Gujarati</SelectItem>
                      </SelectContent>
                    </Select>
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
