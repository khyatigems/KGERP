"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
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

async function getNextInvoiceNumber() {
  const last = await prisma.purchase.findFirst({
    where: {
      invoiceNo: {
        startsWith: "KGP",
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      invoiceNo: true,
    },
  });

  let nextNumber = 1;

  if (last?.invoiceNo) {
    const match = last.invoiceNo.match(/KGP-?(\d+)/);
    if (match) {
      const current = parseInt(match[1], 10);
      if (!Number.isNaN(current) && current >= 0) {
        nextNumber = current + 1;
      }
    }
  }

  const padded = nextNumber.toString().padStart(4, "0");
  return `KGP-${padded}`;
}

export async function updatePurchase(
  purchaseId: string,
  prevState: unknown,
  formData: FormData
) {
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

  // Fetch old data for logging
  const oldPurchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: { items: true },
  });

  try {
    const updatedPurchase = await prisma.$transaction(async (tx) => {
      // 1. Update purchase basic info
      const updated = await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          vendorId: data.vendorId,
          purchaseDate: data.purchaseDate,
          invoiceNo: data.invoiceNo,
          paymentMode: data.paymentMode,
          paymentStatus: data.paymentStatus,
          remarks: data.remarks,
        },
      });

      // 2. Delete existing items
      await tx.purchaseItem.deleteMany({
        where: { purchaseId: purchaseId },
      });

      // 3. Create new items
      if (data.items.length > 0) {
        await tx.purchaseItem.createMany({
          data: data.items.map((item) => ({
            purchaseId: purchaseId,
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
        });
      }

      return updated;
    });

    // Log Activity
    await logActivity({
      entityType: "Purchase",
      entityId: purchaseId,
      entityIdentifier: updatedPurchase.invoiceNo || "N/A",
      actionType: "EDIT",
      oldData: oldPurchase,
      newData: updatedPurchase,
    });

  } catch (e) {
    console.error("Failed to update purchase", e);
    return { message: "Failed to update purchase. Please try again." };
  }

  revalidatePath("/purchases");
  revalidatePath(`/purchases/${purchaseId}`);
  redirect(`/purchases/${purchaseId}`);
}

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

  let invoiceNo = data.invoiceNo?.trim();
  if (!invoiceNo) {
    invoiceNo = await getNextInvoiceNumber();
  }

  try {
    const newPurchase = await prisma.purchase.create({
      data: {
        vendorId: data.vendorId,
        purchaseDate: data.purchaseDate,
        invoiceNo,
        paymentMode: data.paymentMode,
        paymentStatus: data.paymentStatus,
        remarks: data.remarks,
        items: {
          create: data.items,
        },
      },
    });

    // Log Activity
    await logActivity({
      entityType: "Purchase",
      entityId: newPurchase.id,
      entityIdentifier: newPurchase.invoiceNo || "N/A",
      actionType: "CREATE",
      newData: newPurchase,
    });

  } catch (e) {
    console.error(e);
    return { message: "Failed to create purchase record" };
  }

  revalidatePath("/purchases");
  redirect("/purchases");
}

export async function updatePurchaseInvoice(formData: FormData) {
  const session = await auth();
  if (!session) {
    return { message: "Unauthorized" };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = updateInvoiceSchema.safeParse(raw);

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { purchaseId, invoiceNo } = parsed.data;

  try {
    const oldPurchase = await prisma.purchase.findUnique({ where: { id: purchaseId } });

    const updatedPurchase = await prisma.purchase.update({
      where: { id: purchaseId },
      data: { invoiceNo },
    });

    await logActivity({
        entityType: "Purchase",
        entityId: purchaseId,
        entityIdentifier: updatedPurchase.invoiceNo || "N/A",
        actionType: "EDIT",
        oldData: oldPurchase,
        newData: updatedPurchase,
    });
  } catch (e) {
    console.error(e);
    return { message: "Failed to update invoice number" };
  }

  revalidatePath("/purchases");
  revalidatePath(`/purchases/${purchaseId}`);

  return { success: true };
}

type PurchaseImportRow = {
  vendorName?: string;
  purchaseDate?: string;
  invoiceNo?: string;
  paymentMode?: string;
  paymentStatus?: string;
  remarks?: string;
  itemName?: string;
  category?: string;
  shape?: string;
  sizeValue?: string;
  sizeUnit?: string;
  beadSizeMm?: number | string;
  weightType?: string;
  quantity?: number | string;
  costPerUnit?: number | string;
  totalCost?: number | string;
  itemRemarks?: string;
};

type PurchaseImportError = {
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
                        }]
                    }
                }
            });

            await logActivity({
                entityType: "Purchase",
                entityId: newPurchase.id,
                entityIdentifier: newPurchase.invoiceNo || "No Invoice",
                actionType: "CREATE",
                userId: session.user.id,
                userName: session.user.name || session.user.email,
                source: "CSV_IMPORT"
            });

            successCount++;
        } catch (e: any) {
            errors.push({ row: i + 1, error: e.message });
        }
    }

    revalidatePath("/purchases");
    return { 
        success: successCount > 0, 
        message: `Imported ${successCount} purchases. ${errors.length} failed.`, 
        errors 
    };
}
