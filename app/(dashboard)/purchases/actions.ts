"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { getNextPurchaseNumber } from "@/lib/purchase-numbering";

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

const purchasePaymentSchema = z.object({
  amount: z.coerce.number().positive(),
  method: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CHEQUE"]),
  date: z.coerce.date(),
  reference: z.string().optional(),
  chequeNumber: z.string().optional(),
  bankName: z.string().optional(),
  chequePayee: z.string().optional(),
  chequeDate: z.preprocess(
    (value) => value === "" || value === null ? undefined : value,
    z.coerce.date().optional(),
  ),
  notes: z.string().optional(),
});

const purchaseSchema = z.object({
  vendorId: z.string().uuid("Vendor required"),
  purchaseDate: z.coerce.date(),
  invoiceNo: z.string().optional(),
  paymentMode: z.string().optional(),
  paymentStatus: z.string().optional(),
  remarks: z.string().optional(),
  payments: z.array(purchasePaymentSchema).optional().default([]),
  items: z.array(purchaseItemSchema).min(1, "Add at least one item"),
});

const updateInvoiceSchema = z.object({
  purchaseId: z.string().uuid("Invalid purchase"),
  invoiceNo: z.string().min(1, "Invoice number is required"),
});

function parseJsonArray(value: unknown): unknown[] | null {
  if (typeof value !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// Money is stored/compared at 2 decimals so float noise never shows a
// purchase as PARTIAL with a ₹0.00 due amount.
function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function createPurchase(prevState: unknown, formData: FormData) {
  const perm = await checkPermission(PERMISSIONS.INVENTORY_CREATE);
  if (!perm.success) return { message: perm.message };

  const session = await auth();
  if (!session) return { message: "Unauthorized" };

  const raw = Object.fromEntries(formData.entries());
  
  const items = parseJsonArray(raw.items);
  const payments = parseJsonArray(raw.payments);
  if (!items) return { message: "Invalid items data" };
  if (!payments) return { message: "Invalid payments data" };

  const payload = { ...raw, items, payments };
  const parsed = purchaseSchema.safeParse(payload);

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  for (const payment of data.payments) {
    if (["UPI", "BANK_TRANSFER"].includes(payment.method) && !payment.reference?.trim()) {
      return { message: "Reference number is required for UPI and bank transfer payments" };
    }
    if (payment.method === "CHEQUE" && (!payment.chequeNumber || !payment.bankName || !payment.chequePayee || !payment.chequeDate)) {
      return { message: "Cheque number, bank name, payee and cheque date are required" };
    }
  }

  // Calculate total amount
  const totalAmount = round2(data.items.reduce((sum, item) => sum + item.totalCost, 0));

  try {
    const purchase = await prisma.$transaction(async (tx) => {
        const inputInvoiceNo = (data.invoiceNo || "").trim();
        let invoiceNo = inputInvoiceNo || (await getNextPurchaseNumber());

        // Never store two purchases under the same number. A stale form (browser
        // back button, second tab) can submit a number that already exists, so
        // fall back to the next free number instead of duplicating the entry.
        for (let attempt = 0; attempt <= 5; attempt++) {
          const clash = await tx.purchase.findFirst({
            where: { invoiceNo },
            select: { id: true },
          });
          if (!clash) break;
          if (attempt === 5) {
            throw new Error(`Purchase number ${invoiceNo} is already in use`);
          }
          invoiceNo = await getNextPurchaseNumber();
        }

        const paidAmount = round2(data.payments.reduce((sum, payment) => sum + payment.amount, 0));
        const paymentStatus = paidAmount >= totalAmount ? "PAID" : paidAmount > 0 ? "PARTIAL" : "PENDING";
        const p = await tx.purchase.create({
            data: {
                vendorId: data.vendorId,
                purchaseDate: data.purchaseDate,
                invoiceNo,
                paymentMode: data.payments[0]?.method,
                paymentStatus,
                notes: data.remarks,
                totalAmount,
            }
        });

        if (data.payments.length > 0) {
          await tx.purchasePayment.createMany({
            data: data.payments.map((payment) => ({
              purchaseId: p.id,
              amount: payment.amount,
              date: payment.date,
              method: payment.method,
              reference: payment.reference,
              chequeNumber: payment.chequeNumber,
              bankName: payment.bankName,
              chequePayee: payment.chequePayee,
              chequeDate: payment.chequeDate,
              notes: payment.notes,
            })),
          });
        }

        const itemsData = data.items.map(item => {
             const weightValue = item.quantity;
             const weightUnit = item.weightType;
             
             return {
                 purchaseId: p.id,
                 itemName: item.itemName,
                 category: item.category,
                 shape: item.shape,
                 dimensions: item.sizeValue ? `${item.sizeValue} ${item.sizeUnit || ''}`.trim() : undefined,
                 beadSizeMm: item.beadSizeMm,
                 weightValue,
                 weightUnit,
                 quantity: 1, // Default to 1 piece as per previous logic
                 unitCost: item.costPerUnit,
                 totalCost: item.totalCost,
                 notes: item.remarks,
             };
        });

        if (itemsData.length > 0) {
            await tx.purchaseItem.createMany({
                data: itemsData
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
  return { success: true, message: "Purchase created successfully" };
}

export async function updatePurchase(id: string, prevState: unknown, formData: FormData) {
  const session = await auth();
  if (!session) return { message: "Unauthorized" };

  const raw = Object.fromEntries(formData.entries());
  
  const items = parseJsonArray(raw.items);
  const payments = parseJsonArray(raw.payments);
  if (!items) return { message: "Invalid items data" };
  if (!payments) return { message: "Invalid payments data" };

  const payload = { ...raw, items, payments };
  const parsed = purchaseSchema.safeParse(payload);

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  const totalAmount = round2(data.items.reduce((sum, item) => sum + item.totalCost, 0));

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

        // Cleanup legacy inventory items (unsold)
        await tx.inventory.deleteMany({
            where: { purchaseId: id }
        });

        // Cleanup existing purchase items
        await tx.purchaseItem.deleteMany({
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
        const itemsData = data.items.map(item => {
             const weightValue = item.quantity;
             const weightUnit = item.weightType;
             
             return {
                 purchaseId: p.id,
                 itemName: item.itemName,
                 category: item.category,
                 shape: item.shape,
                 dimensions: item.sizeValue ? `${item.sizeValue} ${item.sizeUnit || ''}`.trim() : undefined,
                 beadSizeMm: item.beadSizeMm,
                 weightValue,
                 weightUnit,
                 quantity: 1,
                 unitCost: item.costPerUnit,
                 totalCost: item.totalCost,
                 notes: item.remarks,
             };
        });

        if (itemsData.length > 0) {
            await tx.purchaseItem.createMany({
                data: itemsData
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
  // redirect("/purchases");
  return { success: true, message: "Purchase updated successfully" };
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
                
                // Create PurchaseItem
                const weightValue = Number(row.quantity) || 1;
                const weightUnit = row.weightType || "cts";
                
                await tx.purchaseItem.create({
                     data: {
                         purchaseId: p.id,
                         itemName: row.itemName || "Imported Item",
                         category: row.category || "Other",
                         shape: row.shape,
                         dimensions: row.sizeValue ? `${row.sizeValue} ${row.sizeUnit || ''}`.trim() : undefined,
                         beadSizeMm: Number(row.beadSizeMm) || undefined,
                         weightValue,
                         weightUnit,
                         quantity: 1,
                         unitCost: Number(row.costPerUnit) || 0,
                         totalCost: totalCost,
                         notes: row.itemRemarks,
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
