"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client-custom-v2";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { generateSku } from "@/lib/sku";

const purchaseItemSchema = z.object({
  itemName: z.string().min(1, "Item name required"),
  category: z.string().min(1, "Category is required"),
  shape: z.string().optional(),
  sizeValue: z.string().optional(),
  sizeUnit: z.string().optional(),
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

const updateInvoiceSchema = z.object({
  purchaseId: z.string().uuid("Invalid purchase"),
  invoiceNo: z.string().min(1, "Invoice number is required"),
});

function calculateRatti(weight: number, unit: string) {
   let ratti = 0;
   if (unit === "cts") {
       ratti = weight * 1.09;
   } else if (unit === "gms") {
       ratti = weight * 5.45;
   }
   return Math.round(ratti * 100) / 100;
}

export async function createPurchase(prevState: unknown, formData: FormData) {
  const perm = await checkPermission(PERMISSIONS.INVENTORY_CREATE);
  if (!perm.success) return { message: perm.message };

  const session = await auth();
  if (!session) return { message: "Unauthorized" };

  const raw = Object.fromEntries(formData.entries());
  
  let items: unknown[] = [];
  if (typeof raw.items === "string") {
    try {
      items = JSON.parse(raw.items);
    } catch {
      return { message: "Invalid items data" };
    }
  }

  const payload = { ...raw, items };
  const parsed = purchaseSchema.safeParse(payload);

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  // Calculate total amount
  const totalAmount = data.items.reduce((sum, item) => sum + item.totalCost, 0);

  try {
    const purchase = await prisma.$transaction(async (tx) => {
        const p = await tx.purchase.create({
            data: {
                vendorId: data.vendorId,
                purchaseDate: data.purchaseDate,
                invoiceNo: data.invoiceNo,
                paymentMode: data.paymentMode,
                paymentStatus: data.paymentStatus || "PENDING",
                notes: data.remarks,
                totalAmount,
            }
        });

        for (const item of data.items) {
             const weightValue = item.quantity;
             const weightUnit = item.weightType;
             
             // Try to resolve codes for SKU generation
             // Fallback to defaults if not found
             let categoryCode = "XX";
             const cat = await tx.categoryCode.findFirst({ where: { name: item.category } });
             if (cat) categoryCode = cat.code;
             
             // Gemstone code? From itemName or category?
             // Use "GEM" as default
             const gemstoneCode = "GEM"; 
             
             const sku = await generateSku(tx, {
                 categoryCode,
                 gemstoneCode,
                 colorCode: "XX",
                 weightValue,
                 weightUnit
             });

             const weightRatti = calculateRatti(weightValue, weightUnit);

             await tx.inventory.create({
                 data: {
                     sku,
                     itemName: item.itemName,
                     category: item.category,
                     categoryCodeId: cat ? cat.id : undefined,
                     shape: item.shape,
                     dimensionsMm: item.sizeValue ? `${item.sizeValue} ${item.sizeUnit || ''}`.trim() : undefined,
                     beadSizeMm: item.beadSizeMm,
                     weightValue,
                     weightUnit,
                     weightRatti,
                     carats: weightValue, // Assuming carats for simplicity or calculate
                     pieces: 1, 
                     costPrice: item.totalCost,
                     sellingPrice: 0, // Needs to be set later
                     purchaseRatePerCarat: item.costPerUnit,
                     purchaseId: p.id,
                     vendorId: data.vendorId,
                     notes: item.remarks,
                     status: "IN_STOCK"
                 }
             });
        }
        return p;
    });

    await logActivity({
      entityType: "Purchase",
      entityId: purchase.id,
      entityIdentifier: purchase.invoiceNo || "No Invoice",
      actionType: "CREATE",
      source: "WEB",
      userId: session.user.id,
      userName: session.user.name || session.user.email || "Unknown",
      newData: data,
    });

  } catch (e) {
    console.error(e);
    return { message: "Failed to create purchase: " + (e instanceof Error ? e.message : String(e)) };
  }

  revalidatePath("/purchases");
  redirect("/purchases");
}

export async function updatePurchase(id: string, prevState: unknown, formData: FormData) {
  const session = await auth();
  if (!session) return { message: "Unauthorized" };

  const raw = Object.fromEntries(formData.entries());
  
  let items: unknown[] = [];
  if (typeof raw.items === "string") {
    try {
      items = JSON.parse(raw.items);
    } catch {
      return { message: "Invalid items data" };
    }
  }

  const payload = { ...raw, items };
  const parsed = purchaseSchema.safeParse(payload);

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  const totalAmount = data.items.reduce((sum, item) => sum + item.totalCost, 0);

  try {
    const purchase = await prisma.$transaction(async (tx) => {
        // 1. Delete existing items (will fail if sold)
        // Check for sold items first?
        const soldItems = await tx.inventory.findFirst({
            where: {
                purchaseId: id,
                status: { not: "IN_STOCK" }
            }
        });

        if (soldItems) {
            throw new Error("Cannot update purchase: Some items are sold or not in stock.");
        }

        await tx.inventory.deleteMany({
            where: { purchaseId: id }
        });

        // 2. Update purchase
        const p = await tx.purchase.update({
            where: { id },
            data: {
                vendorId: data.vendorId,
                purchaseDate: data.purchaseDate,
                invoiceNo: data.invoiceNo,
                paymentMode: data.paymentMode,
                paymentStatus: data.paymentStatus,
                notes: data.remarks,
                totalAmount,
            },
        });

        // 3. Recreate items
        for (const item of data.items) {
             const weightValue = item.quantity;
             const weightUnit = item.weightType;
             
             let categoryCode = "XX";
             const cat = await tx.categoryCode.findFirst({ where: { name: item.category } });
             if (cat) categoryCode = cat.code;
             
             const gemstoneCode = "GEM"; 
             
             const sku = await generateSku(tx, {
                 categoryCode,
                 gemstoneCode,
                 colorCode: "XX",
                 weightValue,
                 weightUnit
             });

             const weightRatti = calculateRatti(weightValue, weightUnit);

             await tx.inventory.create({
                 data: {
                     sku,
                     itemName: item.itemName,
                     category: item.category,
                     categoryCodeId: cat ? cat.id : undefined,
                     shape: item.shape,
                     dimensionsMm: item.sizeValue ? `${item.sizeValue} ${item.sizeUnit || ''}`.trim() : undefined,
                     beadSizeMm: item.beadSizeMm,
                     weightValue,
                     weightUnit,
                     weightRatti,
                     carats: weightValue,
                     pieces: 1, 
                     costPrice: item.totalCost,
                     sellingPrice: 0, 
                     purchaseRatePerCarat: item.costPerUnit,
                     purchaseId: p.id,
                     vendorId: data.vendorId,
                     notes: item.remarks,
                     status: "IN_STOCK"
                 }
             });
        }
        return p;
    });

    await logActivity({
      entityType: "Purchase",
      entityId: purchase.id,
      entityIdentifier: purchase.invoiceNo || "No Invoice",
      actionType: "EDIT",
      source: "WEB",
      userId: session.user.id,
      userName: session.user.name || session.user.email || "Unknown",
      newData: data,
    });

  } catch (e) {
    console.error(e);
    return { message: "Failed to update purchase: " + (e instanceof Error ? e.message : String(e)) };
  }

  revalidatePath("/purchases");
  redirect("/purchases");
}

export async function updatePurchaseInvoice(formData: FormData) {
  const session = await auth();
  if (!session) return { message: "Unauthorized" };

  const raw = Object.fromEntries(formData.entries());
  const parsed = updateInvoiceSchema.safeParse(raw);

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { purchaseId, invoiceNo } = parsed.data;

  try {
    const purchase = await prisma.purchase.update({
      where: { id: purchaseId },
      data: { invoiceNo },
    });

    await logActivity({
        entityType: "Purchase",
        entityId: purchase.id,
        entityIdentifier: purchase.invoiceNo || "No Invoice",
        actionType: "EDIT",
        source: "WEB",
        userId: session.user.id,
        userName: session.user.name || session.user.email || "Unknown",
        oldData: { invoiceNo: "OLD_VALUE" }, 
        newData: { invoiceNo }
    });

  } catch {
    return { message: "Failed to update invoice number" };
  }

  revalidatePath(`/purchases/${purchaseId}`);
  return { message: "Invoice updated" };
}

export type PurchaseImportRow = {
    vendorName: string;
    purchaseDate?: string;
    invoiceNo?: string;
    itemName: string;
    category: string;
    shape?: string;
    sizeValue?: string;
    sizeUnit?: string;
    beadSizeMm?: string;
    weightType?: string;
    quantity?: string;
    costPerUnit?: string;
    totalCost?: string;
    itemRemarks?: string;
    paymentMode?: string;
    paymentStatus?: string;
    remarks?: string;
};

export type PurchaseImportError = {
  row: number;
  error: string;
};

export async function importPurchases(rows: PurchaseImportRow[]) {
    const session = await auth();
    if (!session) return { success: false, message: "Unauthorized" };

    const errors: PurchaseImportError[] = [];
    let successCount = 0;

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
            const vendor = await prisma.vendor.findFirst({
                where: { name: { contains: row.vendorName || "" } }
            });

            if (!vendor) {
                errors.push({ row: i + 1, error: `Vendor '${row.vendorName}' not found` });
                continue;
            }

            // Calculate total amount for this row (assuming row is one item purchase?)
            // CSV import logic usually implies one item per row, but maybe multiple rows per purchase?
            // The logic here creates ONE purchase per row.
            const totalCost = Number(row.totalCost) || 0;

            await prisma.$transaction(async (tx) => {
                 const p = await tx.purchase.create({
                    data: {
                        vendorId: vendor.id,
                        purchaseDate: row.purchaseDate ? new Date(row.purchaseDate) : new Date(),
                        invoiceNo: row.invoiceNo,
                        paymentMode: row.paymentMode,
                        paymentStatus: row.paymentStatus || "PENDING",
                        notes: row.remarks,
                        totalAmount: totalCost,
                    }
                });
                
                // Create Inventory Item
                const weightValue = Number(row.quantity) || 1;
                const weightUnit = row.weightType || "cts";
                
                let categoryCode = "XX";
                const cat = await tx.categoryCode.findFirst({ where: { name: row.category } });
                if (cat) categoryCode = cat.code;
                
                const sku = await generateSku(tx, {
                     categoryCode,
                     gemstoneCode: "GEM",
                     colorCode: "XX",
                     weightValue,
                     weightUnit
                });
                
                const weightRatti = calculateRatti(weightValue, weightUnit);

                await tx.inventory.create({
                     data: {
                         sku,
                         itemName: row.itemName || "Imported Item",
                         category: row.category || "Other",
                         categoryCodeId: cat ? cat.id : undefined,
                         shape: row.shape,
                         dimensionsMm: row.sizeValue ? `${row.sizeValue} ${row.sizeUnit || ''}`.trim() : undefined,
                         beadSizeMm: Number(row.beadSizeMm) || undefined,
                         weightValue,
                         weightUnit,
                         weightRatti,
                         carats: weightValue,
                         pieces: 1, 
                         costPrice: totalCost,
                         sellingPrice: 0,
                         purchaseRatePerCarat: Number(row.costPerUnit) || 0,
                         purchaseId: p.id,
                         vendorId: vendor.id,
                         notes: row.itemRemarks,
                         status: "IN_STOCK"
                     }
                 });

                 await logActivity({
                    entityType: "Purchase",
                    entityId: p.id,
                    entityIdentifier: p.invoiceNo || "No Invoice",
                    actionType: "CREATE",
                    userId: session.user.id,
                    userName: session.user.name || session.user.email || "Unknown",
                    source: "CSV_IMPORT"
                });
            });

            successCount++;
        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : "Unknown error";
            errors.push({ row: i + 1, error: errorMessage });
        }
    }

    revalidatePath("/purchases");
    return { 
        success: successCount > 0, 
        message: `Imported ${successCount} purchases. ${errors.length} failed.`, 
        errors 
    };
}

export async function deletePurchaseAction(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;
  
  const session = await auth();
  if (!session) return;

  try {
    // Check if can be deleted (inventory items not sold)
    const soldItems = await prisma.inventory.findFirst({
        where: {
            purchaseId: id,
            status: { not: "IN_STOCK" }
        }
    });
    
    if (soldItems) {
        // Cannot delete
        console.error("Cannot delete purchase with sold items");
        return; // Or throw/notify user
    }

    // Delete inventory items first? No, cascade?
    // Inventory does not cascade on delete of Purchase (no onDelete: Cascade in schema)
    // So we must delete manually.
    await prisma.$transaction(async (tx) => {
        await tx.inventory.deleteMany({
            where: { purchaseId: id }
        });
        
        const purchase = await tx.purchase.delete({
            where: { id }
        });
        
        await logActivity({
            entityType: "Purchase",
            entityId: purchase.id,
            entityIdentifier: purchase.invoiceNo || "No Invoice",
            actionType: "DELETE",
            source: "WEB",
            userId: session.user.id,
            userName: session.user.name || session.user.email || "Unknown",
        });
    });

  } catch (e) {
    console.error(e);
  }

  revalidatePath("/purchases");
  redirect("/purchases");
}
