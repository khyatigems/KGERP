"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateSku } from "@/lib/sku";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

const inventorySchema = z.object({
  itemName: z.string().min(1, "Item name is required"),
  internalName: z.string().optional(),
  gemType: z.string().min(1, "Gem type is required"),
  shape: z.string().min(1, "Shape is required"),
  dimensionsMm: z.string().optional(),
  weightValue: z.coerce.number().positive("Weight must be positive"),
  weightUnit: z.string(), 
  treatment: z.string().optional(),
  certification: z.string().optional(),
  vendorId: z.string().uuid("Invalid vendor"),
  pricingMode: z.enum(["PER_CARAT", "FLAT"]),
  purchaseRatePerCarat: z.coerce.number().optional(),
  sellingRatePerCarat: z.coerce.number().optional(),
  flatPurchaseCost: z.coerce.number().optional(),
  flatSellingPrice: z.coerce.number().optional(),
  stockLocation: z.string().optional(),
  notes: z.string().optional(),
});

export async function createInventory(prevState: unknown, formData: FormData) {
  const session = await auth();
  if (!session) {
      return { message: "Unauthorized" };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = inventorySchema.safeParse(raw);

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  // Calculate profit logic
  let purchaseCost = 0;
  let sellingPrice = 0;

  if (data.pricingMode === "PER_CARAT") {
      purchaseCost = (data.weightValue) * (data.purchaseRatePerCarat || 0);
      sellingPrice = (data.weightValue) * (data.sellingRatePerCarat || 0);
  } else {
      purchaseCost = data.flatPurchaseCost || 0;
      sellingPrice = data.flatSellingPrice || 0;
  }

  const profit = sellingPrice - purchaseCost;

  try {
      await prisma.$transaction(async (tx) => {
          const sku = await generateSku(tx, {
              categoryCode: "LG", // Default to Loose Gem
              gemType: data.gemType,
              shape: data.shape,
              weight: data.weightValue
          });

          await tx.inventory.create({
              data: {
                  sku,
                  itemName: data.itemName,
                  internalName: data.internalName,
                  gemType: data.gemType,
                  shape: data.shape,
                  dimensionsMm: data.dimensionsMm,
                  weightValue: data.weightValue,
                  weightUnit: data.weightUnit,
                  treatment: data.treatment,
                  certification: data.certification,
                  vendorId: data.vendorId,
                  pricingMode: data.pricingMode,
                  purchaseRatePerCarat: data.purchaseRatePerCarat,
                  sellingRatePerCarat: data.sellingRatePerCarat,
                  flatPurchaseCost: data.flatPurchaseCost,
                  flatSellingPrice: data.flatSellingPrice,
                  profit,
                  status: "IN_STOCK",
                  stockLocation: data.stockLocation,
                  notes: data.notes,
                  createdBy: session?.user?.email || "system",
              }
          });
      });
  } catch (e) {
      console.error(e);
      return { message: "Failed to create inventory" };
  }

  revalidatePath("/inventory");
  redirect("/inventory");
}
