import Razorpay from "razorpay";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureInventoryQrPaymentSchema } from "@/lib/inventory-qr-payment-schema";

export const dynamic = "force-dynamic";

type CustomerDetails = { name: string; email: string; phone: string; remarks: string | null };

function readCustomerDetails(body: Record<string, unknown>): CustomerDetails | null {
  const name = typeof body.customerName === "string" ? body.customerName.trim().replace(/\s+/g, " ") : "";
  const email = typeof body.customerEmail === "string" ? body.customerEmail.trim().toLowerCase() : "";
  const rawPhone = typeof body.customerPhone === "string" ? body.customerPhone.trim() : "";
  const phone = rawPhone.replace(/[\s()-]/g, "");
  const digits = phone.replace(/\D/g, "");
  const remarks = typeof body.customerRemarks === "string"
    ? body.customerRemarks.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim()
    : "";

  if (
    !name || name.length > 160 || /[\u0000-\u001f\u007f]/.test(name) ||
    !email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !/^\+?\d+$/.test(phone) || digits.length < 7 || digits.length > 15 ||
    (typeof body.customerRemarks !== "undefined" && typeof body.customerRemarks !== "string") || remarks.length > 500
  ) return null;

  return { name, email, phone, remarks: remarks || null };
}

function sameCustomer(attempt: { customerName: string | null; customerEmail: string | null; customerPhone: string | null; customerRemarks: string | null }, customer: CustomerDetails) {
  return attempt.customerName === customer.name && attempt.customerEmail === customer.email &&
    attempt.customerPhone === customer.phone && attempt.customerRemarks === customer.remarks;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await ensureInventoryQrPaymentSchema();
    const { slug } = await params;
    if (!slug || slug.length > 100) return NextResponse.json({ message: "Invalid product reference." }, { status: 400 });
    const parsedBody: unknown = await request.json().catch(() => ({}));
    const body = parsedBody && typeof parsedBody === "object" && !Array.isArray(parsedBody) ? parsedBody as Record<string, unknown> : {};
    const customer = readCustomerDetails(body);
    if (!customer) return NextResponse.json({ message: "Enter a valid name, email address, and phone number. Remarks can be up to 500 characters." }, { status: 400 });

    const item = await prisma.inventory.findUnique({ where: { sku: slug }, select: { id: true, sku: true, itemName: true, status: true } });
    if (!item || !["IN_STOCK", "RESERVED"].includes(item.status.toUpperCase())) {
      return NextResponse.json({ message: "This item is not available for payment." }, { status: 409 });
    }
    const authorization = await prisma.inventoryQrPaymentAuthorization.findUnique({ where: { inventoryId: item.id } });
    if (!authorization?.enabled || authorization.currency !== "INR") return NextResponse.json({ message: "Payment is not enabled for this item." }, { status: 403 });

    const due = Number((authorization.totalAmount - authorization.paidAmount).toFixed(2));
    if (due <= 0.01) return NextResponse.json({ message: "This item has already been paid in full." }, { status: 409 });
    const maximumAmount = Number(Math.min(authorization.amountToCollect, due).toFixed(2));
    if (maximumAmount < 1 || (!authorization.allowPartial && Math.abs(maximumAmount - due) > 0.01)) {
      return NextResponse.json({ message: "The payment amount is no longer valid. Please contact Khyati Gems." }, { status: 409 });
    }

    const requestedAmount = body.amount === undefined ? null : Number(body.amount);
    let amount = maximumAmount;
    if (authorization.allowPartial) {
      if (requestedAmount === null || !Number.isFinite(requestedAmount)) {
        return NextResponse.json({ message: "Enter the amount you would like to pay." }, { status: 400 });
      }
      const amountInPaise = Math.round(requestedAmount * 100);
      if (Math.abs(requestedAmount * 100 - amountInPaise) > 0.0001 || amountInPaise < 100) {
        return NextResponse.json({ message: "Payment amount must be at least ₹1.00 and use no more than two decimal places." }, { status: 400 });
      }
      amount = Number((amountInPaise / 100).toFixed(2));
      if (amount > maximumAmount + 0.001 || amount > due + 0.001) {
        return NextResponse.json({ message: "Payment amount cannot exceed the amount available for this payment request." }, { status: 400 });
      }
    } else if (requestedAmount !== null && (!Number.isFinite(requestedAmount) || Math.abs(requestedAmount - maximumAmount) > 0.005)) {
      return NextResponse.json({ message: "This item requires its fixed payment amount." }, { status: 400 });
    }

    const settings = await prisma.paymentSettings.findFirst({ select: { razorpayEnabled: true, razorpayKeyId: true, razorpayKeySecret: true } });
    const keyId = settings?.razorpayKeyId?.trim();
    const keySecret = settings?.razorpayKeySecret?.trim();
    if (!settings?.razorpayEnabled || !keyId || !keySecret) return NextResponse.json({ message: "Online payment is temporarily unavailable." }, { status: 503 });

    let attempt = await prisma.inventoryQrPaymentAttempt.findFirst({
      where: { authorizationId: authorization.id, activeKey: authorization.id },
      select: { id: true, amount: true, currency: true, status: true, razorpayOrderId: true, customerName: true, customerEmail: true, customerPhone: true, customerRemarks: true },
    });
    if (attempt?.status === "PAID") return NextResponse.json({ message: "This payment was already confirmed. Refresh the product page to see the latest balance." }, { status: 409 });
    if (attempt && Math.abs(Number(attempt.amount) - amount) > 0.005) {
      return NextResponse.json({ message: "A checkout for a different amount is already open. Close it before starting another payment." }, { status: 409 });
    }
    let createdAttempt = false;
    if (!attempt) {
      try {
        attempt = await prisma.inventoryQrPaymentAttempt.create({
          data: {
            authorizationId: authorization.id, inventoryId: item.id, amount, currency: "INR", status: "CREATING", activeKey: authorization.id,
            customerName: customer.name, customerEmail: customer.email, customerPhone: customer.phone, customerRemarks: customer.remarks,
          },
          select: { id: true, amount: true, currency: true, status: true, razorpayOrderId: true, customerName: true, customerEmail: true, customerPhone: true, customerRemarks: true },
        });
        createdAttempt = true;
      } catch {
        attempt = await prisma.inventoryQrPaymentAttempt.findFirst({
          where: { authorizationId: authorization.id, activeKey: authorization.id },
          select: { id: true, amount: true, currency: true, status: true, razorpayOrderId: true, customerName: true, customerEmail: true, customerPhone: true, customerRemarks: true },
        });
      }
    }
    if (!attempt) return NextResponse.json({ message: "Could not start a secure payment. Please try again." }, { status: 503 });
    if (attempt.razorpayOrderId) {
      if (attempt.status === "PAID") return NextResponse.json({ message: "This payment was already confirmed. Refresh the product page to see the latest balance." }, { status: 409 });
      const canRetry = attempt.status === "CANCELLED" || attempt.status === "FAILED";

      if (canRetry) {
        // A dismissed or failed checkout can be retried with corrected payer details.
        // Reuse its Razorpay order so we don't create parallel payable orders for one item.
        const reopened = await prisma.inventoryQrPaymentAttempt.updateMany({
          where: { id: attempt.id, status: { in: ["CANCELLED", "FAILED"] }, razorpayOrderId: attempt.razorpayOrderId },
          data: {
            status: "CREATED",
            activeKey: authorization.id,
            failureReason: null,
            customerName: customer.name,
            customerEmail: customer.email,
            customerPhone: customer.phone,
            customerRemarks: customer.remarks,
          },
        });
        if (reopened.count === 0) {
          // A webhook may have confirmed payment while the retry was being prepared.
          attempt = await prisma.inventoryQrPaymentAttempt.findUnique({
            where: { id: attempt.id },
            select: { id: true, amount: true, currency: true, status: true, razorpayOrderId: true, customerName: true, customerEmail: true, customerPhone: true, customerRemarks: true },
          });
          if (!attempt || attempt.status === "PAID") {
            return NextResponse.json({ message: "This payment was already confirmed. Refresh the product page to see the latest balance." }, { status: 409 });
          }
        } else {
          attempt = { ...attempt, status: "CREATED", customerName: customer.name, customerEmail: customer.email, customerPhone: customer.phone, customerRemarks: customer.remarks };
        }
      }

      const hasSavedCustomer = Boolean(attempt.customerName || attempt.customerEmail || attempt.customerPhone || attempt.customerRemarks);
      if (hasSavedCustomer && !sameCustomer(attempt, customer)) {
        return NextResponse.json({ message: "A checkout is already open with different payer details. Close it before starting again." }, { status: 409 });
      }
      if (!hasSavedCustomer) {
        await prisma.inventoryQrPaymentAttempt.update({ where: { id: attempt.id }, data: { customerName: customer.name, customerEmail: customer.email, customerPhone: customer.phone, customerRemarks: customer.remarks } });
      }
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
