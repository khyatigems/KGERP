import Razorpay from "razorpay";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureInventoryQrPaymentSchema } from "@/lib/inventory-qr-payment-schema";

export const dynamic = "force-dynamic";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await ensureInventoryQrPaymentSchema();
    const { slug } = await params;
    if (!slug || slug.length > 100) return NextResponse.json({ message: "Invalid product reference." }, { status: 400 });

    const item = await prisma.inventory.findUnique({ where: { sku: slug }, select: { id: true, sku: true, itemName: true, status: true } });
    if (!item || !["IN_STOCK", "RESERVED"].includes(item.status.toUpperCase())) {
      return NextResponse.json({ message: "This item is not available for payment." }, { status: 409 });
    }
    const authorization = await prisma.inventoryQrPaymentAuthorization.findUnique({ where: { inventoryId: item.id } });
    if (!authorization?.enabled || authorization.currency !== "INR") return NextResponse.json({ message: "Payment is not enabled for this item." }, { status: 403 });

    const due = Number((authorization.totalAmount - authorization.paidAmount).toFixed(2));
    if (due <= 0.01) return NextResponse.json({ message: "This item has already been paid in full." }, { status: 409 });
    const amount = Number(Math.min(authorization.amountToCollect, due).toFixed(2));
    if (amount <= 0 || (amount < due && !authorization.allowPartial)) return NextResponse.json({ message: "The authorized payment amount is no longer valid." }, { status: 409 });

    const settings = await prisma.paymentSettings.findFirst({ select: { razorpayEnabled: true, razorpayKeyId: true, razorpayKeySecret: true } });
    const keyId = settings?.razorpayKeyId?.trim();
    const keySecret = settings?.razorpayKeySecret?.trim();
    if (!settings?.razorpayEnabled || !keyId || !keySecret) return NextResponse.json({ message: "Online payment is temporarily unavailable." }, { status: 503 });

    let attempt = await prisma.inventoryQrPaymentAttempt.findFirst({
      where: { authorizationId: authorization.id, activeKey: authorization.id },
      select: { id: true, amount: true, currency: true, status: true, razorpayOrderId: true },
    });
    let createdAttempt = false;
    if (!attempt) {
      try {
        attempt = await prisma.inventoryQrPaymentAttempt.create({
          data: { authorizationId: authorization.id, inventoryId: item.id, amount, currency: "INR", status: "CREATING", activeKey: authorization.id },
          select: { id: true, amount: true, currency: true, status: true, razorpayOrderId: true },
        });
        createdAttempt = true;
      } catch {
        attempt = await prisma.inventoryQrPaymentAttempt.findFirst({
          where: { authorizationId: authorization.id, activeKey: authorization.id },
          select: { id: true, amount: true, currency: true, status: true, razorpayOrderId: true },
        });
      }
    }
    if (!attempt) return NextResponse.json({ message: "Could not start a secure payment. Please try again." }, { status: 503 });
    if (attempt.razorpayOrderId) {
      await prisma.inventoryQrPaymentAttempt.updateMany({ where: { id: attempt.id, status: { not: "PAID" } }, data: { status: "CREATED", failureReason: null } });
      return NextResponse.json({ keyId, attemptId: attempt.id, orderId: attempt.razorpayOrderId, amount: Math.round(attempt.amount * 100), currency: attempt.currency, itemName: item.itemName, sku: item.sku }, { headers: { "Cache-Control": "no-store" } });
    }
    if (!createdAttempt) return NextResponse.json({ message: "A secure checkout is already being prepared. Please try again in a moment." }, { status: 409 });

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    let orderId: string;
    try {
      const order = await razorpay.orders.create({
        amount: Math.round(attempt.amount * 100),
        currency: "INR",
        receipt: `KG${attempt.id.replace(/-/g, "").slice(0, 18)}`,
        notes: { qrPaymentAttemptId: attempt.id, inventoryId: item.id, sku: item.sku, orderReference: authorization.orderReference || "" },
      });
      orderId = String(order.id);
      await prisma.inventoryQrPaymentAttempt.update({ where: { id: attempt.id }, data: { status: "CREATED", razorpayOrderId: orderId } });
    } catch (error) {
      await prisma.inventoryQrPaymentAttempt.updateMany({ where: { id: attempt.id, razorpayOrderId: null }, data: { status: "FAILED", activeKey: null, failureReason: "Order creation failed" } }).catch(() => {});
      throw error;
    }

    return NextResponse.json({ keyId, attemptId: attempt.id, orderId, amount: Math.round(attempt.amount * 100), currency: "INR", itemName: item.itemName, sku: item.sku }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not create inventory QR payment order:", error);
    return NextResponse.json({ message: "Could not start a secure payment. Please try again." }, { status: 500 });
  }
}
