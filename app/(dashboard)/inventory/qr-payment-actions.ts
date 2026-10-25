"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ensureInventoryQrPaymentSchema } from "@/lib/inventory-qr-payment-schema";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";

type QrPaymentConfigInput = {
  enabled: boolean;
  totalAmount: number;
  amountToCollect: number;
  allowPartial: boolean;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  orderReference?: string;
};

export async function saveInventoryQrPaymentAuthorization(inventoryId: string, input: QrPaymentConfigInput) {
  const permission = await checkPermission(PERMISSIONS.INVENTORY_EDIT);
  if (!permission.success) return { success: false, message: permission.message || "You do not have permission to manage QR payment." };
  if (!inventoryId || !input || typeof input.enabled !== "boolean") return { success: false, message: "Invalid payment settings." };
  await ensureInventoryQrPaymentSchema();

  const item = await prisma.inventory.findUnique({ where: { id: inventoryId }, select: { id: true, sku: true, status: true } });
  if (!item) return { success: false, message: "Inventory item was not found." };
  const existing = await prisma.inventoryQrPaymentAuthorization.findUnique({ where: { inventoryId }, select: { id: true, paidAmount: true, saleId: true } });
  if (!input.enabled) {
    if (existing) await prisma.inventoryQrPaymentAuthorization.update({ where: { id: existing.id }, data: { enabled: false, updatedByUserId: permission.session?.user?.id || null } });
    revalidatePath(`/inventory/${inventoryId}`);
    revalidatePath(`/preview/${encodeURIComponent(item.sku)}`);
    return { success: true, message: "QR payment is disabled for this item." };
  }
  if (input.enabled && !["IN_STOCK", "RESERVED"].includes(item.status.toUpperCase())) {
    return { success: false, message: "QR payment can only be enabled for in-stock or reserved items." };
  }

  const totalAmount = Number(input.totalAmount);
  const amountToCollect = Number(input.amountToCollect);
  if (!Number.isFinite(totalAmount) || !Number.isFinite(amountToCollect) || totalAmount <= 0 || amountToCollect <= 0 || totalAmount > 100_000_000 || amountToCollect > totalAmount) {
    return { success: false, message: "Enter a valid total amount and payment amount." };
  }

  const paymentSettings = await prisma.paymentSettings.findFirst({ select: { razorpayEnabled: true, razorpayKeyId: true, razorpayKeySecret: true } });
  if (input.enabled && (!paymentSettings?.razorpayEnabled || !paymentSettings.razorpayKeyId?.trim() || !paymentSettings.razorpayKeySecret?.trim())) {
    return { success: false, message: "Configure and enable Razorpay in Invoice Settings before enabling QR payment." };
  }

  const activeAttempt = existing ? await prisma.inventoryQrPaymentAttempt.findFirst({ where: { authorizationId: existing.id, activeKey: existing.id }, select: { id: true } }) : null;
  if (activeAttempt) return { success: false, message: "A customer checkout is in progress. Wait for it to finish before changing its amount." };
  const paidAmount = Number(existing?.paidAmount || 0);
  const remaining = Number((totalAmount - paidAmount).toFixed(2));
  if (remaining <= 0 || amountToCollect > remaining + 0.01) return { success: false, message: "The payment amount cannot exceed the item's remaining authorized balance." };
  if (!input.allowPartial && Math.abs(amountToCollect - remaining) > 0.01) return { success: false, message: "Enable partial payment to collect less than the remaining balance." };
  if (amountToCollect < remaining && !input.allowPartial) return { success: false, message: "Enable partial payment to collect less than the remaining balance." };
  const email = (input.customerEmail || "").trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { success: false, message: "Enter a valid customer email address." };

  const linkedSales = await prisma.sale.findMany({
    where: { inventoryId },
    orderBy: { saleDate: "desc" },
    take: 20,
    select: {
      id: true,
      customerId: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      paymentStatus: true,
      invoice: { select: { status: true, isActive: true, paymentStatus: true, totalAmount: true, paidAmount: true, sales: { select: { inventoryId: true } } } },
      legacyInvoice: { select: { status: true, isActive: true, paymentStatus: true, totalAmount: true, paidAmount: true, legacySale: { select: { inventoryId: true } } } },
    },
  });
  const hasInvoicePayment = linkedSales.some((sale) => [sale.invoice, sale.legacyInvoice].some((invoice) => {
    if (!invoice || !invoice.isActive || !["ISSUED", "PAID"].includes(invoice.status)) return false;
    const items = "sales" in invoice ? invoice.sales : invoice.legacySale ? [invoice.legacySale] : [];
    return items.length === 1 && items[0]?.inventoryId === inventoryId && (invoice.paymentStatus === "PAID" || (invoice.totalAmount - invoice.paidAmount > 0.01 && ["UNPAID", "PARTIAL"].includes(invoice.paymentStatus.toUpperCase())));
  }));
  if (hasInvoicePayment) return { success: false, message: "This SKU already has an active invoice payment. Use that invoice link to prevent a duplicate charge." };

  const reservationSale = linkedSales.find((sale) => !sale.invoice && !sale.legacyInvoice && ["PENDING", "UNPAID", "PARTIAL"].includes(sale.paymentStatus.toUpperCase()));
  const saleId = existing?.saleId || reservationSale?.id || null;

  const clean = (value?: string, max = 160) => (value || "").trim().slice(0, max) || null;
  await prisma.inventoryQrPaymentAuthorization.upsert({
    where: { inventoryId },
    update: {
      enabled: input.enabled,
      totalAmount,
      amountToCollect,
      currency: "INR",
      allowPartial: input.allowPartial,
      customerName: clean(input.customerName),
      customerEmail: clean(email, 254),
      customerPhone: clean(input.customerPhone, 40),
      orderReference: clean(input.orderReference, 120),
      saleId,
      updatedByUserId: permission.session?.user?.id || null,
    },
    create: {
      inventoryId,
      enabled: input.enabled,
      totalAmount,
      amountToCollect,
      currency: "INR",
      allowPartial: input.allowPartial,
      customerName: clean(input.customerName),
      customerEmail: clean(email, 254),
      customerPhone: clean(input.customerPhone, 40),
      orderReference: clean(input.orderReference, 120),
      saleId,
      updatedByUserId: permission.session?.user?.id || null,
    },
  });

  revalidatePath(`/inventory/${inventoryId}`);
  revalidatePath(`/preview/${encodeURIComponent(item.sku)}`);
  return { success: true, message: input.enabled ? "QR payment is enabled for this item." : "QR payment is disabled for this item." };
}
