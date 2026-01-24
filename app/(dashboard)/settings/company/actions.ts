"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";

const companySettingsSchema = z.object({
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

export async function updateCompanySettings(data: z.infer<typeof companySettingsSchema>) {
  const perm = await checkPermission(PERMISSIONS.SETTINGS_MANAGE);
  if (!perm.success) return { success: false, message: perm.message };

  try {
    const validatedData = companySettingsSchema.parse(data);
    const existing = await prisma.companySettings.findFirst();

    // Sanitize data: Convert empty strings to null for nullable fields
    const sanitizedData = {
      ...validatedData,
      logoUrl: validatedData.logoUrl || null,
      quotationLogoUrl: validatedData.quotationLogoUrl || null,
      skuViewLogoUrl: validatedData.skuViewLogoUrl || null,
      invoiceLogoUrl: validatedData.invoiceLogoUrl || null,
      otherDocsLogoUrl: validatedData.otherDocsLogoUrl || null,
      address: validatedData.address || null,
      phone: validatedData.phone || null,
      email: validatedData.email || null,
      website: validatedData.website || null,
      gstin: validatedData.gstin || null,
    };

    if (existing) {
      await prisma.companySettings.update({
        where: { id: existing.id },
        data: sanitizedData,
      });
    } else {
      await prisma.companySettings.create({
        data: sanitizedData,
      });
    }

    revalidatePath("/settings");
    revalidatePath("/preview/[sku]");
    
    return { success: true };
  } catch (error) {
    console.error("Failed to update company settings:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Failed to update settings" 
    };
  }
}
