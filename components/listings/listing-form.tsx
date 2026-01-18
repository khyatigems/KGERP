"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { Loader2 } from "lucide-react";
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
import { createListing } from "@/app/(dashboard)/listings/actions";

const formSchema = z.object({
  inventoryId: z.string().uuid("Select an inventory item"),
  platform: z.string().min(1, "Platform is required"),
  listingUrl: z.string().url().optional().or(z.literal("")),
  listingRef: z.string().optional(),
  listedPrice: z.coerce.number().positive("Listed price must be positive"),
  listedDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date",
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface ListingFormProps {
  inventoryItems: { id: string; sku: string; itemName: string }[];
}

export function ListingForm({ inventoryItems }: ListingFormProps) {
  const [isPending, setIsPending] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      inventoryId: "",
      platform: "WHATSAPP",
      listingUrl: "",
      listingRef: "",
      listedPrice: 0,
      listedDate: today,
    },
  });

  async function onSubmit(data: FormValues) {
    setIsPending(true);
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });

    try {
      await createListing(null, formData);
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
            <h3 className="text-lg font-medium">Listing Details</h3>

            <FormField
              control={form.control}
              name="inventoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Inventory Item</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {inventoryItems.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.sku} - {item.itemName}
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
                      <SelectItem value="EBAY">eBay</SelectItem>
                      <SelectItem value="ETSY">Etsy</SelectItem>
                      <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                      <SelectItem value="WEBSITE">KhyatiGems.com</SelectItem>
                      <SelectItem value="AMAZON">Amazon</SelectItem>
                      <SelectItem value="OTHERS">Others</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Meta & Pricing</h3>

            <FormField
              control={form.control}
              name="listingUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Listing URL (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="listingRef"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Listing ID / Reference</FormLabel>
                  <FormControl>
                    <Input placeholder="Platform reference" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="listedPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Listed Price</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="listedDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Listed Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Listing
        </Button>
      </form>
    </Form>
  );
}
