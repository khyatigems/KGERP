
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-logger";
import { createInvoiceVersion } from "@/lib/invoice-versioning";
import { withFreezeGuard } from "@/lib/governance";

async function handleRazorpayWebhook(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ message: "No signature" }, { status: 400 });
    }

    // In production, this should be in process.env
    // For now, we log a warning if missing
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    
    if (!secret) {
        console.error("RAZORPAY_WEBHOOK_SECRET not set in environment variables");
        // We return 200 to acknowledge receipt even if we can't verify, 
        // to prevent Razorpay from retrying indefinitely, but we don't process it.
        // OR we return 500 to signal config error. 
        // Better to return 500 so logs show failure.
        return NextResponse.json({ message: "Server configuration error" }, { status: 500 });
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    if (expectedSignature !== signature) {
      console.warn("Invalid Razorpay signature received");
      return NextResponse.json({ message: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(body);

    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;
      const invoiceId = payment.notes?.invoiceId;
      
      console.log(`Payment captured for invoice: ${invoiceId}, Payment ID: ${payment.id}`);
      
      if (invoiceId) {
          // 1. Snapshot version before update
          await createInvoiceVersion(invoiceId, "Payment Update (Webhook)");
          
          // 2. Find linked sales and update status
          const invoice = await prisma.invoice.findUnique({
              where: { id: invoiceId },
              include: { sales: true, legacySale: true }
          });
          
          if (invoice) {
              const paymentCurrency = typeof payment.currency === "string" ? payment.currency : "INR";
              const rawAmount = Number(payment.amount || 0);
              const receivedAmount = paymentCurrency === "INR" ? rawAmount / 100 : rawAmount;
              const paymentDate = typeof payment.created_at === "number" ? new Date(payment.created_at * 1000) : new Date();

              await prisma.$transaction(async (tx) => {
                const existing = await tx.payment.findFirst({
                  where: { invoiceId: invoiceId, reference: String(payment.id) },
                  select: { id: true }
                });

                if (!existing) {
                  await tx.payment.create({
                    data: {
                      invoiceId,
                      amount: receivedAmount,
                      method: "ONLINE",
                      date: paymentDate,
                      reference: String(payment.id),
                      notes: `Paid via Razorpay: ${payment.id}`,
                      recordedBy: "SYSTEM_RAZORPAY"
                    }
                  });
                }

                const paymentsSumRow = await tx.payment.aggregate({
                  where: { invoiceId },
                  _sum: { amount: true }
                });
                const newPaidAmount = Math.min(invoice.totalAmount, Number(paymentsSumRow._sum.amount || 0));
                const status = newPaidAmount >= invoice.totalAmount - 0.01 ? "PAID" : newPaidAmount > 0 ? "PARTIAL" : "UNPAID";

                await tx.invoice.update({
                  where: { id: invoiceId },
                  data: {
                    paidAmount: newPaidAmount,
                    paymentStatus: status === "UNPAID" ? "UNPAID" : status,
                    status: status === "PAID" ? "PAID" : "ISSUED"
                  }
                });

                await tx.sale.updateMany({
                  where: { invoiceId },
                  data: { paymentStatus: status === "UNPAID" ? "UNPAID" : status, paymentMethod: "ONLINE" }
                });
              });
              
              await logActivity({
                  entityType: "Invoice",
                  entityId: invoiceId,
                  entityIdentifier: invoice.invoiceNumber,
                  actionType: "STATUS_CHANGE",
                  source: "SYSTEM",
                  userName: "Razorpay Webhook",
                  userId: "SYSTEM",
                  newData: { paymentStatus: "PAID", paymentId: payment.id, amount: receivedAmount }
              });
          } else {
              console.warn(`Invoice ${invoiceId} not found during payment webhook processing`);
          }
      } else {
          console.warn("Payment captured but no invoiceId in notes");
      }
    } else if (event.event === "payment.failed") {
        const payment = event.payload.payment.entity;
        const invoiceId = payment.notes?.invoiceId;
        
        if (invoiceId) {
             await logActivity({
                  entityType: "Invoice",
                  entityId: invoiceId,
                  entityIdentifier: invoiceId, // Maybe fetch invoice number if possible
                  actionType: "STATUS_CHANGE",
                  source: "SYSTEM",
                  userName: "Razorpay Webhook",
                  userId: "SYSTEM",
                  newData: { paymentStatus: "FAILED", paymentId: payment.id, reason: payment.error_description }
              });
        }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Webhook Handler Error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export const POST = withFreezeGuard(
  "Razorpay webhook write processing",
  handleRazorpayWebhook,
  {
    onBlocked: () => NextResponse.json({ status: "ok", skipped: true, reason: "freeze_mode" })
  }
);
