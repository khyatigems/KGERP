"use server";

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { generateInvoiceToken } from "@/lib/tokens";
import { auth } from "@/lib/auth";
import { normalizeDateToUtcNoon } from "@/lib/date";
import { updateInvoiceBillingFromDisplayOptions } from "@/lib/invoice-billing";
import { logActivity } from "@/lib/activity-logger";
import { recordInvoicePayment } from "@/lib/invoice-payment";

async function computeNextInvoiceNumberUnsafe() {
  const year = new Date().getFullYear();
  const recentInvoices = await prisma.invoice.findMany({
    where: {
      invoiceNumber: {
        startsWith: `INV-${year}-`
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    select: { invoiceNumber: true },
    take: 200,
  });

  let nextSequence = 1;
  for (const inv of recentInvoices) {
    const parts = String(inv.invoiceNumber || "").split("-");
    if (parts.length !== 3) continue;
    const seq = parseInt(parts[2] || "", 10);
    if (Number.isFinite(seq) && seq >= nextSequence) {
      nextSequence = seq + 1;
    }
  }

  return `INV-${year}-${nextSequence.toString().padStart(4, "0")}`;
}

function parseInvoiceSequence(invoiceNumber: string | null | undefined) {
  if (!invoiceNumber) return 0;
  const parts = invoiceNumber.split("-");
  if (parts.length !== 3) return 0;
  const seq = parseInt(parts[2] || "", 10);
  return Number.isFinite(seq) ? seq : 0;
}

export async function createOrUpdateInvoiceFromSale(
  saleId: string,
  displayOptions: Record<string, unknown>
) {
  const perm = await checkPermission(PERMISSIONS.INVOICE_MANAGE);
  if (!perm.success) return { success: false, message: perm.message };

  const session = await auth();
  if (!session) return { success: false, message: "Unauthorized" };

  try {
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: { invoice: true }
    });

    if (!sale) return { success: false, message: "Sale not found" };

    const displayOptionsStr = JSON.stringify(displayOptions);

    if (sale.invoice) {
      // Update existing invoice
      const existingInvoice = await prisma.invoice.findUnique({
        where: { id: sale.invoice.id },
        select: {
          id: true,
          token: true,
          invoiceNumber: true,
          invoiceDate: true,
          createdAt: true,
          totalAmount: true,
          paidAmount: true,
          paymentStatus: true,
          status: true,
        }
      });

      if (!existingInvoice) return { success: false, message: "Invoice not found" };

      const userName = session.user.name || session.user.email || "Unknown";
      const ensuredInvoiceDate = existingInvoice.invoiceDate || normalizeDateToUtcNoon(sale.saleDate);

      const isReplacement =
        sale.platform === "REPLACEMENT" ||
        existingInvoice.paymentStatus === "REPLACEMENT" ||
        existingInvoice.status === "REPLACEMENT";

      if (isReplacement) {
        await prisma.invoice.update({
          where: { id: existingInvoice.id },
          data: { invoiceDate: ensuredInvoiceDate, displayOptions: displayOptionsStr }
        });
        return {
          success: true,
          message: `Replacement invoice already created: ${existingInvoice.invoiceNumber}`,
          invoiceId: existingInvoice.id,
          token: existingInvoice.token,
          paymentStatus: existingInvoice.paymentStatus || "REPLACEMENT",
          outstandingDelta: 0,
          balanceDue: 0,
        };
      }

      await prisma.invoice.update({
        where: { id: existingInvoice.id },
        data: { invoiceDate: ensuredInvoiceDate }
      });

      const billing = await updateInvoiceBillingFromDisplayOptions({
        invoiceId: existingInvoice.id,
        displayOptions,
        displayOptionsStr,
        actor: { userId: session.user.id, userName }
      });

      if (!billing.success) return { success: false, message: billing.message };

      return {
        success: true,
        message: "Invoice updated successfully",
        invoiceId: existingInvoice.id,
        token: existingInvoice.token,
        paymentStatus: billing.paymentStatus,
        outstandingDelta: billing.outstandingDelta,
        balanceDue: billing.balanceDue,
      };
    } else {
      // Create new invoice
      if (sale.platform === "REPLACEMENT") {
        return { success: false, message: "Cannot create a normal invoice for a replacement dispatch. Use the replacement flow." };
      }

      // Avoid interactive transaction (can time out on Turso). Use retry on unique invoiceNumber.
      let invoiceId: string | null = null;
      let attempts = 0;

      // Read the current max sequence once; on collision we increment locally.
      const year = new Date().getFullYear();
      let nextSequence = Math.max(1, parseInvoiceSequence(await computeNextInvoiceNumberUnsafe()));

      while (!invoiceId && attempts < 50) {
        attempts += 1;

        // Periodically re-read the base sequence to reduce sustained collisions under concurrency.
        if (attempts % 10 === 0) {
          const refreshed = await computeNextInvoiceNumberUnsafe();
          nextSequence = Math.max(nextSequence, parseInvoiceSequence(refreshed));
        }

        const invoiceNumber = `INV-${year}-${nextSequence.toString().padStart(4, "0")}`;
        nextSequence += 1;
        const token = generateInvoiceToken();

        try {
          const createdInvoice = await prisma.$transaction(async (tx) => {
            const invoice = await tx.invoice.create({
              data: {
                invoiceNumber,
                token,
                isActive: true,
                invoiceDate: normalizeDateToUtcNoon(sale.saleDate),
                subtotal: sale.netAmount,
                taxTotal: 0,
                discountTotal: sale.discountAmount || 0,
                totalAmount: sale.netAmount,
                displayOptions: displayOptionsStr,
                status: "ISSUED",
              },
              select: { id: true },
            });

            await tx.sale.update({
              where: { id: saleId },
              data: { invoiceId: invoice.id },
            });

            return invoice;
          });

          invoiceId = createdInvoice.id;
        } catch (e) {
          // Prisma unique constraint error
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
            const target = (e.meta as { target?: string[] | string } | undefined)?.target;
            const targetList = Array.isArray(target) ? target : typeof target === "string" ? [target] : [];
            if (targetList.length === 0 || targetList.includes("invoiceNumber")) {
              continue;
            }
          }
          throw e;
        }
      }

      if (!invoiceId) return { success: false, message: "Failed to generate unique invoice number" };

      const created = await prisma.invoice.findUnique({ where: { id: invoiceId }, select: { token: true } });

      const userName = session.user.name || session.user.email || "Unknown";
      const billing = await updateInvoiceBillingFromDisplayOptions({
        invoiceId,
        displayOptions,
        displayOptionsStr,
        actor: { userId: session.user.id, userName }
      });

      if (!billing.success) return { success: false, message: billing.message };

      return {
        success: true,
        message: "Invoice created successfully",
        invoiceId,
        token: created?.token,
        paymentStatus: billing.paymentStatus,
        outstandingDelta: billing.outstandingDelta,
        balanceDue: billing.balanceDue,
      };
    }
  } catch (error) {
    console.error("Failed to create/update invoice:", error);
    const msg = error instanceof Error ? error.message : "Failed to create/update invoice";
    return { success: false, message: msg };
  }
}


interface SinglePayment {
  method: string;
  amount: number;
  reference?: string;
  loyaltyPointsRedeemed?: number;
}

interface PaymentDetails {
  totalAmount: number;
  date: string;
  notes?: string;
  couponCode?: string;
  payments: SinglePayment[];
}

export async function updateInvoicePaymentStatus(
  invoiceId: string, 
  status: "PAID" | "UNPAID" | "PARTIAL",
  paymentDetails?: PaymentDetails
) {
  const perm = await checkPermission(PERMISSIONS.INVOICE_MANAGE);
  if (!perm.success) return { success: false, message: perm.message };
  const session = await auth();
  if (!session?.user) return { success: false, message: "Unauthorized" };

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId }
    });

    if (!invoice) return { success: false, message: "Invoice not found" };

    if (status === "UNPAID") {
      // Reset logic
      // CAUTION: This deletes payment history for this invoice.
      await prisma.$transaction(async (tx) => {
        const loyaltyRows = await tx.$queryRawUnsafe<Array<{ points: number; rupeeValue: number }>>(
          `SELECT COALESCE(SUM(points),0) as points, COALESCE(SUM(rupeeValue),0) as rupeeValue
           FROM "LoyaltyLedger" WHERE invoiceId = ? AND type = 'REDEEM'`,
          invoiceId
        );
        const redeemedPoints = Math.abs(Number(loyaltyRows?.[0]?.points || 0));
        const redeemedValue = Math.abs(Number(loyaltyRows?.[0]?.rupeeValue || 0));
        const customerIdRows = await tx.$queryRawUnsafe<Array<{ customerId: string | null }>>(
          `SELECT COALESCE(
              (SELECT customerId FROM "Sale" WHERE invoiceId = ? LIMIT 1),
              (SELECT customerId FROM "Quotation" q JOIN "Invoice" i ON q.id = i.quotationId WHERE i.id = ? LIMIT 1)
            ) as customerId`,
          invoiceId,
          invoiceId
        );
        const customerId = customerIdRows?.[0]?.customerId || null;
        if (customerId && redeemedValue > 0.009) {
          await tx.$executeRawUnsafe(
            `INSERT INTO "LoyaltyLedger" (id, customerId, invoiceId, type, points, rupeeValue, remarks, createdAt)
             VALUES (?, ?, ?, 'ADJUST', ?, ?, ?, CURRENT_TIMESTAMP)`,
            crypto.randomUUID(),
            customerId,
            invoiceId,
            redeemedPoints,
            redeemedValue,
            `Loyalty restored on payment reset for invoice ${invoice.invoiceNumber}`
          );
        }
        await tx.$executeRawUnsafe(`DELETE FROM "LoyaltyLedger" WHERE invoiceId = ? AND type = 'REDEEM'`, invoiceId);
        await tx.payment.deleteMany({ where: { invoiceId } });
        await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            paymentStatus: "UNPAID",
            paidAmount: 0,
            status: "ISSUED"
          }
        });
        await tx.sale.updateMany({
          where: { invoiceId },
          data: { paymentStatus: "UNPAID" }
        });
      });

      await logActivity({
        entityType: "Invoice",
        entityId: invoiceId,
        entityIdentifier: invoice.invoiceNumber,
        actionType: "EDIT",
        source: "WEB",
        userId: session.user.id,
        userName: session.user.name || session.user.email || "Unknown",
        oldData: {
          paymentStatus: invoice.paymentStatus,
          paidAmount: invoice.paidAmount
        },
        newData: {
          paymentStatus: "UNPAID",
          paidAmount: 0
        },
        details: "Payment status reset and all payment entries removed"
      });

      revalidatePath(`/invoices/${invoiceId}`);
      revalidatePath("/invoices");
      return { success: true, message: "Payment status reset to Unpaid" };
    }

    if (!paymentDetails || paymentDetails.payments.length === 0) {
      return { success: false, message: "Payment details required" };
    }

    // Process each payment in the array
    for (const payment of paymentDetails.payments) {
      const recordResult = await recordInvoicePayment({
        invoiceId,
        targetStatus: status === "PAID" ? "PAID" : "PARTIAL",
        amount: payment.amount,
        method: payment.method,
        date: paymentDetails.date,
        reference: payment.reference,
        notes: paymentDetails.notes,
        couponCode: paymentDetails.couponCode,
        loyaltyPointsRedeemed: payment.loyaltyPointsRedeemed,
        actor: { userId: session.user.id, userName: session.user.name || session.user.email || "Unknown" }
      });
      if (!recordResult.success) return recordResult;
    }

    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath(`/invoice/${invoice.token}`);
    revalidatePath("/invoices");
    return { success: true, message: `${paymentDetails.payments.length} payment(s) recorded successfully` };

  } catch (error) {
    console.error("Failed to update payment status:", error);
    return { success: false, message: "Failed to update payment status" };
  }
}
