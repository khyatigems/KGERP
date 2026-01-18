"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

const settingsSchema = z.object({
  company_name: z.string().min(1),
  company_phone: z.string().min(1),
  company_email: z.string().email(),
  upi_vpa: z.string().optional(),
  upi_payee_name: z.string().optional(),
  bank_name: z.string().optional(),
  bank_account: z.string().optional(),
  bank_ifsc: z.string().optional(),
  invoice_prefix: z.string().default("KG"),
  quotation_prefix: z.string().default("KGQ"),
});

export async function updateSettings(formData: FormData) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { message: "Unauthorized" };
  }

  const rawData: Record<string, FormDataEntryValue> = {};
  for (const [key, value] of formData.entries()) {
    rawData[key] = value;
  }

  const result = settingsSchema.safeParse(rawData);
  if (!result.success) {
    return { message: "Invalid data" };
  }

  try {
    for (const [key, value] of Object.entries(result.data)) {
        await prisma.setting.upsert({
            where: { key },
            update: { value: String(value || "") },
            create: { key, value: String(value || "") }
        });
    }
  } catch {
    return { message: "Failed to update settings" };
  }

  revalidatePath("/settings");
  return { message: "Settings updated successfully" };
}
