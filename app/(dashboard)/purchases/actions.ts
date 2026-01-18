"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

const purchaseItemSchema = z.object({
  itemName: z.string().min(1, "Item name required"),
  category: z.string().optional(),
  shape: z.string().optional(),
  beadSizeMm: z.coerce.number().optional(),
  weightType: z.string().default("cts"),
  quantity: z.coerce.number().positive(),
  costPerUnit: z.coerce.number().min(0),
  totalCost: z.coerce.number().min(0),
  remarks: z.string().optional(),
});

const purchaseSchema = z.object({
  vendorId: z.string().uuid("Vendor required"),
  purchaseDate: z.coerce.date(),
  invoiceNo: z.string().optional(),
  paymentMode: z.string().optional(),
  paymentStatus: z.string().optional(),
  remarks: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, "Add at least one item"),
});

export async function createPurchase(prevState: unknown, formData: FormData) {
  const session = await auth();
  if (!session) {
    return { message: "Unauthorized" };
  }

  const raw = Object.fromEntries(formData.entries());
  
  // Handle items array from JSON string
  let items = [];
  try {
      if (typeof raw.items === 'string') {
          items = JSON.parse(raw.items);
      }
  } catch (e) {
      console.error("Failed to parse items", e);
      return { message: "Invalid items data" };
  }

  const payload = { ...raw, items };
  const parsed = purchaseSchema.safeParse(payload);

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  try {
    await prisma.purchase.create({
      data: {
        vendorId: data.vendorId,
        purchaseDate: data.purchaseDate,
        invoiceNo: data.invoiceNo,
        paymentMode: data.paymentMode,
        paymentStatus: data.paymentStatus,
        remarks: data.remarks,
        items: {
            create: data.items
        }
      },
    });
  } catch (e) {
    console.error(e);
    return { message: "Failed to create purchase record" };
  }

  revalidatePath("/purchases");
  redirect("/purchases");
}
