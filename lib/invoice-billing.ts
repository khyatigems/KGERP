import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-logger";

export type InvoicePaymentStatus = "PAID" | "PARTIAL" | "UNPAID";

export function computeInvoicePaymentStatus(totalAmount: number, paidAmount: number): InvoicePaymentStatus {
  if (paidAmount >= totalAmount - 0.01) return "PAID";
  if (paidAmount > 0) return "PARTIAL";
  return "UNPAID";
}

export function computeInvoiceTotals(params: {
  itemsTotal: number;
  itemDiscount: number;
  displayOptions: Record<string, unknown>;
}) {
  const invoiceDiscountType = params.displayOptions.invoiceDiscountType === "PERCENT" ? "PERCENT" : "AMOUNT";
  const invoiceDiscountValue = Number(params.displayOptions.invoiceDiscountValue || 0);
  const invoiceDiscountAmount = invoiceDiscountType === "PERCENT"
    ? (params.itemsTotal * invoiceDiscountValue) / 100
    : invoiceDiscountValue;

  const showShippingCharge = typeof params.displayOptions.showShippingCharge === "boolean"
    ? Boolean(params.displayOptions.showShippingCharge)
    : Number(params.displayOptions.shippingCharge || 0) > 0;
  const showAdditionalCharge = typeof params.displayOptions.showAdditionalCharge === "boolean"
    ? Boolean(params.displayOptions.showAdditionalCharge)
    : Number(params.displayOptions.additionalCharge || 0) > 0;

  const shippingCharge = showShippingCharge ? Number(params.displayOptions.shippingCharge || 0) : 0;
  const additionalCharge = showAdditionalCharge ? Number(params.displayOptions.additionalCharge || 0) : 0;

  const totalBeforeExtras = Math.max(0, params.itemsTotal - invoiceDiscountAmount);
  const totalAmount = totalBeforeExtras + (Number.isFinite(shippingCharge) ? shippingCharge : 0) + (Number.isFinite(additionalCharge) ? additionalCharge : 0);

  return {
    invoiceDiscountAmount,
    shippingCharge,
    additionalCharge,
    discountTotal: params.itemDiscount + invoiceDiscountAmount,
    totalAmount,
  };
}

export async function updateInvoiceBillingFromDisplayOptions(params: {
  invoiceId: string;
  displayOptions: Record<string, unknown>;
  displayOptionsStr: string;
  actor?: { userId?: string; userName?: string };
}) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: params.invoiceId },
    select: {
      id: true,
      invoiceNumber: true,
      totalAmount: true,
      paidAmount: true,
      paymentStatus: true,
    }
  });
  if (!invoice) {
    return { success: false as const, message: "Invoice not found" };
  }

  const sales = await prisma.sale.findMany({
    where: { invoiceId: invoice.id },
    select: { netAmount: true, discountAmount: true }
  });

  const itemsTotal = sales.reduce((sum, s) => sum + (s.netAmount || 0), 0);
  const itemDiscount = sales.reduce((sum, s) => sum + (s.discountAmount || 0), 0);

  const totals = computeInvoiceTotals({
    itemsTotal,
    itemDiscount,
    displayOptions: params.displayOptions,
  });

  const oldPaidAmount = invoice.paidAmount || 0;
  const oldTotalAmount = invoice.totalAmount;
  const oldBalance = Math.max(0, oldTotalAmount - oldPaidAmount);
  const newBalance = Math.max(0, totals.totalAmount - oldPaidAmount);

  const nextPaymentStatus = computeInvoicePaymentStatus(totals.totalAmount, oldPaidAmount);
  const nextStatus = nextPaymentStatus === "PAID" ? "PAID" : "ISSUED";

  await prisma.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        displayOptions: params.displayOptionsStr,
        subtotal: itemsTotal,
        discountTotal: totals.discountTotal,
        totalAmount: totals.totalAmount,
        paymentStatus: nextPaymentStatus,
        status: nextStatus,
      }
    });

    await tx.sale.updateMany({
      where: { invoiceId: invoice.id },
      data: { paymentStatus: nextPaymentStatus }
    });

    if (params.actor?.userId || params.actor?.userName) {
      if (Math.abs(oldTotalAmount - totals.totalAmount) > 0.009 || oldBalance !== newBalance || invoice.paymentStatus !== nextPaymentStatus) {
        await logActivity({
          entityType: "Invoice",
          entityId: invoice.id,
          entityIdentifier: invoice.invoiceNumber,
          actionType: "EDIT",
          source: "WEB",
          userId: params.actor.userId,
          userName: params.actor.userName,
          oldData: { totalAmount: oldTotalAmount, balanceDue: oldBalance, paymentStatus: invoice.paymentStatus },
          newData: { totalAmount: totals.totalAmount, balanceDue: newBalance, paymentStatus: nextPaymentStatus },
          details: oldPaidAmount > 0 && newBalance > 0
            ? `Outstanding balance increased by ${(newBalance - oldBalance).toFixed(2)}`
            : "Invoice totals/payment status recalculated"
        });
      }
    }
  });

  return {
    success: true as const,
    paymentStatus: nextPaymentStatus,
    totalAmount: totals.totalAmount,
    balanceDue: newBalance,
    outstandingDelta: oldPaidAmount > 0 ? newBalance - oldBalance : 0,
  };
}

export async function selfHealInvoicePaymentOnLoad(params: {
  invoiceId: string;
  invoiceNumber: string;
  persistedTotalAmount: number;
  computedTotalAmount: number;
  paidAmount: number;
  currentPaymentStatus: string;
  currentStatus: string;
}) {
  const paidAmount = params.paidAmount || 0;
  const computedTotalAmount = Math.max(0, params.computedTotalAmount || 0);
  const currentTotalAmount = Math.max(0, params.persistedTotalAmount || 0);
  const nextPaidAmount = Math.min(computedTotalAmount, Math.max(0, paidAmount));
  const nextPaymentStatus = computeInvoicePaymentStatus(computedTotalAmount, paidAmount);
  const nextStatus = nextPaymentStatus === "PAID" ? "PAID" : "ISSUED";

  const requiresUpdate =
    Math.abs(currentTotalAmount - computedTotalAmount) > 0.009 ||
    params.currentPaymentStatus !== nextPaymentStatus ||
    params.currentStatus !== nextStatus ||
    Math.abs((params.paidAmount || 0) - nextPaidAmount) > 0.009;

  if (!requiresUpdate) {
    return {
      updated: false as const,
      paymentStatus: nextPaymentStatus,
      status: nextStatus,
      totalAmount: computedTotalAmount,
      balanceDue: Math.max(0, computedTotalAmount - paidAmount),
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id: params.invoiceId },
      data: {
        totalAmount: computedTotalAmount,
        paymentStatus: nextPaymentStatus,
        status: nextStatus,
        paidAmount: nextPaidAmount,
      }
    });

    await tx.sale.updateMany({
      where: { invoiceId: params.invoiceId },
      data: { paymentStatus: nextPaymentStatus }
    });
  });

  await logActivity({
    entityType: "Invoice",
    entityId: params.invoiceId,
    entityIdentifier: params.invoiceNumber,
    actionType: "EDIT",
    source: "WEB",
    userName: "System Self-Heal",
    oldData: {
      totalAmount: currentTotalAmount,
      paymentStatus: params.currentPaymentStatus,
      status: params.currentStatus,
      paidAmount,
      balanceDue: Math.max(0, currentTotalAmount - paidAmount)
    },
    newData: {
      totalAmount: computedTotalAmount,
      paymentStatus: nextPaymentStatus,
      status: nextStatus,
      paidAmount: nextPaidAmount,
      balanceDue: Math.max(0, computedTotalAmount - nextPaidAmount)
    },
    details: "Auto-corrected invoice payment status/total on load"
  });

  return {
    updated: true as const,
    paymentStatus: nextPaymentStatus,
    status: nextStatus,
    totalAmount: computedTotalAmount,
    balanceDue: Math.max(0, computedTotalAmount - nextPaidAmount),
  };
}

