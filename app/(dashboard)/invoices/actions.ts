"use server";

import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { generateInvoiceToken } from "@/lib/tokens";
import { auth } from "@/lib/auth";

export async function createOrUpdateInvoiceFromSale(
  saleId: string,
  displayOptions: Record<string, boolean>
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
      await prisma.invoice.update({
        where: { id: sale.invoice.id },
        data: {
          displayOptions: displayOptionsStr
        }
      });
      return { success: true, message: "Invoice updated successfully", invoiceId: sale.invoice.id, token: sale.invoice.token };
    } else {
      // Create new invoice
      const invoiceId = await prisma.$transaction(async (tx) => {
        const count = await tx.invoice.count();
        const year = new Date().getFullYear();
        const invoiceNumber = `INV-${year}-${(count + 1).toString().padStart(4, "0")}`;
        const token = generateInvoiceToken();

        const invoice = await tx.invoice.create({
          data: {
            invoiceNumber,
            token,
            isActive: true,
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

      return { success: true, message: "Invoice created successfully", invoiceId, token: (await prisma.invoice.findUnique({where: {id: invoiceId}}))?.token };
    }
  } catch (error) {
    console.error("Failed to create/update invoice:", error);
    return { success: false, message: "Failed to create/update invoice" };
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

      revalidatePath(`/invoices/${invoiceId}`);
      revalidatePath("/invoices");
      return { success: true, message: "Payment status reset to Unpaid" };
    }

    if (!paymentDetails) {
      return { success: false, message: "Payment details required" };
    }

    // Handle PAID and PARTIAL
    const currentPaid = invoice.paidAmount || 0;
    const total = invoice.totalAmount;
    const remaining = total - currentPaid;
    
    let amountToRecord = paymentDetails.amount;
    
    // Validation
    if (status === "PAID") {
      // Ensure we record the full remaining amount
      if (amountToRecord < remaining) {
        // If user entered less but selected PAID, we could either error or force it.
        // Requirement: "If 'Paid' is selected, the system must automatically record the full remaining amount."
        // We'll trust the amount passed matches remaining (UI handles pre-fill), 
        // OR we override it here to be safe.
        amountToRecord = remaining;
      }
    }

    if (amountToRecord <= 0) {
      return { success: false, message: "Invalid payment amount" };
    }

    // Determine final status
    let newPaidAmount = currentPaid + amountToRecord;
    let finalStatus = status;
    
    // Auto-switch to PAID if full amount reached
    if (newPaidAmount >= total - 0.01) { // Tolerance for float
      finalStatus = "PAID";
      newPaidAmount = total; // Cap at total to avoid overpayment issues
    }

    await prisma.$transaction(async (tx) => {
      // 1. Create Payment Record
      await tx.payment.create({
        data: {
          invoiceId,
          amount: amountToRecord,
          method: paymentDetails.method,
          date: new Date(paymentDetails.date),
          reference: paymentDetails.reference,
          notes: paymentDetails.notes
        }
      });

      // 2. Update Invoice
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          paymentStatus: finalStatus,
          paidAmount: newPaidAmount,
          status: finalStatus === "PAID" ? "PAID" : "ISSUED" // Keep as ISSUED if Partial
        }
      });

      // 3. Update Sales
      // If Partial, sales are also marked Partial. If Paid, Paid.
      await tx.sale.updateMany({
        where: { invoiceId },
        data: { paymentStatus: finalStatus }
      });
    });

    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath("/invoices");
    
    return { success: true, message: `Payment recorded successfully (${finalStatus})` };

  } catch (error) {
    console.error("Failed to update payment status:", error);
    return { success: false, message: "Failed to update payment status" };
  }
}
