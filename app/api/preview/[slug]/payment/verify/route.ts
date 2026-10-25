import Razorpay from "razorpay";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureInventoryQrPaymentSchema } from "@/lib/inventory-qr-payment-schema";
import { recordCapturedInventoryQrPayment, verifyRazorpayPaymentSignature } from "@/lib/inventory-qr-payment";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await ensureInventoryQrPaymentSchema();
    const { slug } = await params;
    const body = await request.json() as { razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string };
    const orderId = String(body.razorpay_order_id || "");
    const paymentId = String(body.razorpay_payment_id || "");
    const signature = String(body.razorpay_signature || "");
    if (!orderId || !paymentId || !/^[a-f0-9]{64}$/i.test(signature)) return NextResponse.json({ message: "Payment verification details are incomplete." }, { status: 400 });

    const attempt = await prisma.inventoryQrPaymentAttempt.findUnique({ where: { razorpayOrderId: orderId }, select: { id: true, inventoryId: true, status: true } });
    const item = attempt ? await prisma.inventory.findUnique({ where: { id: attempt.inventoryId }, select: { sku: true } }) : null;
    if (!attempt || !item || item.sku !== slug) return NextResponse.json({ message: "This payment does not match the product." }, { status: 404 });

    const settings = await prisma.paymentSettings.findFirst({ select: { razorpayEnabled: true, razorpayKeyId: true, razorpayKeySecret: true } });
    const keyId = settings?.razorpayKeyId?.trim();
    const keySecret = settings?.razorpayKeySecret?.trim();
    if (!settings?.razorpayEnabled || !keyId || !keySecret) return NextResponse.json({ message: "Payment verification is temporarily unavailable." }, { status: 503 });
    if (!verifyRazorpayPaymentSignature(orderId, paymentId, signature, keySecret)) return NextResponse.json({ message: "Payment signature could not be verified." }, { status: 400 });

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const payment = await razorpay.payments.fetch(paymentId) as unknown as { id?: string; order_id?: string; amount?: number; currency?: string; status?: string };
    if (String(payment.order_id || "") !== orderId || String(payment.status || "").toLowerCase() !== "captured") {
      return NextResponse.json({ message: "The gateway has not confirmed this payment as captured yet." }, { status: 409 });
    }

    const settlement = await recordCapturedInventoryQrPayment({ orderId, paymentId, amount: Number(payment.amount || 0), currency: String(payment.currency || "") });
    if (!settlement.handled) return NextResponse.json({ message: settlement.reason || "Payment could not be recorded." }, { status: 409 });
    return NextResponse.json({ success: true, duplicate: settlement.duplicate, fullyPaid: "fullyPaid" in settlement ? settlement.fullyPaid : undefined });
  } catch (error) {
    console.error("Inventory QR payment verification failed:", error);
    return NextResponse.json({ message: "We could not verify this payment. If your account was charged, please contact Khyati Gems support." }, { status: 500 });
  }
}
