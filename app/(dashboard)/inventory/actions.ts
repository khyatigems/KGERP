"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client-custom-v2";
import { prisma } from "@/lib/prisma";
import { generateSku } from "@/lib/sku";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";
import { addToCart } from "@/app/(dashboard)/labels/actions";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";

function calculateRatti(weight: number, unit: string) {
   let ratti = 0;
   if (unit === "cts") {
       ratti = weight * 1.09;
   } else if (unit === "gms") {
       ratti = weight * 5.45;
   }
   return Math.round(ratti * 100) / 100;
}

const inventorySchema = z.object({
  itemName: z.string().min(1, "Item name is required"),
  internalName: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  gemType: z.string().optional(),
  color: z.string().optional(),
  categoryCodeId: z.string().optional().transform(v => v === "" ? undefined : v),
  gemstoneCodeId: z.string().optional().transform(v => v === "" ? undefined : v),
  colorCodeId: z.string().optional().transform(v => v === "" ? undefined : v),
  cutCodeId: z.string().optional().transform(v => v === "" ? undefined : v),
  collectionCodeId: z.string().optional().transform(v => v === "" ? undefined : v),
  rashiCodeIds: z.string().optional().transform(val => val ? val.split(',').filter(Boolean) : []),
  shape: z.string().optional(),
  dimensionsMm: z.string().optional(),
  weightValue: z.coerce.number().min(0, "Weight must be non-negative"),
  weightUnit: z.string(),
  treatment: z.string().optional(),
  certification: z.string().optional(),
  transparency: z.string().optional(),
  vendorId: z.string().uuid("Invalid vendor"),
  pricingMode: z.enum(["PER_CARAT", "FLAT"]),
  purchaseRatePerCarat: z.coerce.number().optional(),
  sellingRatePerCarat: z.coerce.number().optional(),
  flatPurchaseCost: z.coerce.number().optional(),
  flatSellingPrice: z.coerce.number().optional(),
  stockLocation: z.string().optional(),
  notes: z.string().optional(),
  mediaUrl: z.string().optional().or(z.literal("")),
  mediaUrls: z.array(z.string()).optional(),
  
  // Bracelet Attributes
  braceletType: z.string().optional(),
  beadSizeMm: z.coerce.number().optional(),
  beadCount: z.coerce.number().optional(),
  holeSizeMm: z.coerce.number().optional(),
  innerCircumferenceMm: z.coerce.number().optional(),
  standardSize: z.string().optional(),
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
  weightRatti?: number | string;
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
  const perm = await checkPermission(PERMISSIONS.INVENTORY_CREATE);
  if (!perm.success) return { message: perm.message };

  const session = await auth();
  if (!session) {
      return { message: "Unauthorized" };
  }

  const raw = Object.fromEntries(formData.entries());
  const mediaUrls = formData.getAll('mediaUrls').map(String).filter(Boolean);
  
  const parsed = inventorySchema.safeParse({
      ...raw,
      mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined
  });

  if (!parsed.success) {
    console.error("Inventory Validation Error:", parsed.error.flatten().fieldErrors);
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  const weightRatti = calculateRatti(data.weightValue, data.weightUnit);

  const costPrice = data.pricingMode === "PER_CARAT" 
      ? (data.purchaseRatePerCarat || 0) * (data.weightValue || 0)
      : (data.flatPurchaseCost || 0);

  const sellingPrice = data.pricingMode === "PER_CARAT"
      ? (data.sellingRatePerCarat || 0) * (data.weightValue || 0)
      : (data.flatSellingPrice || 0);

  let createdInventory;
  try {
      createdInventory = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          let categoryCodeStr = "XX";
          let gemstoneCodeStr = "XX";
          let colorCodeStr = "XX";

          if (data.categoryCodeId) {
              const categoryCodes = await tx.categoryCode.findUnique({ where: { id: data.categoryCodeId }, select: { code: true } });
              if (categoryCodes) categoryCodeStr = categoryCodes.code;
          }

          if (data.gemstoneCodeId) {
              const gemstoneCodes = await tx.gemstoneCode.findUnique({ where: { id: data.gemstoneCodeId }, select: { code: true } });
              if (gemstoneCodes) gemstoneCodeStr = gemstoneCodes.code;
          }

          if (data.colorCodeId) {
              const colorCodes = await tx.colorCode.findUnique({ where: { id: data.colorCodeId }, select: { code: true } });
              if (colorCodes) colorCodeStr = colorCodes.code;
          }

          const sku = await generateSku(tx, {
              categoryCode: categoryCodeStr,
              gemstoneCode: gemstoneCodeStr,
              colorCode: colorCodeStr,
              weightValue: data.weightValue,
              weightUnit: data.weightUnit,
          });

          const inventory = await tx.inventory.create({
              data: {
                  sku,
                  itemName: data.itemName,
                  internalName: data.internalName,
                  category: data.category,
                  gemType: data.gemType || "Mixed",
                  color: data.color,
                  categoryCode: data.categoryCodeId ? { connect: { id: data.categoryCodeId } } : undefined,
                  gemstoneCode: data.gemstoneCodeId ? { connect: { id: data.gemstoneCodeId } } : undefined,
                  colorCode: data.colorCodeId ? { connect: { id: data.colorCodeId } } : undefined,
                  cutCode: data.cutCodeId ? { connect: { id: data.cutCodeId } } : undefined,
                  collectionCode: data.collectionCodeId ? { connect: { id: data.collectionCodeId } } : undefined,
                  rashis: {
                      connect: data.rashiCodeIds?.map(id => ({ id })) || []
                  },
                  shape: data.shape,
                  dimensionsMm: data.dimensionsMm,
                  weightValue: data.weightValue,
                  weightUnit: data.weightUnit,
                  carats: data.weightValue || 0,
                  weightRatti,
                  treatment: data.treatment,
                  transparency: data.transparency,
                  certification: data.certification,
                  vendorId: data.vendorId,
                  pricingMode: data.pricingMode,
                  purchaseRatePerCarat: data.purchaseRatePerCarat,
                  sellingRatePerCarat: data.sellingRatePerCarat,
                  flatPurchaseCost: data.flatPurchaseCost,
                  flatSellingPrice: data.flatSellingPrice,
                  costPrice,
                  sellingPrice,
                  // profit, // Commented out due to Prisma Client lock
                  status: "IN_STOCK",
                  stockLocation: data.stockLocation,
                  notes: data.notes,
                  
                  // Bracelet Fields
                  braceletType: data.braceletType,
                  beadSizeMm: data.beadSizeMm,
                  beadCount: data.beadCount,
                  // holeSizeMm: data.holeSizeMm, // Commented out due to Prisma Client lock
                  innerCircumferenceMm: data.innerCircumferenceMm,
                  standardSize: data.standardSize,
                  // createdBy: session?.user?.email || "system", // Commented out due to Prisma Client lock
              },
          });

          return {
            id: inventory.id,
            sku: inventory.sku,
            data: inventory // We need the full object for logging
          };
      });
  } catch (e) {
      console.error(e);
      return { message: "Failed to create inventory" };
  }

  if (createdInventory) {
      try {
          // Log Activity
          await logActivity({
              entityType: "Inventory",
              entityId: createdInventory.id,
              entityIdentifier: createdInventory.sku,
              actionType: "CREATE",
              newData: createdInventory.data,
          });

          // Add to Label Cart
          await addToCart(createdInventory.id);

          if (data.mediaUrls && data.mediaUrls.length > 0) {
            for (let i = 0; i < data.mediaUrls.length; i++) {
                const url = data.mediaUrls[i];
                // Determine file type based on extension or metadata?
                // For now assume IMAGE unless mp4/mov
                const isVideo = url.match(/\.(mp4|mov|webm)$/i);
                const type = isVideo ? "VIDEO" : "IMAGE";
                
                // Only rename images on Cloudinary? Or videos too?
                // renameCloudinaryImageToSku handles logic based on public_id.
                // Suffix for multiple files
                const suffix = data.mediaUrls.length > 1 ? `_${i + 1}` : "";
                const finalUrl = await renameCloudinaryImageToSku(
                  url,
                  createdInventory.sku + suffix
                );
    
                await prisma.inventoryMedia.create({
                  data: {
                    inventoryId: createdInventory.id,
                    type: type,
                    mediaUrl: finalUrl,
                    isPrimary: i === 0 // First image is primary
                  },
                });
            }
          } else if (data.mediaUrl && data.mediaUrl !== "") {
            const finalUrl = await renameCloudinaryImageToSku(
              data.mediaUrl,
              createdInventory.sku
            );

            await prisma.inventoryMedia.create({
              data: {
                inventoryId: createdInventory.id,
                type: "IMAGE",
                mediaUrl: finalUrl,
                isPrimary: true // Single image is always primary
              },
            });
          }
      } catch (e) {
          console.error("Post-creation error:", e);
      }
  }

  revalidatePath("/inventory");
  redirect("/inventory");
}

export async function updateInventory(
  id: string,
  prevState: unknown,
  formData: FormData
) {
  const perm = await checkPermission(PERMISSIONS.INVENTORY_EDIT);
  if (!perm.success) return { message: perm.message };

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
  const mediaUrls = formData.getAll('mediaUrls').map(String).filter(Boolean).map(u => u.trim());

  const parsed = inventorySchema.safeParse({
      ...raw,
      mediaUrls: mediaUrls // Pass array as is, even if empty
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  // Calculate profit
  const costPrice = data.pricingMode === "PER_CARAT" 
      ? (data.purchaseRatePerCarat || 0) * (data.weightValue || 0)
      : (data.flatPurchaseCost || 0);

  const sellingPrice = data.pricingMode === "PER_CARAT"
      ? (data.sellingRatePerCarat || 0) * (data.weightValue || 0)
      : (data.flatSellingPrice || 0);

  // Calculate Ratti
  const weightRatti = calculateRatti(data.weightValue, data.weightUnit);

  try {
    const oldInventory = await prisma.inventory.findUnique({ where: { id } });

    const updatedInventory = await prisma.inventory.update({
      where: { id },
      data: {
        itemName: data.itemName,
        internalName: data.internalName,
        category: data.category,
        gemType: data.gemType || "Mixed",
        color: data.color,
        categoryCode: data.categoryCodeId ? { connect: { id: data.categoryCodeId } } : { disconnect: true },
        gemstoneCode: data.gemstoneCodeId ? { connect: { id: data.gemstoneCodeId } } : { disconnect: true },
        colorCode: data.colorCodeId ? { connect: { id: data.colorCodeId } } : { disconnect: true },
        cutCode: data.cutCodeId ? { connect: { id: data.cutCodeId } } : { disconnect: true },
        collectionCode: data.collectionCodeId ? { connect: { id: data.collectionCodeId } } : { disconnect: true },
        rashis: { set: data.rashiCodeIds?.map(id => ({ id })) || [] },
        shape: data.shape,
        dimensionsMm: data.dimensionsMm,
        weightValue: data.weightValue,
        weightUnit: data.weightUnit,
        carats: data.weightValue || 0,
        weightRatti,
        treatment: data.treatment,
        transparency: data.transparency,
        certification: data.certification,
        vendorId: data.vendorId,
        pricingMode: data.pricingMode,
        purchaseRatePerCarat: data.purchaseRatePerCarat,
        sellingRatePerCarat: data.sellingRatePerCarat,
        flatPurchaseCost: data.flatPurchaseCost,
        flatSellingPrice: data.flatSellingPrice,
        costPrice,
        sellingPrice,
        // profit, // Commented out due to Prisma Client lock
        stockLocation: data.stockLocation,
        notes: data.notes,

        // Bracelet Fields
        braceletType: data.braceletType,
        beadSizeMm: data.beadSizeMm,
        beadCount: data.beadCount,
        // holeSizeMm: data.holeSizeMm, // Commented out due to Prisma Client lock
        innerCircumferenceMm: data.innerCircumferenceMm,
        standardSize: data.standardSize,
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

    if (data.mediaUrls) {
        // 1. Delete removed media using strict database query
        // This handles cases where JS string comparison might fail vs DB
        if (data.mediaUrls.length === 0) {
            await prisma.inventoryMedia.deleteMany({
                where: { inventoryId: id }
            });
        } else {
            await prisma.inventoryMedia.deleteMany({
                where: {
                    inventoryId: id,
                    mediaUrl: { notIn: data.mediaUrls }
                }
            });
        }
        
        // 2. Add new media
        // Fetch fresh state after deletion to avoid sync issues
        const currentMedia = await prisma.inventoryMedia.findMany({
            where: { inventoryId: id },
            select: { mediaUrl: true }
        });
        const currentUrls = new Set(currentMedia.map(m => m.mediaUrl));
        
        const toAdd = data.mediaUrls.filter(url => !currentUrls.has(url));
        
        if (toAdd.length > 0) {
            const inv = await prisma.inventory.findUnique({ where: { id }, select: { sku: true } });
            if (inv) {
                 for (let i = 0; i < toAdd.length; i++) {
                     const url = toAdd[i];
                     const isVideo = url.match(/\.(mp4|mov|webm)$/i);
                     const type = isVideo ? "VIDEO" : "IMAGE";
                     
                     // Use timestamp suffix for updates to avoid collision
                     const suffix = `_${Date.now()}_${i}`;
                     const finalUrl = await renameCloudinaryImageToSku(url, inv.sku + suffix);
                     
                     await prisma.inventoryMedia.create({
                        data: {
                            inventoryId: id,
                            type: type,
                            mediaUrl: finalUrl
                        }
                     });
                 }
            }
        }
    } else if (data.mediaUrl && data.mediaUrl !== "") {
        const existingMedia = await prisma.inventoryMedia.findFirst({
            where: { inventoryId: id, mediaUrl: data.mediaUrl }
        });

        if (!existingMedia) {
             const inv = await prisma.inventory.findUnique({ where: { id }, select: { sku: true }});
             if (inv) {
                 const finalUrl = await renameCloudinaryImageToSku(data.mediaUrl, inv.sku);
                 await prisma.inventoryMedia.create({
                    data: {
                        inventoryId: id,
                        type: "IMAGE",
                        mediaUrl: finalUrl
                    }
                 });
             }
        }
    }

    // Ensure at least one media is primary
    const hasPrimary = await prisma.inventoryMedia.findFirst({
        where: { inventoryId: id, isPrimary: true }
    });

    if (!hasPrimary) {
        const firstMedia = await prisma.inventoryMedia.findFirst({
            where: { inventoryId: id },
            orderBy: { createdAt: 'asc' }
        });
        
        if (firstMedia) {
            await prisma.inventoryMedia.update({
                where: { id: firstMedia.id },
                data: { isPrimary: true }
            });
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
    const perm = await checkPermission(PERMISSIONS.INVENTORY_CREATE);
    if (!perm.success) return { success: false, message: perm.message || "Unauthorized" };

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

            await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
                    const c = await tx.categoryCode.findUnique({ where: { code: row.categoryCode } });
                    if (c) { 
                        categoryCodeStr = c.code; 
                        categoryCodeId = c.id;
                        categoryName = c.name;
                    }
                }
                if (row.gemstoneCode) {
                    const g = await tx.gemstoneCode.findUnique({ where: { code: row.gemstoneCode } });
                    if (g) { 
                        gemstoneCodeStr = g.code; 
                        gemstoneCodeId = g.id;
                        gemName = g.name;
                    }
                }
                if (row.colorCode) {
                    const c = await tx.colorCode.findUnique({ where: { code: row.colorCode } });
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
                     const g = await tx.gemstoneCode.findFirst({ where: { name: row.gemType } });
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
                     const c = await tx.colorCode.findFirst({ where: { name: row.color } });
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
                        carats: Number(row.weightValue) || 0,
                        weightRatti: Number(row.weightRatti) || 0,
                        treatment: row.treatment,
                        vendorId: vendor.id,
                        pricingMode,
                        purchaseRatePerCarat: Number(row.purchaseRatePerCarat) || 0,
                        sellingRatePerCarat: Number(row.sellingRatePerCarat) || 0,
                        flatPurchaseCost: Number(row.flatPurchaseCost) || 0,
                        flatSellingPrice: Number(row.flatSellingPrice) || 0,
                        costPrice: purchaseCost,
                        sellingPrice: sellingPrice,
                        // profit, // Commented out due to Prisma Client lock
                        status: "IN_STOCK",
                        stockLocation: row.stockLocation,
                        notes: row.notes,
                        // createdBy: session.user.email || "system" // Commented out due to Prisma Client lock
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
