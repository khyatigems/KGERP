"use server";

import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { generateInvoiceToken } from "@/lib/tokens";
import { auth } from "@/lib/auth";
import { normalizeDateToUtcNoon } from "@/lib/date";
import { updateInvoiceBillingFromDisplayOptions } from "@/lib/invoice-billing";
import { logActivity } from "@/lib/activity-logger";
import { recordInvoicePayment } from "@/lib/invoice-payment";

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
      const invoiceId = await prisma.$transaction(async (tx) => {
        const year = new Date().getFullYear();
        
        // Find last invoice number for this year to ensure uniqueness
        const lastInvoice = await tx.invoice.findFirst({
            where: {
                invoiceNumber: {
                    startsWith: `INV-${year}-`
                }
            },
            orderBy: {
                invoiceNumber: 'desc'
            }
        });

        let nextSequence = 1;
        if (lastInvoice) {
            const parts = lastInvoice.invoiceNumber.split('-');
            if (parts.length === 3) {
                const lastSeq = parseInt(parts[2]);
                if (!isNaN(lastSeq)) {
                    nextSequence = lastSeq + 1;
                }
            }
        }

        const invoiceNumber = `INV-${year}-${nextSequence.toString().padStart(4, "0")}`;
        const token = generateInvoiceToken();

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
            status: "ISSUED"
          }
        });

        await tx.sale.update({
          where: { id: saleId },
          data: { invoiceId: invoice.id }
        });

        return invoice.id;
      });

      const created = await prisma.invoice.findUnique({ where: { id: invoiceId }, select: { token: true } });
      return { success: true, message: "Invoice created successfully", invoiceId, token: created?.token };
    }
  } catch (error) {
    console.error("Failed to create/update invoice:", error);
    const msg = error instanceof Error ? error.message : "Failed to create/update invoice";
    return { success: false, message: msg };
  }
}


interface PaymentDetails {
  amount: number;
  method: string;
  date: string;
  reference?: string;
  notes?: string;
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
      await prisma.$transaction([
        prisma.payment.deleteMany({ where: { invoiceId } }),
        prisma.invoice.update({
          where: { id: invoiceId },
          data: { 
            paymentStatus: "UNPAID",
            paidAmount: 0,
            status: "ISSUED" // Revert to ISSUED
          }
        }),
        prisma.sale.updateMany({
          where: { invoiceId },
          data: { paymentStatus: "UNPAID" }
        })
      ]);

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

    if (!paymentDetails) {
      return { success: false, message: "Payment details required" };
    }

    const recordResult = await recordInvoicePayment({
      invoiceId,
      targetStatus: status === "PAID" ? "PAID" : "PARTIAL",
      amount: paymentDetails.amount,
      method: paymentDetails.method,
      date: paymentDetails.date,
      reference: paymentDetails.reference,
      notes: paymentDetails.notes,
      actor: { userId: session.user.id, userName: session.user.name || session.user.email || "Unknown" }
    });
    if (!recordResult.success) return recordResult;

    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath(`/invoice/${invoice.token}`);
    revalidatePath("/invoices");
    return recordResult;

  } catch (error) {
    console.error("Failed to update payment status:", error);
    return { success: false, message: "Failed to update payment status" };
  }
}
