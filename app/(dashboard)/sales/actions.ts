"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { randomBytes } from "crypto";

const saleSchema = z.object({
  inventoryId: z.string().uuid("Please select an item"),
  platform: z.string().min(1, "Platform is required"),
  saleDate: z.coerce.date(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email().optional().or(z.literal("")),
  customerCity: z.string().optional(),
  sellingPrice: z.coerce.number().positive("Selling price must be positive"),
  discount: z.coerce.number().min(0).optional(),
  paymentMode: z.string().optional(),
  paymentStatus: z.string().optional(),
  shippingMethod: z.string().optional(),
  trackingId: z.string().optional(),
  remarks: z.string().optional(),
});

function generateInvoiceToken() {
  return randomBytes(16).toString("hex");
}

export async function createSale(prevState: unknown, formData: FormData) {
  const session = await auth();
  if (!session) {
    return { message: "Unauthorized" };
  }

  // Permission check? Assuming INVENTORY_MARK_SOLD implies creating sales
  if (!hasPermission(session.user.role || "STAFF", PERMISSIONS.INVENTORY_MARK_SOLD)) {
      return { message: "Insufficient permissions to sell items" };
  }

  const rawData = Object.fromEntries(formData.entries());

  const parsed = saleSchema.safeParse(rawData);
  if (!parsed.success) {
    return { message: "Invalid data", errors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  try {
      // Check if item exists and is in stock
      const item = await prisma.inventory.findUnique({ where: { id: data.inventoryId }});
      if (!item) return { message: "Item not found" };
      if (item.status !== "IN_STOCK" && item.status !== "RESERVED") {
          return { message: "Item is not available for sale" };
      }

      const sellingPrice = data.sellingPrice;
      const discount = data.discount || 0;
      const netAmount = sellingPrice - discount;
      
      // Calculate profit
      // Profit = NetAmount - (PurchaseCost + Expenses)
      // For now, simple: NetAmount - (FlatPurchaseCost || (Weight * Rate))
      let cost = item.flatPurchaseCost || 0;
      if (cost === 0 && item.purchaseRatePerCarat && item.weightValue) {
          cost = item.purchaseRatePerCarat * item.weightValue; // Assuming cts
      }
      
      const profit = netAmount - cost;

      await prisma.$transaction(async (tx) => {
          // 1. Create Sale
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
      });

      await logActivity({
          entityType: "Sale",
          entityId: data.inventoryId, // or sale ID, but inventoryId is good for tracking item history
          entityIdentifier: item.sku,
          actionType: "CREATE", // or STATUS_CHANGE
          source: "WEB",
          userId: session.user.id,
          userName: session.user.name || session.user.email || "Unknown",
          newData: data
      });

  } catch (e) {
      console.error(e);
      return { message: "Failed to create sale" };
  }

  revalidatePath("/sales");
  revalidatePath("/inventory");
  redirect("/sales");
}

export async function deleteSale(id: string) {
  const session = await auth();
  if (!session) return { message: "Unauthorized" };

  if (!hasPermission(session.user.role || "STAFF", PERMISSIONS.SALES_DELETE)) {
      return { message: "Insufficient permissions" };
  }

  const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
          inventory: true
      }
  });

  if (!sale) return { message: "Sale not found" };

  try {
      await prisma.$transaction(async (tx) => {
          await tx.inventory.update({
              where: { id: sale.inventoryId },
              data: { status: "IN_STOCK" }
          });

          await tx.sale.delete({
              where: { id }
          });

          await tx.invoice.deleteMany({
              where: { saleId: id }
          });
      });

      await logActivity({
          entityType: "Sale",
          entityId: id,
          entityIdentifier: sale.inventory.sku,
          actionType: "DELETE",
          source: "WEB",
          userId: session.user?.id || "system",
          userName: session.user?.name || "Unknown",
      });

  } catch (e) {
      console.error(e);
      return { message: "Failed to delete sale" };
  }

  revalidatePath("/sales");
  revalidatePath("/inventory");
}
