import crypto from "crypto";
import { ensureBillfreePhase1Schema, prisma } from "@/lib/prisma";
import {
  ACCOUNTS,
  getOrCreateAccountByCode,
  postJournalEntry,
  PrismaTx,
  resolvePaymentAccountCode,
  type JournalLineInput,
} from "@/lib/accounting";
import { getPaymentMethodLabel } from "@/lib/payment-breakdown";
import { logActivity } from "@/lib/activity-logger";

export type InvoicePaymentInput = {
  invoiceId: string;
  targetStatus: "PAID" | "PARTIAL";
  amount: number;
  method: string;
  date: string;
  reference?: string;
  notes?: string;
  couponCode?: string;
  useLoyaltyRedeem?: boolean;
  actor?: { userId?: string; userName?: string };
};

export async function recordInvoicePayment(input: InvoicePaymentInput) {
  await ensureBillfreePhase1Schema();
  const invoice = await prisma.invoice.findUnique({ where: { id: input.invoiceId } });
  if (!invoice) return { success: false as const, message: "Invoice not found" };

  const invoiceCtx = await prisma.invoice.findUnique({
    where: { id: input.invoiceId },
    select: {
      id: true,
      invoiceNumber: true,
      paidAmount: true,
      totalAmount: true,
      paymentStatus: true,
      sales: {
        take: 1,
        select: {
          customerId: true,
          customerName: true,
          customer: { select: { name: true } },
        },
      },
      legacySale: {
        select: {
          customerId: true,
          customerName: true,
        },
      },
      quotation: {
        select: {
          customerId: true,
          customerName: true,
          customer: { select: { name: true } },
        },
      },
    },
  });
  if (!invoiceCtx) return { success: false as const, message: "Invoice not found" };

  const customerId =
    invoiceCtx.sales?.[0]?.customerId ||
    invoiceCtx.legacySale?.customerId ||
    invoiceCtx.quotation?.customerId ||
    null;

  const partyName =
    invoiceCtx.sales?.[0]?.customer?.name ||
    invoiceCtx.sales?.[0]?.customerName ||
    invoiceCtx.legacySale?.customerName ||
    invoiceCtx.quotation?.customer?.name ||
    invoiceCtx.quotation?.customerName ||
    null;

  const allowedMethods = new Set(["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "OTHER", "CREDIT_NOTE", "LOYALTY_REDEEM"]);
  if (!allowedMethods.has(input.method)) return { success: false as const, message: "Invalid payment method" };
  const paymentDate = new Date(input.date);
  if (Number.isNaN(paymentDate.getTime())) return { success: false as const, message: "Invalid payment date" };

  let total = Number(invoiceCtx.totalAmount || 0);
  let currentPaid = Number(invoiceCtx.paidAmount || 0);

  if (input.couponCode && String(input.couponCode).trim()) {
    const existing = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM "CouponRedemption" WHERE invoiceId = ? LIMIT 1`,
      input.invoiceId
    );
    if (existing.length > 0) return { success: false as const, message: "Coupon already applied on this invoice" };

    const code = String(input.couponCode).trim().toUpperCase();
    const coupons = await prisma.$queryRawUnsafe<Array<{
      id: string;
      code: string;
      type: string;
      value: number;
      maxDiscount: number | null;
      minInvoiceAmount: number | null;
      validFrom: string | null;
      validTo: string | null;
      usageLimitTotal: number | null;
      usageLimitPerCustomer: number | null;
      applicableScope: string;
      isActive: number;
    }>>(
      `SELECT id, code, type, value, maxDiscount, minInvoiceAmount, validFrom, validTo,
              usageLimitTotal, usageLimitPerCustomer, applicableScope, isActive
       FROM "Coupon" WHERE code = ? LIMIT 1`,
      code
    );
    const coupon = coupons?.[0];
    if (!coupon || Number(coupon.isActive || 0) !== 1) return { success: false as const, message: "Invalid or inactive coupon" };

    const now = Date.now();
    if (coupon.validFrom && new Date(coupon.validFrom).getTime() > now) {
      return { success: false as const, message: "Coupon is not active yet" };
    }
    if (coupon.validTo && new Date(coupon.validTo).getTime() < now) {
      return { success: false as const, message: "Coupon expired" };
    }
    if (coupon.minInvoiceAmount != null && total + 0.009 < Number(coupon.minInvoiceAmount || 0)) {
      return { success: false as const, message: "Invoice amount does not meet coupon minimum value" };
    }
    const scope = String(coupon.applicableScope || "all");
    if (scope.startsWith("customer:")) {
      const targetCustomerId = scope.split(":")[1] || "";
      if (!customerId || targetCustomerId !== customerId) {
        return { success: false as const, message: "Coupon is not assigned to this customer" };
      }
    }

    const usageTotalRows = await prisma.$queryRawUnsafe<Array<{ cnt: number }>>(
      `SELECT COUNT(1) as cnt FROM "CouponRedemption" WHERE couponId = ?`,
      coupon.id
    );
    const usageTotal = Number(usageTotalRows?.[0]?.cnt || 0);
    if (coupon.usageLimitTotal != null && usageTotal >= Number(coupon.usageLimitTotal || 0)) {
      return { success: false as const, message: "Coupon usage limit reached" };
    }

    if (customerId) {
      const usageCustomerRows = await prisma.$queryRawUnsafe<Array<{ cnt: number }>>(
        `SELECT COUNT(1) as cnt FROM "CouponRedemption" WHERE couponId = ? AND customerId = ?`,
        coupon.id,
        customerId
      );
      const usageCustomer = Number(usageCustomerRows?.[0]?.cnt || 0);
      if (coupon.usageLimitPerCustomer != null && usageCustomer >= Number(coupon.usageLimitPerCustomer || 0)) {
        return { success: false as const, message: "Coupon per-customer limit reached" };
      }
    }

    let couponDiscount = coupon.type === "PERCENT"
      ? (total * Number(coupon.value || 0)) / 100
      : Number(coupon.value || 0);
    if (coupon.maxDiscount != null) couponDiscount = Math.min(couponDiscount, Number(coupon.maxDiscount || 0));
    couponDiscount = Math.max(0, Math.min(couponDiscount, total));
    if (couponDiscount <= 0.009) return { success: false as const, message: "Coupon discount is zero for this invoice" };

    if (currentPaid > total - couponDiscount + 0.009) {
      return { success: false as const, message: "Cannot apply coupon after this level of payment" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `INSERT INTO "CouponRedemption" (id, couponId, invoiceId, customerId, discountAmount, redeemedAt)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        crypto.randomUUID(),
        coupon.id,
        input.invoiceId,
        customerId,
        couponDiscount
      );

      const newTotal = Math.max(0, total - couponDiscount);
      const nextPaymentStatus =
        currentPaid >= newTotal - 0.01 ? "PAID" : currentPaid > 0 ? "PARTIAL" : "UNPAID";
      await tx.invoice.update({
        where: { id: input.invoiceId },
        data: {
          totalAmount: newTotal,
          discountTotal: (invoice.discountTotal || 0) + couponDiscount,
          paymentStatus: nextPaymentStatus,
          status: nextPaymentStatus === "PAID" ? "PAID" : "ISSUED",
        },
      });
      await tx.sale.updateMany({
        where: { invoiceId: input.invoiceId },
        data: { paymentStatus: nextPaymentStatus },
      });
    });

    total = total - couponDiscount;
  }

  const remaining = total - currentPaid;
  if (remaining <= 0.009) return { success: false as const, message: "Invoice is already fully paid" };

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
  let loyaltyPointsDelta = 0;
  await prisma.$transaction(async (tx) => {
    let paymentNotes = input.notes;
    if (input.method === "CREDIT_NOTE") {
      const invWithCustomer = await tx.invoice.findUnique({
        where: { id: input.invoiceId },
        select: {
          invoiceNumber: true,
          sales: { take: 1, select: { customerId: true, customerName: true } },
          quotation: { select: { customerId: true, customerName: true } }
        }
      });
      const customerId = invWithCustomer?.sales?.[0]?.customerId || invWithCustomer?.quotation?.customerId || null;
      let remainingToAllocate = amountToRecord;
      const ref = (input.reference || "").trim();
      if (!ref && !customerId) throw new Error("Credit note code is required");
      const openCNs = ref
        ? await tx.$queryRawUnsafe<
            Array<{ id: string; creditNoteNumber: string; balanceAmount: number; customerId: string | null; cnCustomerName: string | null }>
          >(
            `SELECT cn.id,
                    cn.creditNoteNumber,
                    cn.balanceAmount,
                    cn.customerId,
                    (SELECT COALESCE(c.name, s.customerName, q.customerName)
                     FROM Invoice i
                     LEFT JOIN Customer c ON c.id = cn.customerId
                     LEFT JOIN Sale s ON s.invoiceId = i.id
                     LEFT JOIN Quotation q ON q.id = i.quotationId
                     WHERE i.id = cn.invoiceId
                     LIMIT 1) as cnCustomerName
             FROM CreditNote cn
             WHERE cn.creditNoteNumber = ?
               AND cn.isActive = 1
               AND cn.balanceAmount > 0
               AND COALESCE(cn.activeUntil, datetime(cn.issueDate, '+90 day')) >= CURRENT_TIMESTAMP
             LIMIT 1`,
            ref
          )
        : await tx.$queryRawUnsafe<Array<{ id: string; creditNoteNumber: string; balanceAmount: number; customerId: string | null }>>(
            `SELECT id, creditNoteNumber, balanceAmount, customerId
             FROM CreditNote
             WHERE customerId = ?
               AND isActive = 1
               AND balanceAmount > 0
               AND COALESCE(activeUntil, datetime(issueDate, '+90 day')) >= CURRENT_TIMESTAMP
             ORDER BY issueDate ASC`,
            customerId
          );
      const used: Array<{ id: string; num: string; used: number }> = [];
      for (const cn of openCNs) {
        if (remainingToAllocate <= 0) break;
        const use = Math.min(remainingToAllocate, cn.balanceAmount);
        if (use <= 0) continue;
        await tx.$executeRawUnsafe(`UPDATE CreditNote SET balanceAmount = balanceAmount - ? WHERE id = ?`, use, cn.id);
        await tx.activityLog.create({
          data: {
            entityType: "CreditNote",
            entityId: cn.id,
            entityIdentifier: cn.creditNoteNumber,
            actionType: "APPLY",
            source: "WEB",
            userId: input.actor?.userId,
            userName: input.actor?.userName,
            details: `Applied ${use.toFixed(2)} on invoice ${invWithCustomer?.invoiceNumber || input.invoiceId}`,
          },
        });
        used.push({ id: cn.id, num: cn.creditNoteNumber, used: use });
        remainingToAllocate -= use;
      }
      if (remainingToAllocate > 0.009) {
        throw new Error("Insufficient credit note balance");
      }
      const summary = used.map((u) => `${u.num}: ${u.used.toFixed(2)}`).join(", ");
      paymentNotes = paymentNotes ? `${paymentNotes} | CN ${summary}` : `CN ${summary}`;
    }

    if (input.method === "LOYALTY_REDEEM") {
      if (!customerId) throw new Error("Customer is required for loyalty redemption");
      const lRows = await tx.$queryRawUnsafe<Array<{
        redeemRupeePerPoint: number;
        minRedeemPoints: number;
        maxRedeemPercent: number;
      }>>(
        `SELECT redeemRupeePerPoint, minRedeemPoints, maxRedeemPercent FROM "LoyaltySettings" WHERE id = 'default' LIMIT 1`
      );
      const ls = lRows?.[0] || { redeemRupeePerPoint: 1, minRedeemPoints: 0, maxRedeemPercent: 30 };
      const redeemRupeePerPoint = Math.max(0.0001, Number(ls.redeemRupeePerPoint || 1));
      const minRedeemPoints = Math.max(0, Number(ls.minRedeemPoints || 0));
      const maxRedeemPercent = Math.max(0, Math.min(100, Number(ls.maxRedeemPercent || 30)));

      const maxAllowedByPercent = (total * maxRedeemPercent) / 100;
      if (amountToRecord > maxAllowedByPercent + 0.009) {
        throw new Error(`Loyalty redemption exceeds ${maxRedeemPercent}% cap`);
      }

      const balRows = await tx.$queryRawUnsafe<Array<{ points: number }>>(
        `SELECT COALESCE(SUM(points),0) as points FROM "LoyaltyLedger" WHERE customerId = ?`,
        customerId
      );
      const availablePoints = Number(balRows?.[0]?.points || 0);
      const needPoints = amountToRecord / redeemRupeePerPoint;
      if (needPoints + 0.0001 < minRedeemPoints) {
        throw new Error(`Minimum redeem points is ${minRedeemPoints}`);
      }
      if (needPoints > availablePoints + 0.0001) {
        throw new Error("Insufficient loyalty points");
      }

      loyaltyPointsDelta = -needPoints;
      await tx.$executeRawUnsafe(
        `INSERT INTO "LoyaltyLedger" (id, customerId, invoiceId, type, points, rupeeValue, remarks, createdAt)
         VALUES (?, ?, ?, 'REDEEM', ?, ?, ?, CURRENT_TIMESTAMP)`,
        crypto.randomUUID(),
        customerId,
        input.invoiceId,
        loyaltyPointsDelta,
        -amountToRecord,
        `Redeemed on invoice ${invoiceCtx.invoiceNumber}`
      );
      paymentNotes = paymentNotes
        ? `${paymentNotes} | Loyalty points used: ${Math.abs(needPoints).toFixed(2)}`
        : `Loyalty points used: ${Math.abs(needPoints).toFixed(2)}`;
    }

    const payment = await tx.payment.create({
      data: {
        invoiceId: input.invoiceId,
        amount: amountToRecord,
        method: input.method,
        date: paymentDate,
        reference: input.reference,
        notes: paymentNotes,
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

    const methodLabel = getPaymentMethodLabel(input.method);
    const narrationParts = [
      `Payment received for Invoice ${invoiceCtx.invoiceNumber}`,
      partyName ? `From Party: ${partyName}` : undefined,
      `Payment Method: ${methodLabel}`,
      input.reference ? `Reference: ${input.reference}` : undefined,
      input.notes ? `Notes: ${input.notes}` : undefined,
    ];
    const narration = narrationParts.filter(Boolean).join(" | ");

    const arAccount = await getOrCreateAccountByCode(ACCOUNTS.ASSETS.ACCOUNTS_RECEIVABLE, tx);
    const lines: JournalLineInput[] = [];

    if (input.method === "LOYALTY_REDEEM") {
      const loyaltyAccount = await getOrCreateAccountByCode(ACCOUNTS.EXPENSES.LOYALTY_REDEMPTION, tx);
      lines.push(
        {
          accountId: loyaltyAccount.id,
          debit: amountToRecord,
          description: narration || `Loyalty redemption applied to Invoice ${invoiceCtx.invoiceNumber}`,
        },
        {
          accountId: arAccount.id,
          credit: amountToRecord,
          description: narration || `Accounts Receivable settled via Loyalty redeem for Invoice ${invoiceCtx.invoiceNumber}`,
        }
      );
    } else if (input.method === "CREDIT_NOTE") {
      const creditNoteAccount = await getOrCreateAccountByCode(ACCOUNTS.LIABILITIES.CREDIT_NOTES_APPLIED, tx);
      lines.push(
        {
          accountId: creditNoteAccount.id,
          debit: amountToRecord,
          description: narration || `Credit note applied to Invoice ${invoiceCtx.invoiceNumber}`,
        },
        {
          accountId: arAccount.id,
          credit: amountToRecord,
          description: narration || `Accounts Receivable settled via Credit Note for Invoice ${invoiceCtx.invoiceNumber}`,
        }
      );
    } else {
      const debitAccountCode = resolvePaymentAccountCode(input.method);
      const debitAccount = await getOrCreateAccountByCode(debitAccountCode, tx);
      lines.push(
        {
          accountId: debitAccount.id,
          debit: amountToRecord,
          description: narration || `Payment by ${methodLabel} for Invoice ${invoiceCtx.invoiceNumber}`,
        },
        {
          accountId: arAccount.id,
          credit: amountToRecord,
          description: narration || `Accounts Receivable settled for Invoice ${invoiceCtx.invoiceNumber}`,
        }
      );
    }

    if (lines.length === 0) {
      throw new Error(`No accounting lines generated for payment method ${input.method}`);
    }

    await postJournalEntry(
      {
        date: paymentDate,
        description: narration,
        referenceType: "INVOICE_PAYMENT",
        referenceId: createdPaymentId,
        userId: input.actor?.userId || "system",
        lines,
      },
      tx
    ).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create accounting entry for payment ${createdPaymentId}: ${message}`);
    });
  });

  if (input.actor?.userId || input.actor?.userName) {
    await logActivity({
      entityType: "Invoice",
      entityId: input.invoiceId,
      entityIdentifier: invoiceCtx.invoiceNumber,
      actionType: "EDIT",
      source: "WEB",
      userId: input.actor.userId,
      userName: input.actor.userName,
      oldData: {
        paymentStatus: invoiceCtx.paymentStatus,
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
          date: paymentDate,
          loyaltyPointsDelta: loyaltyPointsDelta || 0,
          couponCode: input.couponCode || null,
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

export async function applyCreditNotesOnInvoiceCreation(params: {
  tx: PrismaTx;
  invoiceId: string;
  customerId: string | null | undefined;
  actorId?: string;
}) {
  if (!params.customerId) return { appliedAmount: 0 };
  const inv = await params.tx.invoice.findUnique({
    where: { id: params.invoiceId },
    select: { totalAmount: true, paidAmount: true, paymentStatus: true },
  });
  if (!inv) return { appliedAmount: 0 };
  let remaining = Math.max(0, (inv.totalAmount || 0) - (inv.paidAmount || 0));
  if (remaining <= 0.009) return { appliedAmount: 0 };
  const cnRows = await params.tx.$queryRawUnsafe<Array<{ id: string; creditNoteNumber: string; balanceAmount: number }>>(
    `SELECT id, creditNoteNumber, balanceAmount
     FROM CreditNote
     WHERE customerId = ?
       AND isActive = 1
       AND balanceAmount > 0
       AND COALESCE(activeUntil, datetime(issueDate, '+90 day')) >= CURRENT_TIMESTAMP
     ORDER BY issueDate ASC`,
    params.customerId
  );
  const used: Array<{ id: string; num: string; used: number }> = [];
  for (const cn of cnRows) {
    if (remaining <= 0) break;
    const use = Math.min(remaining, Number(cn.balanceAmount || 0));
    if (use <= 0) continue;
    await params.tx.$executeRawUnsafe(`UPDATE CreditNote SET balanceAmount = balanceAmount - ? WHERE id = ?`, use, cn.id);
    used.push({ id: cn.id, num: cn.creditNoteNumber, used: use });
    remaining -= use;
  }
  const appliedAmount = used.reduce((s, u) => s + u.used, 0);
  if (appliedAmount > 0.009) {
    const summary = used.map((u) => `${u.num}: ${u.used.toFixed(2)}`).join(", ");
    await params.tx.payment.create({
      data: {
        invoiceId: params.invoiceId,
        amount: appliedAmount,
        method: "CREDIT_NOTE",
        date: new Date(),
        reference: `CN allocation`,
        notes: `CN ${summary}`,
        recordedBy: params.actorId,
      },
    });
    const newPaid = (inv.paidAmount || 0) + appliedAmount;
    const paymentStatus = newPaid >= (inv.totalAmount || 0) - 0.009 ? "PAID" : "PARTIAL";
    await params.tx.invoice.update({
      where: { id: params.invoiceId },
      data: { paidAmount: newPaid, paymentStatus, status: paymentStatus === "PAID" ? "PAID" : inv.paymentStatus },
    });

    try {
      const ar = await getOrCreateAccountByCode(ACCOUNTS.ASSETS.ACCOUNTS_RECEIVABLE, params.tx);
      const cnApplied = await getOrCreateAccountByCode(ACCOUNTS.LIABILITIES.CREDIT_NOTES_APPLIED, params.tx);
      await postJournalEntry({
        date: new Date(),
        description: `Credit Note Applied on Invoice ${params.invoiceId}`,
        referenceType: "INVOICE",
        referenceId: params.invoiceId,
        userId: params.actorId || "system",
        lines: [
          { accountId: cnApplied.id, debit: appliedAmount },
          { accountId: ar.id, credit: appliedAmount },
        ],
      }, params.tx);
    } catch (e) {
      console.warn("Journal entry for CN application failed:", e);
    }
  }
  return { appliedAmount };
}
