"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateSku } from "@/lib/sku";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";

const inventorySchema = z.object({
  itemName: z.string().min(1, "Item name is required"),
  internalName: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  gemType: z.string().min(1, "Gem type is required"),
  color: z.string().optional(),
  categoryCodeId: z.string().uuid().optional(),
  gemstoneCodeId: z.string().uuid().optional(),
  colorCodeId: z.string().uuid().optional(),
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
  mediaUrl: z.string().url().optional().or(z.literal("")),
});

type InventoryImportRow = {
  itemName?: string;
  internalName?: string;
  categoryCode?: string;
  gemstoneCode?: string;
  colorCode?: string;
  gemType?: string;
  color?: string;
  shape?: string;
  dimensionsMm?: string;
  weightValue?: number | string;
  weightUnit?: string;
  treatment?: string;
  certification?: string;
  vendorName?: string;
  pricingMode?: string;
  purchaseRatePerCarat?: number | string;
  sellingRatePerCarat?: number | string;
  flatPurchaseCost?: number | string;
  flatSellingPrice?: number | string;
  stockLocation?: string;
  notes?: string;
  mediaUrl?: string;
};

async function renameCloudinaryImageToSku(originalUrl: string, sku: string) {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return originalUrl;
    }

    const urlObj = new URL(originalUrl);
    const parts = urlObj.pathname.split("/");
    const uploadIndex = parts.findIndex((p) => p === "upload");
    if (uploadIndex === -1) {
      return originalUrl;
    }

    const afterUpload = parts.slice(uploadIndex + 1);
    const withoutVersion =
      afterUpload[0] && /^v[0-9]+$/.test(afterUpload[0])
        ? afterUpload.slice(1)
        : afterUpload;
    const publicIdWithExt = withoutVersion.join("/");
    const publicId = publicIdWithExt.replace(/\.[^/.]+$/, "");

    if (!publicId) {
      return originalUrl;
    }

    const authHeader = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

    const body = new URLSearchParams({
      from_public_id: publicId,
      to_public_id: sku,
      overwrite: "true",
    });

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${authHeader}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      }
    );

    const result = (await response.json()) as { secure_url?: string };

    if (!response.ok) {
      console.error("Cloudinary rename error:", result);
      return originalUrl;
    }

    if (result.secure_url) {
      return result.secure_url;
    }

    return originalUrl;
  } catch (e) {
    console.error("Cloudinary rename unexpected error:", e);
    return originalUrl;
  }
}

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

  // Calculate Ratti
  // 1 Carat = 1.09 Ratti
  // 1 Gram = 5 Carats = 5.45 Ratti
  let weightRatti = 0;
  if (data.weightUnit === "cts") {
      weightRatti = data.weightValue * 1.09;
  } else if (data.weightUnit === "gms") {
      weightRatti = data.weightValue * 5.45;
  }
  weightRatti = Math.round(weightRatti * 100) / 100;

  try {
      const createdInventory = await prisma.$transaction(async (tx) => {
          if (!data.categoryCodeId || !data.gemstoneCodeId || !data.colorCodeId) {
              throw new Error("Missing code master selection for SKU generation");
          }

          // Use raw query to avoid runtime error if client is stale
          const categoryCodes = await tx.$queryRaw<{id: string, code: string}[]>`SELECT * FROM CategoryCode WHERE id = ${data.categoryCodeId} LIMIT 1`;
          const categoryCode = categoryCodes[0];

          const gemstoneCodes = await tx.$queryRaw<{id: string, code: string}[]>`SELECT * FROM GemstoneCode WHERE id = ${data.gemstoneCodeId} LIMIT 1`;
          const gemstoneCode = gemstoneCodes[0];

          const colorCodes = await tx.$queryRaw<{id: string, code: string}[]>`SELECT * FROM ColorCode WHERE id = ${data.colorCodeId} LIMIT 1`;
          const colorCode = colorCodes[0];

          if (!categoryCode || !gemstoneCode || !colorCode) {
            throw new Error("Invalid code master selection");
          }

          const sku = await generateSku(tx, {
              categoryCode: categoryCode.code,
              gemstoneCode: gemstoneCode.code,
              colorCode: colorCode.code,
              weightValue: data.weightValue,
              weightUnit: data.weightUnit,
          });

          const inventory = await tx.inventory.create({
              data: {
                  sku,
                  itemName: data.itemName,
                  internalName: data.internalName,
                  category: data.category,
                  gemType: data.gemType,
                  // color: data.color, // Removed
                  categoryCodeId: data.categoryCodeId,
                  gemstoneCodeId: data.gemstoneCodeId,
                  colorCodeId: data.colorCodeId,
                  shape: data.shape,
                  dimensionsMm: data.dimensionsMm,
                  weightValue: data.weightValue,
                  weightUnit: data.weightUnit,
                  weightRatti,
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
              },
          });

          return {
            id: inventory.id,
            sku: inventory.sku,
            data: inventory // We need the full object for logging
          };
      });

      if (createdInventory) {
          // Log Activity
          await logActivity({
              entityType: "Inventory",
              entityId: createdInventory.id,
              entityIdentifier: createdInventory.sku,
              actionType: "CREATE",
              newData: createdInventory.data,
          });

          if (data.mediaUrl && data.mediaUrl !== "") {
            const finalUrl = await renameCloudinaryImageToSku(
              data.mediaUrl,
              createdInventory.sku
            );

            await prisma.media.create({
              data: {
                inventoryId: createdInventory.id,
                type: "IMAGE",
                url: finalUrl,
              },
            });
          }
      }
  } catch (e) {
      console.error(e);
      return { message: "Failed to create inventory" };
  }

  revalidatePath("/inventory");
  redirect("/inventory");
}

export async function updateInventory(
  id: string,
  prevState: unknown,
  formData: FormData
) {
  const session = await auth();
  if (!session) {
    return { message: "Unauthorized" };
  }

  // Check if sold
  const current = await prisma.inventory.findUnique({
      where: { id },
      select: { status: true }
  });
  
  if (!current) return { message: "Inventory not found" };
  if (current.status === "SOLD") return { message: "Cannot edit sold inventory" };

  const raw = Object.fromEntries(formData.entries());
  const parsed = inventorySchema.safeParse(raw);

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  // Calculate profit
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

  // Calculate Ratti
  let weightRatti = 0;
  if (data.weightUnit === "cts") {
      weightRatti = data.weightValue * 1.09;
  } else if (data.weightUnit === "gms") {
      weightRatti = data.weightValue * 5.45;
  }
  weightRatti = Math.round(weightRatti * 100) / 100;

  try {
    const oldInventory = await prisma.inventory.findUnique({ where: { id } });

    const updatedInventory = await prisma.inventory.update({
      where: { id },
      data: {
        itemName: data.itemName,
        internalName: data.internalName,
        category: data.category,
        gemType: data.gemType,
        shape: data.shape,
        dimensionsMm: data.dimensionsMm,
        weightValue: data.weightValue,
        weightUnit: data.weightUnit,
        weightRatti,
        treatment: data.treatment,
        certification: data.certification,
        vendorId: data.vendorId,
        pricingMode: data.pricingMode,
        purchaseRatePerCarat: data.purchaseRatePerCarat,
        sellingRatePerCarat: data.sellingRatePerCarat,
        flatPurchaseCost: data.flatPurchaseCost,
        flatSellingPrice: data.flatSellingPrice,
        profit,
        stockLocation: data.stockLocation,
        notes: data.notes,
      },
    });

    await logActivity({
        entityType: "Inventory",
        entityId: id,
        entityIdentifier: updatedInventory.sku,
        actionType: "EDIT",
        oldData: oldInventory,
        newData: updatedInventory,
    });

    if (data.mediaUrl && data.mediaUrl !== "") {
        const existingMedia = await prisma.media.findFirst({
            where: { inventoryId: id, url: data.mediaUrl }
        });

        if (!existingMedia) {
             const inv = await prisma.inventory.findUnique({ where: { id }, select: { sku: true }});
             if (inv) {
                 const finalUrl = await renameCloudinaryImageToSku(data.mediaUrl, inv.sku);
                 await prisma.media.create({
                    data: {
                        inventoryId: id,
                        type: "IMAGE",
                        url: finalUrl
                    }
                 });
             }
        }
    }

  } catch (e) {
    console.error(e);
    return { message: "Failed to update inventory" };
  }

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${id}`);
  redirect("/inventory");
}

export async function importInventory(rows: InventoryImportRow[]) {
    const session = await auth();
    if (!session) return { success: false, message: "Unauthorized" };

    const errors: { row: number; error: string }[] = [];
    let successCount = 0;

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
            // Basic validation and transformation
            const vendor = await prisma.vendor.findFirst({
                where: { name: { contains: row.vendorName || "" } }
            });

            if (!vendor) {
                errors.push({ row: i + 1, error: `Vendor '${row.vendorName}' not found` });
                continue;
            }

            // Pricing logic
            const pricingMode = row.pricingMode === "FLAT" ? "FLAT" : "PER_CARAT";
            let purchaseCost = 0;
            let sellingPrice = 0;

            if (pricingMode === "PER_CARAT") {
                purchaseCost = (Number(row.weightValue) || 0) * (Number(row.purchaseRatePerCarat) || 0);
                sellingPrice = (Number(row.weightValue) || 0) * (Number(row.sellingRatePerCarat) || 0);
            } else {
                purchaseCost = Number(row.flatPurchaseCost) || 0;
                sellingPrice = Number(row.flatSellingPrice) || 0;
            }

            const profit = sellingPrice - purchaseCost;

            await prisma.$transaction(async (tx) => {
                const weightValue = Number(row.weightValue) || 0;
                const weightUnit = row.weightUnit || "cts";

                // Resolve Master Codes
                let categoryCodeStr = "LG"; // Default fallback
                let gemstoneCodeStr = "GEM";
                let colorCodeStr = "XX";
                
                let categoryCodeId: string | undefined;
                let gemstoneCodeId: string | undefined;
                let colorCodeId: string | undefined;

                let categoryName = "Loose Gemstone";
                let gemName = row.gemType || "Gem";
                // let colorName = row.color || "Unknown";

                // 1. Try to find by provided code
                if (row.categoryCode) {
                    const c = await (tx as typeof tx & {
                        categoryCode?: { findUnique: (args: { where: { code: string } }) => Promise<{ id: string; code: string; name: string } | null> };
                    }).categoryCode?.findUnique({ where: { code: row.categoryCode } });
                    if (c) { 
                        categoryCodeStr = c.code; 
                        categoryCodeId = c.id;
                        categoryName = c.name;
                    }
                }
                if (row.gemstoneCode) {
                    const g = await (tx as typeof tx & {
                        gemstoneCode?: { findUnique: (args: { where: { code: string } }) => Promise<{ id: string; code: string; name: string } | null> };
                    }).gemstoneCode?.findUnique({ where: { code: row.gemstoneCode } });
                    if (g) { 
                        gemstoneCodeStr = g.code; 
                        gemstoneCodeId = g.id;
                        gemName = g.name;
                    }
                }
                if (row.colorCode) {
                    const c = await (tx as typeof tx & {
                        colorCode?: { findUnique: (args: { where: { code: string } }) => Promise<{ id: string; code: string; name: string } | null> };
                    }).colorCode?.findUnique({ where: { code: row.colorCode } });
                    if (c) { 
                        colorCodeStr = c.code; 
                        colorCodeId = c.id;
                        // colorName = c.name;
                    }
                }

                // 2. Fallback: try to match by name (if code not provided but name is)
                // This logic can be expanded, but for now we trust the code columns or fallbacks.
                // If code columns are missing, we use the basic string mapping logic for legacy compatibility.
                if (!categoryCodeId) {
                     // Maybe map "Loose Gemstone" to LG?
                     // For now keep default "LG"
                }
                if (!gemstoneCodeId && row.gemType) {
                    // Try to find gemstone by name
                     const g = await (tx as typeof tx & {
                        gemstoneCode?: { findFirst: (args: { where: { name: string } }) => Promise<{ id: string; code: string; name: string } | null> };
                     }).gemstoneCode?.findFirst({ where: { name: row.gemType } });
                     if (g) { 
                         gemstoneCodeStr = g.code; 
                         gemstoneCodeId = g.id; 
                     }
                     else {
                        // Use old logic: 3 chars
                        gemstoneCodeStr = row.gemType.slice(0, 3).toUpperCase();
                     }
                }
                if (!colorCodeId && row.color) {
                     const c = await (tx as typeof tx & {
                        colorCode?: { findFirst: (args: { where: { name: string } }) => Promise<{ id: string; code: string; name: string } | null> };
                     }).colorCode?.findFirst({ where: { name: row.color } });
                     if (c) {
                         colorCodeStr = c.code;
                         colorCodeId = c.id;
                     }
                }

                const sku = await generateSku(tx, {
                    categoryCode: categoryCodeStr,
                    gemstoneCode: gemstoneCodeStr,
                    colorCode: colorCodeStr,
                    weightValue,
                    weightUnit,
                });

                const inventory = await tx.inventory.create({
                    data: {
                        sku,
                        itemName: row.itemName || "Imported Item",
                        category: categoryName,
                        internalName: row.internalName,
                        gemType: gemName,
                        // color: colorName, // Removed
                        categoryCodeId,
                        gemstoneCodeId,
                        colorCodeId,
                        shape: row.shape || "Round",
                        weightValue: Number(row.weightValue) || 0,
                        weightUnit: row.weightUnit || "cts",
                        vendorId: vendor.id,
                        pricingMode,
                        purchaseRatePerCarat: Number(row.purchaseRatePerCarat) || 0,
                        sellingRatePerCarat: Number(row.sellingRatePerCarat) || 0,
                        flatPurchaseCost: Number(row.flatPurchaseCost) || 0,
                        flatSellingPrice: Number(row.flatSellingPrice) || 0,
                        profit,
                        status: "IN_STOCK",
                        stockLocation: row.stockLocation,
                        notes: row.notes,
                        createdBy: session.user.email || "system"
                    }
                });

                await logActivity({
                    entityType: "Inventory",
                    entityId: inventory.id,
                    entityIdentifier: inventory.sku,
                    actionType: "CREATE",
                    userId: session.user.id,
                    userName: session.user.name || session.user.email || "Unknown",
                    source: "CSV_IMPORT"
                });
            });
            successCount++;
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Unknown error";
            errors.push({ row: i + 1, error: message });
        }
    }

    revalidatePath("/inventory");
    return { 
        success: successCount > 0, 
        message: `Imported ${successCount} items. ${errors.length} failed.`, 
        errors 
    };
}
