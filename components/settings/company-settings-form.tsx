"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { FileUpload } from "@/components/inventory/file-upload";
import { updateCompanySettings } from "@/app/(dashboard)/settings/company/actions";
import { CompanySettings } from "@prisma/client-custom-v2";

const formSchema = z.object({
  companyName: z.string().min(1, "Company Name is required"),
  logoUrl: z.string().optional(),
  quotationLogoUrl: z.string().optional(),
  skuViewLogoUrl: z.string().optional(),
  invoiceLogoUrl: z.string().optional(),
  otherDocsLogoUrl: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  gstin: z.string().optional(),
});

export function CompanySettingsForm({ initialData }: { initialData?: Partial<CompanySettings> | null }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: initialData?.companyName || "",
      logoUrl: initialData?.logoUrl || "",
      quotationLogoUrl: initialData?.quotationLogoUrl || "",
      invoiceLogoUrl: initialData?.invoiceLogoUrl || "",
      address: initialData?.address || "",
      phone: initialData?.phone || "",
      email: initialData?.email || "",
      website: initialData?.website || "",
      gstin: initialData?.gstin || "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const result = await updateCompanySettings(values);
      if (result.success) {
        toast.success("Company settings updated successfully");
      } else {
        toast.error(result.message || "Failed to update settings");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="logoUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Logo</FormLabel>
              <FormControl>
                <div className="space-y-4">
                  <FileUpload
                    onUploadComplete={(files) => {
                        if (files.length > 0) {
                            field.onChange(files[0].url);
                        }
                    }}
                    defaultFiles={field.value ? [field.value] : []}
                  />
                  <Input type="hidden" {...field} />
                </div>
              </FormControl>
              <FormDescription>
                Upload your company logo (Square format recommended)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="quotationLogoUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quotation Logo</FormLabel>
                <FormControl>
                  <div className="space-y-4">
                    <FileUpload
                      onUploadComplete={(files) => {
                          if (files.length > 0) {
                              field.onChange(files[0].url);
                          }
                      }}
                      defaultFiles={field.value ? [field.value] : []}
                    />
                    <Input type="hidden" {...field} />
                  </div>
                </FormControl>
                <FormDescription>Logo for Quotation PDF</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="skuViewLogoUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SKU View Logo</FormLabel>
                <FormControl>
                  <div className="space-y-4">
                    <FileUpload
                      onUploadComplete={(files) => {
                          if (files.length > 0) {
                              field.onChange(files[0].url);
                          }
                      }}
                      defaultFiles={field.value ? [field.value] : []}
                    />
                    <Input type="hidden" {...field} />
                  </div>
                </FormControl>
                <FormDescription>Logo for SKU Preview Page</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="invoiceLogoUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Invoice Logo</FormLabel>
                <FormControl>
                  <div className="space-y-4">
                    <FileUpload
                      onUploadComplete={(files) => {
                          if (files.length > 0) {
                              field.onChange(files[0].url);
                          }
                      }}
                      defaultFiles={field.value ? [field.value] : []}
                    />
                    <Input type="hidden" {...field} />
                  </div>
                </FormControl>
                <FormDescription>Logo for Invoices</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="otherDocsLogoUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Other Docs Logo</FormLabel>
                <FormControl>
                  <div className="space-y-4">
                    <FileUpload
                      onUploadComplete={(files) => {
                          if (files.length > 0) {
                              field.onChange(files[0].url);
                          }
                      }}
                      defaultFiles={field.value ? [field.value] : []}
                    />
                    <Input type="hidden" {...field} />
                  </div>
                </FormControl>
                <FormDescription>Fallback for other documents</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Inc." {...field} />
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
                    <Input placeholder="GST Number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="contact@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="+91 98765 43210" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea placeholder="123 Main St, City, State" className="min-h-[100px]" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Settings"}
        </Button>
      </form>
    </Form>
  );
}
