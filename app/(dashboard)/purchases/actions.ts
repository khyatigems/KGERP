"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";

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

// async function getNextInvoiceNumber() {
//   const last = await prisma.purchase.findFirst({
//     where: {
//       invoiceNo: {
//         startsWith: "KGP",
//       },
//     },
//     orderBy: {
//       createdAt: "desc",
//     },
//     select: {
//       invoiceNo: true,
//     },
//   });

//   if (!last?.invoiceNo) return "KGP-0001";

//   const num = parseInt(last.invoiceNo.split("-")[1]);
//   return `KGP-${(num + 1).toString().padStart(4, "0")}`;
// }

export async function createPurchase(prevState: unknown, formData: FormData) {
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

  try {
    const purchase = await prisma.purchase.create({
      data: {
        vendorId: data.vendorId,
        purchaseDate: data.purchaseDate,
        invoiceNo: data.invoiceNo,
        paymentMode: data.paymentMode,
        paymentStatus: data.paymentStatus,
        remarks: data.remarks,
        items: {
          create: data.items.map(
            (item): Prisma.PurchaseItemCreateWithoutPurchaseInput => ({
              itemName: item.itemName,
              category: item.category,
              shape: item.shape,
              sizeValue: item.sizeValue,
              sizeUnit: item.sizeUnit,
              beadSizeMm: item.beadSizeMm,
              weightType: item.weightType,
              quantity: item.quantity,
              costPerUnit: item.costPerUnit,
              totalCost: item.totalCost,
              remarks: item.remarks,
            })
          ),
        },
      },
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
    return { message: "Failed to create purchase" };
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

  try {
    const purchase = await prisma.$transaction(async (tx) => {
        // 1. Delete existing items
        await tx.purchaseItem.deleteMany({
            where: { purchaseId: id }
        });

        // 2. Update purchase and create new items
        return await tx.purchase.update({
            where: { id },
            data: {
                vendorId: data.vendorId,
                purchaseDate: data.purchaseDate,
                invoiceNo: data.invoiceNo,
                paymentMode: data.paymentMode,
                paymentStatus: data.paymentStatus,
                remarks: data.remarks,
                items: {
                    create: data.items.map((item) => ({
                        itemName: item.itemName,
                        category: item.category,
                        shape: item.shape,
                        sizeValue: item.sizeValue,
                        sizeUnit: item.sizeUnit,
                        beadSizeMm: item.beadSizeMm,
                        weightType: item.weightType,
                        quantity: item.quantity,
                        costPerUnit: item.costPerUnit,
                        totalCost: item.totalCost,
                        remarks: item.remarks,
                    })),
                },
            },
        });
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
    return { message: "Failed to update purchase" };
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
        oldData: { invoiceNo: "OLD_VALUE" }, // Ideally fetch old
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

            const newPurchase = await prisma.purchase.create({
                data: {
                    vendorId: vendor.id,
                    purchaseDate: row.purchaseDate ? new Date(row.purchaseDate) : new Date(),
                    invoiceNo: row.invoiceNo,
                    paymentMode: row.paymentMode,
                    paymentStatus: row.paymentStatus || "PENDING",
                    remarks: row.remarks,
                    items: {
                        create: [{
                            itemName: row.itemName || "Imported Item",
                            category: row.category || "Other",
                            shape: row.shape,
                            sizeValue: row.sizeValue,
                            sizeUnit: row.sizeUnit,
                            beadSizeMm: Number(row.beadSizeMm) || 0,
                            weightType: row.weightType || "cts",
                            quantity: Number(row.quantity) || 1,
                            costPerUnit: Number(row.costPerUnit) || 0,
                            totalCost: Number(row.totalCost) || 0,
                            remarks: row.itemRemarks
                        } satisfies Prisma.PurchaseItemCreateWithoutPurchaseInput]
                    }
                }
            });

            await logActivity({
                entityType: "Purchase",
                entityId: newPurchase.id,
                entityIdentifier: newPurchase.invoiceNo || "No Invoice",
                actionType: "CREATE",
                userId: session.user.id,
                userName: session.user.name || session.user.email || "Unknown",
                source: "CSV_IMPORT"
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
    const purchase = await prisma.purchase.delete({
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

  } catch (e) {
    console.error(e);
  }

  revalidatePath("/purchases");
  redirect("/purchases");
}
