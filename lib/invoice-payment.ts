import { prisma } from "@/lib/prisma";
import { ACCOUNTS, getOrCreateAccountByCode, postJournalEntry, PrismaTx } from "@/lib/accounting";
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

  const allowedMethods = new Set(["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "OTHER", "CREDIT_NOTE"]);
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
