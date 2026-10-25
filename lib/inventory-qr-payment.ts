import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export type CapturedQrPayment = {
  orderId: string;
  paymentId: string;
  amount: number;
  currency: string;
};

export function verifyRazorpayPaymentSignature(orderId: string, paymentId: string, signature: string, secret: string) {
  const expected = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(signature, "hex");
  return expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

export async function recordCapturedInventoryQrPayment(input: CapturedQrPayment) {
  const attempt = await prisma.inventoryQrPaymentAttempt.findUnique({
    where: { razorpayOrderId: input.orderId },
    select: { id: true, authorizationId: true, inventoryId: true, amount: true, currency: true, status: true, razorpayPaymentId: true },
  });
  if (!attempt) return { handled: false as const, reason: "Attempt not found" };
  if (attempt.status === "PAID" && attempt.razorpayPaymentId === input.paymentId) {
    return { handled: true as const, duplicate: true };
  }
  if (input.currency !== attempt.currency || Math.round(input.amount) !== Math.round(attempt.amount * 100)) {
    return { handled: false as const, reason: "Payment amount or currency did not match the authorized checkout" };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const claimed = await tx.inventoryQrPaymentAttempt.updateMany({
        where: { id: attempt.id, status: { not: "PAID" }, razorpayPaymentId: null },
        data: { status: "PAID", razorpayPaymentId: input.paymentId, activeKey: null, paidAt: new Date() },
      });
      if (claimed.count === 0) return { duplicate: true as const };

      const authorization = await tx.inventoryQrPaymentAuthorization.findUnique({ where: { id: attempt.authorizationId } });
      const inventory = await tx.inventory.findUnique({ where: { id: attempt.inventoryId }, select: { id: true, sku: true, itemName: true, status: true, sellingPrice: true, costPrice: true } });
      if (!authorization || !inventory) throw new Error("QR payment authorization or inventory item no longer exists");

      const previousPaid = Number(authorization.paidAmount || 0);
      const newPaid = Number((previousPaid + attempt.amount).toFixed(2));
      if (attempt.amount > Number((authorization.totalAmount - previousPaid + 0.01).toFixed(2))) {
        throw new Error("Captured amount exceeds the remaining authorized balance");
      }
      const fullyPaid = newPaid >= authorization.totalAmount - 0.01;

      await tx.inventoryQrPaymentAuthorization.update({
        where: { id: authorization.id },
        data: { paidAmount: Math.min(newPaid, authorization.totalAmount), enabled: fullyPaid ? false : authorization.enabled },
      });

      const paymentStatus = fullyPaid ? "PAID" : "PARTIAL";
      const saleData = {
        salePrice: authorization.totalAmount,
        netAmount: authorization.totalAmount,
        paymentStatus,
        paymentMethod: "ONLINE",
        platform: "QR_PAYMENT",
        customerName: authorization.customerName,
        customerEmail: authorization.customerEmail,
        customerPhone: authorization.customerPhone,
        notes: [authorization.orderReference ? `Order reference: ${authorization.orderReference}` : null, `QR payment ${input.paymentId}; paid ${newPaid.toFixed(2)} ${attempt.currency}`].filter(Boolean).join(" · "),
      };
      if (authorization.saleId) {
        const linkedSale = await tx.sale.findUnique({ where: { id: authorization.saleId }, select: { customerId: true, customerName: true, customerEmail: true, customerPhone: true, platform: true, notes: true } });
        await tx.sale.update({
          where: { id: authorization.saleId },
          data: {
            ...saleData,
            customerId: linkedSale?.customerId || undefined,
            customerName: authorization.customerName || linkedSale?.customerName || null,
            customerEmail: authorization.customerEmail || linkedSale?.customerEmail || null,
            customerPhone: authorization.customerPhone || linkedSale?.customerPhone || null,
            platform: linkedSale?.platform || saleData.platform,
            notes: [linkedSale?.notes, saleData.notes].filter(Boolean).join(" · "),
          },
        });
      } else {
        const sale = await tx.sale.create({ data: { inventoryId: inventory.id, ...saleData } });
        await tx.inventoryQrPaymentAuthorization.update({ where: { id: authorization.id }, data: { saleId: sale.id } });
      }

      if (["IN_STOCK", "RESERVED"].includes(inventory.status.toUpperCase())) {
        await tx.inventory.update({ where: { id: inventory.id }, data: { status: fullyPaid ? "SOLD" : "RESERVED" } });
      }
      return { duplicate: false as const, fullyPaid, sku: inventory.sku, paidAmount: newPaid, totalAmount: authorization.totalAmount };
    });
    return { handled: true as const, ...result };
  } catch (error) {
    console.error("QR payment settlement failed:", error);
    return { handled: false as const, reason: error instanceof Error ? error.message : "Settlement failed" };
  }
}
