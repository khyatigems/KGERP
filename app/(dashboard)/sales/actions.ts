"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateInvoiceToken } from "@/lib/tokens";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

const saleSchema = z.object({
  inventoryId: z.string().uuid(),
  platform: z.string().min(1, "Platform is required"),
  saleDate: z.coerce.date(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().optional(),
  customerCity: z.string().optional(),
  sellingPrice: z.coerce.number().positive(),
  discount: z.coerce.number().min(0).default(0),
  paymentMode: z.string().optional(),
  paymentStatus: z.string().optional(),
  shippingMethod: z.string().optional(),
  trackingId: z.string().optional(),
  remarks: z.string().optional(),
  quotationId: z.string().optional(), // If converting from quote
});

export async function createSale(prevState: unknown, formData: FormData) {
  const session = await auth();
  if (!session) {
    return { message: "Unauthorized" };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = saleSchema.safeParse(raw);

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  // Fetch Inventory to check status and get purchase cost for profit calc
  const inventory = await prisma.inventory.findUnique({
      where: { id: data.inventoryId }
  });

  if (!inventory) {
      return { message: "Inventory item not found" };
  }

  if (inventory.status === "SOLD") {
      return { message: "Item is already sold" };
  }

  // Calculate financials
  const netAmount = data.sellingPrice - data.discount;
  
  // Calculate Profit
  // Profit = Net Selling Price - Purchase Cost
  let purchaseCost = 0;
  if (inventory.pricingMode === "PER_CARAT") {
      purchaseCost = (inventory.purchaseRatePerCarat || 0) * inventory.weightValue;
  } else {
      purchaseCost = inventory.flatPurchaseCost || 0;
  }
  
  const profit = netAmount - purchaseCost;

  try {
      await prisma.$transaction(async (tx) => {
          // 1. Create Sale Record
          const sale = await tx.sale.create({
              data: {
                  inventoryId: data.inventoryId,
                  platform: data.platform,
                  saleDate: data.saleDate,
                  customerName: data.customerName,
                  customerPhone: data.customerPhone,
                  customerEmail: data.customerEmail,
                  customerCity: data.customerCity,
                  sellingPrice: data.sellingPrice,
                  discount: data.discount,
                  netAmount: netAmount,
                  profit: profit,
                  paymentMode: data.paymentMode,
                  paymentStatus: data.paymentStatus,
                  shippingMethod: data.shippingMethod,
                  trackingId: data.trackingId,
                  remarks: data.remarks,
              }
          });

          // 2. Update Inventory Status
          await tx.inventory.update({
              where: { id: data.inventoryId },
              data: { status: "SOLD" }
          });

          // 3. Generate Invoice
          // Invoice Number: INV-YYYY-SEQUENCE
          const count = await tx.invoice.count();
          const year = new Date().getFullYear();
          const invoiceNumber = `INV-${year}-${(count + 1).toString().padStart(4, '0')}`;
          const token = generateInvoiceToken();

          await tx.invoice.create({
              data: {
                  invoiceNumber,
                  saleId: sale.id,
                  token,
                  isActive: true
              }
          });

          // 4. If coming from Quotation, update Quotation Status if all items are sold?
          // Or just mark the specific item as converted in context of quote?
          // The schema has status on Quotation, but not per-item status in QuotationItem (except implicit).
          // If we pass quotationId, we might want to check if all items in that quote are now sold.
          if (data.quotationId) {
             // For now, if a quote results in a sale, we can leave the quote ACTIVE or mark CONVERTED.
             // Let's mark CONVERTED for simplicity if it was a single item quote or logic dictates.
             // User didn't specify strict multi-item quote lifecycle, so we'll leave it as is for now.
             // Maybe update status to CONVERTED if it was the only item.
             // We'll skip complex check for now to keep it robust.
             await tx.quotation.update({
                 where: { id: data.quotationId },
                 data: { status: "CONVERTED" }
             });
          }
      });
  } catch (e) {
      console.error(e);
      return { message: "Failed to process sale" };
  }

  revalidatePath("/sales");
  revalidatePath("/inventory");
  revalidatePath("/quotes");
  
  redirect("/sales");
}
