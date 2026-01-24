"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";
import { generateQuotationToken, generateInvoiceToken } from "@/lib/tokens";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";

const quotationSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerMobile: z.string().optional(),
  customerEmail: z.string().email().optional().or(z.literal("")),
  customerCity: z.string().optional(),
  expiryDate: z.coerce.date(),
  items: z.array(z.object({
    inventoryId: z.string(),
    price: z.number().min(0)
  })).min(1, "Select at least one item"),
  status: z.enum(["DRAFT", "ACTIVE"]).optional().default("DRAFT"),
});

export async function createQuotation(prevState: unknown, formData: FormData) {
  const perm = await checkPermission(PERMISSIONS.QUOTATION_CREATE);
  if (!perm.success) return { message: perm.message };

  const session = await auth();
  if (!session) return { message: "Unauthorized" };

  const raw = Object.fromEntries(formData.entries());

  let itemsData: { inventoryId: string; price: number }[] = [];
  try {
    if (typeof raw.items === "string") {
      itemsData = JSON.parse(raw.items);
    } else if (typeof raw.itemIds === "string") {
      // Legacy fallback
      const ids = JSON.parse(raw.itemIds);
      // We don't have prices here, so we'll rely on DB fetch defaults later, 
      // but for schema validation we need structure. 
      // Let's assume the frontend will always send 'items' now.
      itemsData = ids.map((id: string) => ({ inventoryId: id, price: 0 }));
    }
  } catch {
    return { message: "Invalid items data" };
  }

  const payload = { ...raw, items: itemsData };
  const parsed = quotationSchema.safeParse(payload);

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  const itemIds = data.items.map(i => i.inventoryId);

  const inventoryItems = await prisma.inventory.findMany({
    where: { id: { in: itemIds } },
  });

  if (inventoryItems.length === 0) {
    return { message: "No inventory items found for quotation" };
  }

  let totalAmount = 0;
  const quotationItemsData = data.items.map((itemInput) => {
    const inventoryItem = inventoryItems.find(i => i.id === itemInput.inventoryId);
    if (!inventoryItem) return null;

    // Calculate ERP base price (system price)
    let erpBasePrice = 0;
    if (inventoryItem.pricingMode === "PER_CARAT") {
      erpBasePrice = (inventoryItem.sellingRatePerCarat || 0) * (inventoryItem.weightValue || 0);
    } else {
      erpBasePrice = inventoryItem.flatSellingPrice || 0;
    }

    // Use provided price (override) or fall back to ERP price if 0 (though 0 might be valid, usually we want system price default)
    // However, if the user explicitly set 0, it's 0.
    // In the form, we will initialize with ERP price.
    const finalPrice = itemInput.price;

    totalAmount += finalPrice;

    return {
      inventoryId: inventoryItem.id,
      sku: inventoryItem.sku,
      itemName: inventoryItem.itemName,
      weight: `${inventoryItem.weightValue} ${inventoryItem.weightUnit}`,
      erpBasePrice,
      quotedPrice: finalPrice, // This is the price used for the quote
    };
  }).filter((i): i is NonNullable<typeof i> => i !== null);

  let quotationId: string | undefined;

  try {
    const quotation = await prisma.$transaction(async (tx) => {
      const count = await tx.quotation.count();
      const year = new Date().getFullYear();
      const quotationNumber = `QTN-${year}-${(count + 1)
        .toString()
        .padStart(4, "0")}`;
      const token = generateQuotationToken();

      return tx.quotation.create({
        data: {
          quotationNumber,
          customerName: data.customerName,
          customerMobile: data.customerMobile,
          customerEmail: data.customerEmail || null,
          customerCity: data.customerCity,
          expiryDate: data.expiryDate,
          totalAmount,
          token,
          status: data.status, 
          createdById: session.user.id,
          items: {
            createMany: {
              data: quotationItemsData.map(item => ({
                ...item,
                finalUnitPrice: item.quotedPrice,
                subtotal: item.quotedPrice,
                quantity: 1,
              })),
            },
          },
        },
      });
    });

    quotationId = quotation.id;

    await logActivity({
      entityType: "Quotation",
      entityId: quotation.id,
      entityIdentifier: quotation.quotationNumber,
      actionType: "CREATE",
      source: "WEB",
      userId: session.user?.id || "system",
      userName: session.user?.name || "Unknown",
    });

    revalidatePath("/quotes");
  } catch (e) {
    console.error(e);
    return { message: "Failed to create quotation" };
  }

  if (quotationId) {
    redirect(`/quotes/${quotationId}`);
  }
}

export async function updateQuotation(
  id: string,
  prevState: unknown,
  formData: FormData
) {
  const session = await auth();
  if (!session) return { message: "Unauthorized" };

  const raw = Object.fromEntries(formData.entries());

  let itemsData: { inventoryId: string; price: number }[] = [];
  try {
    if (typeof raw.items === "string") {
      itemsData = JSON.parse(raw.items);
    } else if (typeof raw.itemIds === "string") {
      const ids = JSON.parse(raw.itemIds);
      itemsData = ids.map((id: string) => ({ inventoryId: id, price: 0 }));
    }
  } catch {
    return { message: "Invalid items data" };
  }

  const payload = { ...raw, items: itemsData };
  const parsed = quotationSchema.safeParse(payload);

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  const quote = await prisma.quotation.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!quote) return { message: "Quotation not found" };
  
  // Allow editing DRAFT and ACTIVE (before sent/accepted)
  if (!["DRAFT", "ACTIVE"].includes(quote.status)) {
    return { message: "Cannot edit quotation in current status" };
  }

  const itemIds = data.items.map(i => i.inventoryId);
  const inventoryItems = await prisma.inventory.findMany({
    where: { id: { in: itemIds } },
  });

  let totalAmount = 0;
  const quotationItemsData = data.items.map((itemInput) => {
    const inventoryItem = inventoryItems.find(i => i.id === itemInput.inventoryId);
    if (!inventoryItem) return null;

    let erpBasePrice = 0;
    if (inventoryItem.pricingMode === "PER_CARAT") {
      erpBasePrice = (inventoryItem.sellingRatePerCarat || 0) * (inventoryItem.weightValue || 0);
    } else {
      erpBasePrice = inventoryItem.flatSellingPrice || 0;
    }

    const finalPrice = itemInput.price;
    totalAmount += finalPrice;

    return {
      inventoryId: inventoryItem.id,
      sku: inventoryItem.sku,
      itemName: inventoryItem.itemName,
      weight: `${inventoryItem.weightValue} ${inventoryItem.weightUnit}`,
      erpBasePrice,
      quotedPrice: finalPrice,
    };
  }).filter((i): i is NonNullable<typeof i> => i !== null);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.quotationItem.deleteMany({ where: { quotationId: id } });

      await tx.quotation.update({
        where: { id },
        data: {
          customerName: data.customerName,
          customerMobile: data.customerMobile,
          customerEmail: data.customerEmail,
          customerCity: data.customerCity,
          expiryDate: data.expiryDate,
          totalAmount,
          status: data.status || quote.status, // Preserve status if not provided, or update if provided (e.g. Save Draft vs Submit)
          items: {
            createMany: {
              data: quotationItemsData.map(item => ({
                ...item,
                finalUnitPrice: item.quotedPrice,
                subtotal: item.quotedPrice,
                quantity: 1,
              })),
            },
          },
        },
      });
    });

    await logActivity({
      entityType: "Quotation",
      entityId: id,
      entityIdentifier: quote.quotationNumber,
      actionType: "EDIT",
      source: "WEB",
      userId: session.user?.id || "system",
      userName: session.user?.name || "Unknown",
    });
  } catch (e) {
    console.error(e);
    return { message: "Failed to update quotation" };
  }

  revalidatePath("/quotes");
  revalidatePath(`/quotes/${id}`);
  redirect(`/quotes/${id}`);
}

export async function cancelQuotation(id: string) {
  const session = await auth();
  if (!session) return { message: "Unauthorized" };

  try {
    const quote = await prisma.quotation.findUnique({ where: { id } });
    if (!quote) return { message: "Quotation not found" };

    await prisma.quotation.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    await logActivity({
      entityType: "Quotation",
      entityId: id,
      entityIdentifier: quote.quotationNumber,
      actionType: "STATUS_CHANGE",
      source: "WEB",
      userId: session.user?.id || "system",
      userName: session.user?.name || "Unknown",
    });

    revalidatePath("/quotes");
    revalidatePath(`/quotes/${id}`);
  } catch (e) {
    console.error(e);
    return { message: "Failed to cancel quotation" };
  }
}

export async function sendQuotation(id: string) {
  const session = await auth();
  if (!session) return { message: "Unauthorized" };

  try {
    const quote = await prisma.quotation.findUnique({ where: { id } });
    if (!quote) return { message: "Quotation not found" };

    await prisma.quotation.update({
      where: { id },
      data: { status: "SENT" },
    });

    await logActivity({
      entityType: "Quotation",
      entityId: id,
      entityIdentifier: quote.quotationNumber,
      actionType: "STATUS_CHANGE",
      source: "WEB",
      userId: session.user?.id || "system",
      userName: session.user?.name || "Unknown",
    });

    revalidatePath("/quotes");
    revalidatePath(`/quotes/${id}`);
  } catch (e) {
    console.error(e);
    return { message: "Failed to send quotation" };
  }
}

export async function convertQuotationToInvoice(id: string) {
  const session = await auth();
  if (!session) return { message: "Unauthorized" };

  const perm = await checkPermission(PERMISSIONS.SALES_CREATE);
  if (!perm.success) return { message: perm.message };

  try {
    const quote = await prisma.quotation.findUnique({
      where: { id },
      include: { items: true, invoices: true }
    });

    if (!quote) return { message: "Quotation not found" };
    if (quote.invoices.length > 0) return { message: "Quotation already converted to invoice" };
    // Allow APPROVED, SENT, ACCEPTED.
    if (!["APPROVED", "ACCEPTED", "SENT"].includes(quote.status)) {
        return { message: "Quotation must be Approved, Sent or Accepted to convert" };
    }

    // Check if items are still in stock
    const itemIds = quote.items.map(i => i.inventoryId).filter((id): id is string => !!id);
    const inventoryItems = await prisma.inventory.findMany({
      where: { id: { in: itemIds } }
    });

    const soldItems = inventoryItems.filter(i => i.status === "SOLD");
    if (soldItems.length > 0) {
        return { message: `Some items are already sold: ${soldItems.map(i => i.sku).join(", ")}` };
    }

    const invoiceId = await prisma.$transaction(async (tx) => {
      // 1. Generate Invoice Number
      const count = await tx.invoice.count();
      const year = new Date().getFullYear();
      const invoiceNumber = `INV-${year}-${(count + 1).toString().padStart(4, "0")}`;
      const token = generateInvoiceToken();

      // 2. Create Invoice
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          token,
          quotationId: quote.id,
          isActive: true,
          subtotal: quote.totalAmount,
          taxTotal: 0,
          discountTotal: 0,
          totalAmount: quote.totalAmount
        }
      });

      // 3. Create Sales for each item
      for (const item of quote.items) {
        if (!item.inventoryId) continue;
        const inv = inventoryItems.find(i => i.id === item.inventoryId);
        if (!inv) continue;

        // Calculate Cost & Profit
        let cost = 0;
        if (inv.pricingMode === "PER_CARAT") {
            cost = (inv.purchaseRatePerCarat || 0) * (inv.weightValue || 0);
        } else {
            cost = inv.flatPurchaseCost || 0;
        }
        const profit = item.quotedPrice - cost;

        await tx.sale.create({
          data: {
            inventoryId: inv.id,
            invoiceId: invoice.id,
            platform: "OFFLINE", // Default
            saleDate: new Date(),
            customerName: quote.customerName,
            customerPhone: quote.customerMobile,
            customerEmail: quote.customerEmail,
            customerCity: quote.customerCity,
            salePrice: item.quotedPrice, // schema has salePrice, not sellingPrice
            discountAmount: 0, // schema has discountAmount
            netAmount: item.quotedPrice,
            profit: profit,
            paymentStatus: "PENDING",
            // paymentMode: "BANK_TRANSFER", // schema has paymentMethod
            paymentMethod: "BANK_TRANSFER", 
            notes: `Converted from Quotation ${quote.quotationNumber}`, // schema has notes, not remarks
          }
        });

        // 4. Update Inventory Status
        await tx.inventory.update({
            where: { id: inv.id },
            data: { status: "SOLD" }
        });
      }

      // 5. Update Quotation Status
      await tx.quotation.update({
        where: { id: quote.id },
        data: { status: "CONVERTED" }
      });

      return invoice.id;
    });

    await logActivity({
      entityType: "Invoice",
      entityId: invoiceId,
      entityIdentifier: "New Invoice",
      actionType: "CREATE",
      source: "WEB",
      userId: session.user?.id || "system",
      userName: session.user?.name || "Unknown",
    });

    return { success: true, invoiceId };

  } catch (e) {
    console.error(e);
    return { message: "Failed to convert to invoice" };
  }
}
