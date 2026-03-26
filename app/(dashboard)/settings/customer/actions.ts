"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function saveCustomerSettings(data: { platinumThreshold: number, goldThreshold: number, highValueAov: number }) {
  try {
    await prisma.setting.upsert({
      where: { key: "customer_settings" },
      update: { value: JSON.stringify(data) },
      create: { key: "customer_settings", value: JSON.stringify(data) }
    });
    revalidatePath("/settings/customer");
    revalidatePath("/customers");
    return { success: true };
  } catch {
    return { success: false, message: "Failed to save settings" };
  }
}
