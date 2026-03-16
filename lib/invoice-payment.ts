import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-logger";

export type InvoicePaymentInput = {
  invoiceId: string;
  targetStatus: "PAID" | "PARTIAL";
  amount: number;
  method: string;
  date: string;
  reference?: string;
  notes?: string;
  actor?: { userId?: string; userName?: string };
};

export async function recordInvoicePayment(input: InvoicePaymentInput) {
  const invoice = await prisma.invoice.findUnique({ where: { id: input.invoiceId } });
  if (!invoice) return { success: false as const, message: "Invoice not found" };

  const currentPaid = invoice.paidAmount || 0;
  const total = invoice.totalAmount;
  const remaining = total - currentPaid;
  if (remaining <= 0.009) return { success: false as const, message: "Invoice is already fully paid" };

  const allowedMethods = new Set(["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "OTHER"]);
  if (!allowedMethods.has(input.method)) return { success: false as const, message: "Invalid payment method" };
  const paymentDate = new Date(input.date);
  if (Number.isNaN(paymentDate.getTime())) return { success: false as const, message: "Invalid payment date" };

  let amountToRecord = input.amount;
  if (input.targetStatus === "PAID" && amountToRecord < remaining) {
    amountToRecord = remaining;
  }
  if (amountToRecord <= 0) return { success: false as const, message: "Invalid payment amount" };
  if (amountToRecord > remaining + 0.009) {
    return { success: false as const, message: `Payment exceeds pending amount by ${(amountToRecord - remaining).toFixed(2)}` };
  }

  let newPaidAmount = currentPaid + amountToRecord;
  let finalStatus: "PAID" | "PARTIAL" = input.targetStatus;
  if (newPaidAmount >= total - 0.01) {
    finalStatus = "PAID";
    newPaidAmount = total;
  }

  let createdPaymentId = "";
  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        invoiceId: input.invoiceId,
        amount: amountToRecord,
        method: input.method,
        date: paymentDate,
        reference: input.reference,
        notes: input.notes,
        recordedBy: input.actor?.userId
      }
    });
    createdPaymentId = payment.id;

    await tx.invoice.update({
      where: { id: input.invoiceId },
      data: {
        paymentStatus: finalStatus,
        paidAmount: newPaidAmount,
        status: finalStatus === "PAID" ? "PAID" : "ISSUED"
      }
    });

    await tx.sale.updateMany({
      where: { invoiceId: input.invoiceId },
      data: { paymentStatus: finalStatus }
    });
  });

  if (input.actor?.userId || input.actor?.userName) {
    await logActivity({
      entityType: "Invoice",
      entityId: input.invoiceId,
      entityIdentifier: invoice.invoiceNumber,
      actionType: "EDIT",
      source: "WEB",
      userId: input.actor.userId,
      userName: input.actor.userName,
      oldData: {
        paymentStatus: invoice.paymentStatus,
        paidAmount: currentPaid,
        balanceDue: Math.max(0, total - currentPaid)
      },
      newData: {
        paymentStatus: finalStatus,
        paidAmount: newPaidAmount,
        balanceDue: Math.max(0, total - newPaidAmount),
        payment: {
          id: createdPaymentId,
          amount: amountToRecord,
          method: input.method,
          reference: input.reference || null,
          date: paymentDate
        }
      },
      details: "Payment transaction recorded"
    });
  }

  return {
    success: true as const,
    message: `Payment recorded successfully (${finalStatus})`,
    paymentId: createdPaymentId,
    paymentStatus: finalStatus,
    paidAmount: newPaidAmount,
    pendingAmount: Math.max(0, total - newPaidAmount)
  };
}
