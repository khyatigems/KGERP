import { prisma } from "@/lib/prisma";

type ReconcileOptions = {
  dryRun?: boolean;
};

type ReconcileError = {
  invoiceId: string;
  invoiceNumber: string;
  reason: string;
};

type ReconcileResult = {
  scannedInvoices: number;
  invoicesWithExpectedPayments: number;
  invoicesBackfilled: number;
  createdPayments: number;
  totalBackfilledAmount: number;
  discrepancies: Array<{
    invoiceId: string;
    invoiceNumber: string;
    expectedPaid: number;
    actualPaid: number;
    delta: number;
  }>;
  errors: ReconcileError[];
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export async function reconcileHistoricalInvoicePayments(options: ReconcileOptions = {}): Promise<ReconcileResult> {
  const dryRun = options.dryRun ?? false;
  const invoices = await prisma.invoice.findMany({
    select: {
      id: true,
      invoiceNumber: true,
      totalAmount: true,
      paidAmount: true,
      paymentStatus: true,
      createdAt: true,
      updatedAt: true
    }
  });

  const invoiceIds = invoices.map((i) => i.id);
  const payments = invoiceIds.length
    ? await prisma.payment.findMany({
        where: { invoiceId: { in: invoiceIds } },
        select: { id: true, invoiceId: true, amount: true }
      })
    : [];
  const paymentMap = new Map<string, { sum: number; count: number }>();
  for (const payment of payments) {
    const prev = paymentMap.get(payment.invoiceId) || { sum: 0, count: 0 };
    prev.sum += payment.amount;
    prev.count += 1;
    paymentMap.set(payment.invoiceId, prev);
  }

  const result: ReconcileResult = {
    scannedInvoices: invoices.length,
    invoicesWithExpectedPayments: 0,
    invoicesBackfilled: 0,
    createdPayments: 0,
    totalBackfilledAmount: 0,
    discrepancies: [],
    errors: []
  };

  for (const invoice of invoices) {
    const totalAmount = round2(invoice.totalAmount || 0);
    const paidAmount = round2(invoice.paidAmount || 0);
    const actualPaid = round2(paymentMap.get(invoice.id)?.sum || 0);
    let expectedPaid = Math.max(0, Math.min(totalAmount, paidAmount));

    if (invoice.paymentStatus === "PAID") {
      expectedPaid = totalAmount;
    }

    if (expectedPaid <= 0.009) {
      continue;
    }

    result.invoicesWithExpectedPayments += 1;
    const delta = round2(expectedPaid - actualPaid);
    if (Math.abs(delta) <= 0.009) {
      continue;
    }

    if (delta < 0) {
      result.discrepancies.push({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        expectedPaid,
        actualPaid,
        delta
      });
      continue;
    }

    if (dryRun) {
      result.invoicesBackfilled += 1;
      result.createdPayments += 1;
      result.totalBackfilledAmount = round2(result.totalBackfilledAmount + delta);
      continue;
    }

    try {
      await prisma.$transaction(async (tx) => {
        await tx.payment.create({
          data: {
            invoiceId: invoice.id,
            amount: delta,
            method: "OTHER",
            date: invoice.updatedAt || invoice.createdAt,
            reference: `RECON-${invoice.invoiceNumber}`,
            notes: "Historical payment reconciliation backfill",
            recordedBy: "SYSTEM_RECONCILIATION"
          }
        });

        const normalizedPaidAmount = round2(actualPaid + delta);
        const normalizedStatus = normalizedPaidAmount >= totalAmount - 0.009 ? "PAID" : "PARTIAL";
        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            paidAmount: normalizedPaidAmount,
            paymentStatus: normalizedStatus
          }
        });
      });

      result.invoicesBackfilled += 1;
      result.createdPayments += 1;
      result.totalBackfilledAmount = round2(result.totalBackfilledAmount + delta);
    } catch (error) {
      result.errors.push({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        reason: error instanceof Error ? error.message : "Unknown reconciliation error"
      });
    }
  }

  return result;
}

export async function getPaymentCompletenessValidation() {
  const [invoiceCount, paymentCount] = await Promise.all([
    prisma.invoice.count(),
    prisma.payment.count()
  ]);

  const statusMismatches = await prisma.invoice.count({
    where: {
      paymentStatus: "PAID",
      paidAmount: { lt: 0.01 }
    }
  });

  return {
    invoiceCount,
    paymentCount,
    statusMismatches
  };
}
