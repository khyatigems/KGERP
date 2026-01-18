"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";
import { generateQuotationToken } from "@/lib/tokens";

const quotationSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerMobile: z.string().optional(),
  customerEmail: z.string().email().optional().or(z.literal("")),
  customerCity: z.string().optional(),
  expiryDate: z.coerce.date(),
  itemIds: z.array(z.string()).min(1, "Select at least one item"),
});

export async function createQuotation(prevState: unknown, formData: FormData) {
  const session = await auth();
  if (!session) return { message: "Unauthorized" };

  const raw = Object.fromEntries(formData.entries());

  let itemIds: string[] = [];
  if (typeof raw.itemIds === "string") {
    try {
      itemIds = JSON.parse(raw.itemIds);
    } catch (e) {
      itemIds = [raw.itemIds];
    }
  }

  const payload = { ...raw, itemIds };
  const parsed = quotationSchema.safeParse(payload);

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  const items = await prisma.inventory.findMany({
    where: { id: { in: data.itemIds } },
  });

  if (items.length === 0) {
    return { message: "No inventory items found for quotation" };
  }

  let totalAmount = 0;
  const quotationItemsData = items.map((item) => {
    let price = 0;
    if (item.pricingMode === "PER_CARAT") {
      price = (item.sellingRatePerCarat || 0) * item.weightValue;
    } else {
      price = item.flatSellingPrice || 0;
    }
    totalAmount += price;

    return {
      inventoryId: item.id,
      sku: item.sku,
      itemName: item.itemName,
      weight: `${item.weightValue} ${item.weightUnit}`,
      quotedPrice: price,
    };
  });

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
          items: {
            createMany: {
              data: quotationItemsData,
            },
          },
        },
      });
    });

    await logActivity({
      entityType: "Quotation",
      entityId: quotation.id,
      entityIdentifier: quotation.quotationNumber,
      actionType: "CREATE",
      source: "WEB",
      userId: session.user?.id || "system",
      userEmail: session.user?.email,
      userName: session.user?.name,
    });

    revalidatePath("/quotes");
    redirect(`/quotes/${quotation.id}`);
  } catch (e) {
    console.error(e);
    return { message: "Failed to create quotation" };
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

  let itemIds: string[] = [];
  if (typeof raw.itemIds === "string") {
    try {
      itemIds = JSON.parse(raw.itemIds);
    } catch (e) {
      itemIds = [raw.itemIds];
    }
  }

  const payload = { ...raw, itemIds };
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
  if (quote.status !== "ACTIVE") {
    return { message: "Only ACTIVE quotations can be edited" };
  }

  const items = await prisma.inventory.findMany({
    where: { id: { in: data.itemIds } },
  });

  let totalAmount = 0;
  const quotationItemsData = items.map((item) => {
    let price = 0;
    if (item.pricingMode === "PER_CARAT") {
      price = (item.sellingRatePerCarat || 0) * item.weightValue;
    } else {
      price = item.flatSellingPrice || 0;
    }
    totalAmount += price;

    return {
      quotationId: id,
      inventoryId: item.id,
      sku: item.sku,
      itemName: item.itemName,
      weight: `${item.weightValue} ${item.weightUnit}`,
      quotedPrice: price,
    };
  });

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
          items: {
            createMany: {
              data: quotationItemsData.map(({ quotationId, ...rest }) => rest),
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
      userEmail: session.user?.email,
      userName: session.user?.name,
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
      fieldChanges: JSON.stringify({ from: quote.status, to: "CANCELLED" }),
      source: "WEB",
      userId: session.user?.id || "system",
      userEmail: session.user?.email,
      userName: session.user?.name,
    });

    revalidatePath("/quotes");
    revalidatePath(`/quotes/${id}`);
  } catch (e) {
    console.error(e);
    return { message: "Failed to cancel quotation" };
  }
}
