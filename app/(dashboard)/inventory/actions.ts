"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateSku } from "@/lib/sku";
import { revalidatePath, revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";
import { triggerMarketplaceConflict } from "@/lib/marketplace-control-center";
import { addToCart } from "@/app/(dashboard)/labels/actions";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { isValidBeadSizeLabel, normalizeBeadSizeLabel, parseBeadSizeMm } from "@/lib/bead-size";
import { ensureInventoryBraceletSchema } from "@/lib/inventory-schema-ensure";

// --- Integrity Check Helpers ---

async function isLossSaleAllowed(): Promise<boolean> {
  const setting = await prisma.setting.findUnique({
    where: { key: "ALLOW_LOSS_SALE" },
  });
  return setting?.value === "true";
}

async function checkDuplicateSku(
  gemstoneCodeId: string | undefined,
  weightValue: number,
  excludeId?: string
) {
  if (!gemstoneCodeId || !weightValue) return [];

  const tolerance = 0.05;
  const minWeight = weightValue - tolerance;
  const maxWeight = weightValue + tolerance;

  const duplicates = await prisma.inventory.findMany({
    where: {
      gemstoneCodeId,
      weightValue: {
        gte: minWeight,
        lte: maxWeight,
      },
      status: "IN_STOCK", // Only check active stock
      id: excludeId ? { not: excludeId } : undefined,
    },
    select: { sku: true, weightValue: true },
    take: 1,
  });

  return duplicates;
}

// --- End Helpers ---

function calculateRatti(weight: number, unit: string) {
   let ratti = 0;
   if (unit === "cts") {
       ratti = weight * 1.09;
   } else if (unit === "gms") {
       ratti = weight * 5.45;
   }
   return Math.round(ratti * 100) / 100;
}

function calculateCarats(weight: number, unit: string) {
  if (unit === "gms") return Number((weight * 5).toFixed(2));
  return Number(weight.toFixed(2));
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
  certificateCodeIds: z.string().optional().transform(val => val ? val.split(',').filter(Boolean) : []),
  shape: z.string().optional(),
  dimensionsMm: z.string().optional(),
  weightValue: z.coerce.number().min(0, "Weight must be non-negative"),
  weightUnit: z.string(),
  treatment: z.string().optional(),
  origin: z.string().optional(),
  fluorescence: z.string().optional(),
  transparency: z.string().optional(),
  vendorId: z.string().min(1, "Vendor is required"),
  pricingMode: z.enum(["PER_CARAT", "PER_RATTI", "FLAT"]),
  purchaseRatePerCarat: z.coerce.number().optional(),
  sellingRatePerCarat: z.coerce.number().optional(),
  flatPurchaseCost: z.coerce.number().optional(),
  flatSellingPrice: z.coerce.number().optional(),
  status: z.enum(["IN_STOCK", "RESERVED", "MEMO"]).optional(),
  stockLocation: z.string().optional(),
  notes: z.string().optional(),
  description: z.string().optional(),
  certificateComments: z.string().optional(),
  mediaUrl: z.string().optional().or(z.literal("")),
  mediaUrls: z.array(z.string()).optional(),
  
  // Bracelet Attributes
  braceletType: z.string().optional(),
  beadSizeMm: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.number().optional()),
  beadSize: z.string().max(32).optional(),
  beadSizeLabel: z.string().max(32).optional(),
  beadCount: z.coerce.number().optional(),
  holeSizeMm: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.number().optional()),
  innerCircumferenceMm: z.coerce.number().optional(),
  standardSize: z.string().optional(),
  
  // Logic Flags
  ignoreDuplicates: z.coerce.boolean().optional(),
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

export async function createInventory(prevState: unknown, formData: FormData) {
  const [perm, session] = await Promise.all([
    checkPermission(PERMISSIONS.INVENTORY_CREATE),
    auth(),
  ]);
  if (!perm.success) return { message: perm.message };
  if (!session) return { message: "Unauthorized" };
  await ensureInventoryBraceletSchema();

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
  const carats = calculateCarats(data.weightValue, data.weightUnit);

  let costPrice: number;
  let sellingPrice: number;
  if (data.pricingMode === "PER_CARAT") {
    costPrice = (data.purchaseRatePerCarat || 0) * carats;
    sellingPrice = (data.sellingRatePerCarat || 0) * carats;
  } else if (data.pricingMode === "PER_RATTI") {
    costPrice = (data.purchaseRatePerCarat || 0) * weightRatti;
    sellingPrice = (data.sellingRatePerCarat || 0) * weightRatti;
  } else {
    costPrice = data.flatPurchaseCost || 0;
    sellingPrice = data.flatSellingPrice || 0;
  }

  const beadSizeLabelCandidate = data.beadSizeLabel || data.beadSize || (data.beadSizeMm != null ? `${data.beadSizeMm}mm` : "");
  const beadSizeLabelNormalized = beadSizeLabelCandidate ? normalizeBeadSizeLabel(beadSizeLabelCandidate) : undefined;
  if (beadSizeLabelNormalized && !isValidBeadSizeLabel(beadSizeLabelNormalized)) {
      return { errors: { beadSize: ["Invalid bead size format"] } };
  }
  const beadSizeMm = (typeof data.beadSizeMm === "number" && Number.isFinite(data.beadSizeMm))
      ? data.beadSizeMm
      : (beadSizeLabelNormalized ? parseBeadSizeMm(beadSizeLabelNormalized) : undefined);

  // --- Integrity Checks (Parallelized for speed) ---
  const [allowLoss, duplicates] = await Promise.all([
    isLossSaleAllowed(),
    data.ignoreDuplicates ? Promise.resolve([]) : checkDuplicateSku(data.gemstoneCodeId, data.weightValue)
  ]);

  if (!allowLoss && sellingPrice < costPrice - 0.01) {
    return {
      message: "Selling price cannot be less than cost price (Settings restricted).",
      errors: {
        sellingRatePerCarat: ["Resulting selling price is lower than cost"],
        flatSellingPrice: ["Selling price is lower than cost"]
      }
    };
  }

  if (duplicates.length > 0) {
    return {
      message: `Potential duplicate SKU detected: ${duplicates[0].sku}`,
      errors: {
        weightValue: [`Similar item exists: ${duplicates[0].sku} (${duplicates[0].weightValue}ct)`]
      },
      isDuplicateWarning: true
    };
  }
  // --- End Integrity Checks ---

  // --- Resolve codes BEFORE transaction (read-only, no atomicity needed) ---
  let categoryCodeStr = "XX";
  let gemstoneCodeStr = "XX";
  let colorCodeStr = "XX";
  if (data.categoryCodeId || data.gemstoneCodeId || data.colorCodeId) {
    const [catCode, gemCode, colCode] = await Promise.all([
      data.categoryCodeId ? prisma.categoryCode.findUnique({ where: { id: data.categoryCodeId }, select: { code: true } }) : Promise.resolve(null),
      data.gemstoneCodeId ? prisma.gemstoneCode.findUnique({ where: { id: data.gemstoneCodeId }, select: { code: true } }) : Promise.resolve(null),
      data.colorCodeId ? prisma.colorCode.findUnique({ where: { id: data.colorCodeId }, select: { code: true } }) : Promise.resolve(null),
    ]);
    categoryCodeStr = catCode?.code ?? "XX";
    gemstoneCodeStr = gemCode?.code ?? "XX";
    colorCodeStr = colCode?.code ?? "XX";
  }

  let createdInventory;
  try {
      createdInventory = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          const sku = await generateSku(tx, {
              categoryCode: categoryCodeStr,
              gemstoneCode: gemstoneCodeStr,
              colorCode: colorCodeStr,
              weightValue: data.weightValue,
              weightUnit: data.weightUnit,
          });

          const createData: Prisma.InventoryCreateInput & { beadSizeLabel?: string | null } = {
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
              certificates: {
                  connect: data.certificateCodeIds?.map(id => ({ id })) || []
              },
              shape: data.shape,
              dimensionsMm: data.dimensionsMm,
              weightValue: data.weightValue,
              weightUnit: data.weightUnit,
              carats,
              weightRatti,
              treatment: data.treatment,
              origin: data.origin,
              fluorescence: data.fluorescence,
              transparency: data.transparency,
              vendor: data.vendorId ? { connect: { id: data.vendorId } } : undefined,
              pricingMode: data.pricingMode,
              purchaseRatePerCarat: data.purchaseRatePerCarat,
              sellingRatePerCarat: data.sellingRatePerCarat,
              flatPurchaseCost: data.flatPurchaseCost,
              flatSellingPrice: data.flatSellingPrice,
              costPrice,
              sellingPrice,
              // profit, // Commented out due to Prisma Client lock
              status: data.status,
              stockLocation: data.stockLocation,
              notes: data.notes,
              description: data.description,
              certificateComments: data.certificateComments,
              
              // Bracelet Fields
              braceletType: data.braceletType,
              beadSizeMm,
              beadSizeLabel: beadSizeLabelNormalized ?? null,
              beadCount: data.beadCount,
              // holeSizeMm: data.holeSizeMm, // Commented out due to Prisma Client lock
              innerCircumferenceMm: data.innerCircumferenceMm,
              standardSize: data.standardSize,
          };

          const inventory = await tx.inventory.create({ data: createData });

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

  const quantityAdded = (createdInventory.data as unknown as { pieces?: number | null }).pieces ?? 1;
  const itemName = (createdInventory.data as unknown as { itemName?: string | null }).itemName ?? "";

  // Fire side effects asynchronously — client gets the response faster
  if (createdInventory) {
    const urls: string[] =
      data.mediaUrls && data.mediaUrls.length > 0
        ? data.mediaUrls
        : data.mediaUrl
        ? [data.mediaUrl]
        : [];

    Promise.all([
      logActivity({
        entityType: "Inventory",
        entityId: createdInventory.id,
        entityIdentifier: createdInventory.sku,
        actionType: "CREATE",
        newData: createdInventory.data,
      }),
      addToCart(createdInventory.id),
      (async () => {
        if (!urls.length) return;
        const mapped = await Promise.all(
          urls.map(async (url, i) => {
            const isVideo = url.match(/\.(mp4|mov|webm)$/i);
            const type = isVideo ? "VIDEO" : "IMAGE";
            return {
              inventoryId: createdInventory.id,
              type,
              mediaUrl: url,
              isPrimary: i === 0,
            };
          })
        );
        await prisma.inventoryMedia.createMany({ data: mapped as Prisma.InventoryMediaCreateManyInput[] });
      })(),
      (async () => {
        revalidatePath("/inventory");
        try { revalidateTag("inventory:stats", "default"); } catch {}
      })(),
    ]).catch((e) => console.error("Post-creation error:", e));
  }

  return {
    success: true,
    message: "Inventory created successfully",
    inventoryId: createdInventory.id,
    sku: createdInventory.sku,
    itemName,
    quantityAdded,
    totalStock: quantityAdded,
  };
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
  await ensureInventoryBraceletSchema();

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

  const carats = calculateCarats(data.weightValue, data.weightUnit);
  // Calculate Ratti
  const weightRatti = calculateRatti(data.weightValue, data.weightUnit);

  let costPrice: number;
  let sellingPrice: number;
  if (data.pricingMode === "PER_CARAT") {
    costPrice = (data.purchaseRatePerCarat || 0) * carats;
    sellingPrice = (data.sellingRatePerCarat || 0) * carats;
  } else if (data.pricingMode === "PER_RATTI") {
    costPrice = (data.purchaseRatePerCarat || 0) * weightRatti;
    sellingPrice = (data.sellingRatePerCarat || 0) * weightRatti;
  } else {
    costPrice = data.flatPurchaseCost || 0;
    sellingPrice = data.flatSellingPrice || 0;
  }

  const beadSizeLabelCandidate = data.beadSizeLabel || data.beadSize || (data.beadSizeMm != null ? `${data.beadSizeMm}mm` : "");
  const beadSizeLabelNormalized = beadSizeLabelCandidate ? normalizeBeadSizeLabel(beadSizeLabelCandidate) : undefined;
  if (beadSizeLabelNormalized && !isValidBeadSizeLabel(beadSizeLabelNormalized)) {
      return { errors: { beadSize: ["Invalid bead size format"] } };
  }
  const beadSizeMm = (typeof data.beadSizeMm === "number" && Number.isFinite(data.beadSizeMm))
      ? data.beadSizeMm
      : (beadSizeLabelNormalized ? parseBeadSizeMm(beadSizeLabelNormalized) : undefined);

  // --- Integrity Checks ---
  // 1. Loss Sale Check
  const allowLoss = await isLossSaleAllowed();
  if (!allowLoss && sellingPrice < costPrice - 0.01) {
      return { 
          message: "Selling price cannot be less than cost price (Settings restricted).",
          errors: {
              sellingRatePerCarat: ["Resulting selling price is lower than cost"],
              flatSellingPrice: ["Selling price is lower than cost"]
          }
      };
  }

  // 2. Duplicate SKU Check (Exclude current ID)
  if (!data.ignoreDuplicates) {
    const duplicates = await checkDuplicateSku(data.gemstoneCodeId, data.weightValue, id);
    if (duplicates.length > 0) {
        // For updates, we might want to be more lenient or just warn?
        // But prompt says "Detect duplicate-like SKUs".
        // We'll block for now to ensure integrity.
        return {
            message: `Potential duplicate SKU detected: ${duplicates[0].sku}`,
            errors: {
                weightValue: [`Similar item exists: ${duplicates[0].sku} (${duplicates[0].weightValue}ct)`]
            },
            isDuplicateWarning: true
        };
    }
  }
  // --- End Integrity Checks ---

  try {
    const oldInventory = await prisma.inventory.findUnique({ where: { id } });

    const updateData: Prisma.InventoryUpdateInput & { beadSizeLabel?: string | null } = {
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
      certificates: { set: data.certificateCodeIds?.map(id => ({ id })) || [] },
      shape: data.shape,
      dimensionsMm: data.dimensionsMm,
      weightValue: data.weightValue,
      weightUnit: data.weightUnit,
      carats,
      weightRatti,
      treatment: data.treatment,
      origin: data.origin,
      fluorescence: data.fluorescence,
      transparency: data.transparency,
      vendor: data.vendorId ? { connect: { id: data.vendorId } } : { disconnect: true },
      pricingMode: data.pricingMode,
      purchaseRatePerCarat: data.purchaseRatePerCarat,
      sellingRatePerCarat: data.sellingRatePerCarat,
      flatPurchaseCost: data.flatPurchaseCost,
      flatSellingPrice: data.flatSellingPrice,
      costPrice,
      sellingPrice,
      status: data.status,
      stockLocation: data.stockLocation,
      notes: data.notes,
      description: data.description,
      certificateComments: data.certificateComments,
      braceletType: data.braceletType,
      beadSizeMm,
      beadSizeLabel: beadSizeLabelNormalized ?? null,
      beadCount: data.beadCount,
      innerCircumferenceMm: data.innerCircumferenceMm,
      standardSize: data.standardSize,
    };

    const updatedInventory = await prisma.inventory.update({
      where: { id },
      data: updateData,
    });

    await logActivity({
        entityType: "Inventory",
        entityId: id,
        entityIdentifier: updatedInventory.sku,
        actionType: "EDIT",
        oldData: oldInventory,
        newData: updatedInventory,
    });

    await triggerMarketplaceConflict({
      inventoryId: id,
      status: updatedInventory.status,
      pieces: updatedInventory.pieces,
      userId: session.user.id,
      userName: session.user.name || session.user.email || "Unknown",
      source: "WEB",
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
        
        const toAdd = Array.from(new Set(data.mediaUrls.filter(url => !currentUrls.has(url))));

        if (toAdd.length > 0) {
            await prisma.inventoryMedia.createMany({
                data: toAdd.map((url) => {
                    const isVideo = url.match(/\.(mp4|mov|webm)$/i);
                    return {
                        inventoryId: id,
                        type: isVideo ? "VIDEO" : "IMAGE",
                        mediaUrl: url,
                    };
                }),
            });
        }
    } else if (data.mediaUrl && data.mediaUrl !== "") {
        const existingMedia = await prisma.inventoryMedia.findFirst({
            where: { inventoryId: id, mediaUrl: data.mediaUrl }
        });

        if (!existingMedia) {
             const inv = await prisma.inventory.findUnique({ where: { id }, select: { sku: true }});
             if (inv) {
                 const finalUrl = data.mediaUrl;
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
  try {
    revalidateTag("inventory:stats", "default");
    revalidateTag("masters:collections", "default");
    revalidateTag("masters:rashis", "default");
    revalidateTag("masters:certificates", "default");
  } catch {
    // ignore
  }
  // redirect("/inventory"); // Removed to allow client-side handling
  return { success: true, message: "Inventory updated successfully" };
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

export async function bulkUpdateInventory(
  ids: string[],
  updates: Record<string, unknown>
) {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  try {
    const simpleUpdates: Record<string, unknown> = {};
    const relationUpdates: { 
      rashis?: { set: { id: string }[] },
      certificates?: { set: { id: string }[] } 
    } = {};
    
    // Separate updates into simple and relational
    Object.entries(updates).forEach(([key, value]) => {
      if (key === "rashiIds") {
        relationUpdates.rashis = { 
          set: (value as string[]).map((id) => ({ id })) 
        };
      } else if (key === "certificateIds") {
        relationUpdates.certificates = { 
          set: (value as string[]).map((id) => ({ id })) 
        };
      } else {
        // Validate allowed fields for security
        const allowedFields = [
          "stockLocation", "status", "categoryCodeId", 
          "gemstoneCodeId", "colorCodeId", "cutCodeId", 
          "collectionCodeId", "vendorId", "pricingMode"
        ];
        if (allowedFields.includes(key)) {
          simpleUpdates[key] = value;
        }
      }
    });

    // Strategy:
    // 1. If we have relation updates, we MUST iterate through each item to update relations.
    //    We can also include the simple updates in this transaction to ensure atomicity per item.
    // 2. If we ONLY have simple updates, we can use updateMany for efficiency.

    const hasRelationUpdates = Object.keys(relationUpdates).length > 0;

    if (hasRelationUpdates) {
      // Transactional update per item
      await prisma.$transaction(
        ids.map((id) =>
          prisma.inventory.update({
            where: { id },
            data: {
              ...simpleUpdates,
              ...relationUpdates,
            },
          })
        )
      );
    } else if (Object.keys(simpleUpdates).length > 0) {
      // Batch update for simple fields only
      await prisma.inventory.updateMany({
        where: { id: { in: ids } },
        data: simpleUpdates,
      });
    }

    // Log activity
    await logActivity({
      actionType: "EDIT",
      entityType: "Inventory",
      entityId: "BULK",
      entityIdentifier: "BULK_UPDATE",
      newData: { ids, updates },
      details: `Bulk update: ${ids.length} items. Fields: ${Object.keys(updates).join(", ")}`,
      userId: session.user.id,
      userName: session.user.name || session.user.email || "Unknown",
    });

    revalidatePath("/inventory");
    return { success: true };
  } catch (error) {
    console.error("Bulk update error:", error);
    return { error: "Failed to update items" };
  }
}

const inventoryStatusSchema = z.object({
  inventoryId: z.string().uuid(),
  status: z.enum(["IN_STOCK", "RESERVED", "MEMO"]),
  reason: z.string().optional(),
});

export async function updateInventoryStatus(
  prevState: unknown,
  formData: FormData
) {
  const perm = await checkPermission(PERMISSIONS.INVENTORY_EDIT);
  if (!perm.success) return { message: perm.message };

  const session = await auth();
  if (!session?.user) return { message: "Unauthorized" };

  const raw = Object.fromEntries(formData.entries());
  const parsed = inventoryStatusSchema.safeParse({
    inventoryId: raw.inventoryId,
    status: raw.status,
    reason: raw.reason,
  });
  if (!parsed.success) return { message: "Invalid request" };

  const { inventoryId, status, reason } = parsed.data;

  const current = await prisma.inventory.findUnique({
    where: { id: inventoryId },
    select: { id: true, sku: true, status: true },
  });
  if (!current) return { message: "Inventory not found" };
  if (current.status === "SOLD") return { message: "Cannot change status of SOLD inventory" };

  if (current.status === status) return { success: true };

  await prisma.inventory.update({
    where: { id: inventoryId },
    data: { status },
  });

  await logActivity({
    entityType: "Inventory",
    entityId: inventoryId,
    entityIdentifier: current.sku,
    actionType: "STATUS_CHANGE",
    oldData: { status: current.status },
    newData: { status },
    details: reason ? `Reason: ${reason}` : undefined,
    userId: session.user.id,
    userName: session.user.name || session.user.email || "Unknown",
    source: "WEB",
  });

  await triggerMarketplaceConflict({
    inventoryId,
    status,
    userId: session.user.id,
    userName: session.user.name || session.user.email || "Unknown",
    source: "WEB",
  });

  revalidatePath("/inventory");
  return { success: true };
}
