
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-logger";
import { createInvoiceVersion } from "@/lib/invoice-versioning";

export async function POST(req: NextRequest) {
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
              const salesToUpdate = invoice.sales.length > 0 ? invoice.sales : (invoice.legacySale ? [invoice.legacySale] : []);
              
              for (const sale of salesToUpdate) {
                  // Only update if not already paid to avoid duplicate logs/versions?
                  // But createInvoiceVersion handles creating a new version regardless.
                  // Maybe check if status is already PAID.
                  if (sale.paymentStatus !== "PAID") {
                      await prisma.sale.update({
                          where: { id: sale.id },
                          data: { 
                              paymentStatus: "PAID",
                              paymentMethod: "ONLINE",
                              notes: (sale.notes ? sale.notes + "\n" : "") + `Paid via Razorpay: ${payment.id}`
                          }
                      });
                  }
              }
              
              await logActivity({
                  entityType: "Invoice",
                  entityId: invoiceId,
                  entityIdentifier: invoice.invoiceNumber,
                  actionType: "STATUS_CHANGE",
                  source: "SYSTEM",
                  userName: "Razorpay Webhook",
                  userId: "SYSTEM",
                  newData: { paymentStatus: "PAID", paymentId: payment.id, amount: payment.amount }
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
