import { prisma } from "@/lib/prisma";
import { recordInvoicePayment } from "@/lib/invoice-payment";
import { ACCOUNTS } from "@/lib/accounting";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

async function run() {
  const inventory = await prisma.inventory.create({
    data: {
      sku: `TMP-LIB-${Date.now()}`,
      itemName: "Ledger Test SKU",
      category: "Loose Gemstone",
      costPrice: 1,
      sellingPrice: 1,
      status: "IN_STOCK",
    },
    select: { id: true },
  });

  const sale = await prisma.sale.create({
    data: {
      inventoryId: inventory.id,
      platform: "TEST",
      saleDate: new Date("2026-03-16T00:00:00.000Z"),
      customerName: "Ledger Customer",
      salePrice: 5000,
      netAmount: 5000,
      paymentStatus: "UNPAID",
    },
    select: { id: true },
  });

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: `INV-LDG-${Date.now()}`,
      token: `tok_ldg_${Date.now()}`,
      status: "ISSUED",
      isActive: true,
      subtotal: 5000,
      taxTotal: 0,
      discountTotal: 0,
      totalAmount: 5000,
      paymentStatus: "UNPAID",
      paidAmount: 0,
    },
    select: { id: true },
  });

  await prisma.sale.update({ where: { id: sale.id }, data: { invoiceId: invoice.id } });

  const paymentResult = await recordInvoicePayment({
    invoiceId: invoice.id,
    targetStatus: "PARTIAL",
    amount: 5000,
    method: "CASH",
    date: "2026-03-17",
    reference: "LEDGER-CASH",
    notes: "Ledger smoke test",
  });

  assert(paymentResult.success, "Payment should succeed");

  const entry = await prisma.journalEntry.findFirst({
    where: { referenceId: paymentResult.paymentId, referenceType: "INVOICE_PAYMENT" },
    include: { lines: { include: { account: true } } },
  });

  assert(entry, "Journal entry should exist for payment");
  assert(entry!.lines.length === 2, "Payment entry should have two lines");

  const debit = entry!.lines.find((line) => line.debit > 0);
  const credit = entry!.lines.find((line) => line.credit > 0);

  assert(debit && credit, "Debit and credit lines must exist");
  assert(
    debit!.account.code === ACCOUNTS.ASSETS.CASH,
    `Debit should hit cash account (expected ${ACCOUNTS.ASSETS.CASH}, got ${debit!.account.code})`
  );
  assert(
    credit!.account.code === ACCOUNTS.ASSETS.ACCOUNTS_RECEIVABLE,
    `Credit should hit accounts receivable (expected ${ACCOUNTS.ASSETS.ACCOUNTS_RECEIVABLE}, got ${credit!.account.code})`
  );

  await prisma.journalEntry.delete({ where: { id: entry!.id } }).catch(() => undefined);
  await prisma.payment.delete({ where: { id: paymentResult.paymentId } }).catch(() => undefined);
  await prisma.invoice.delete({ where: { id: invoice.id } }).catch(() => undefined);
  await prisma.sale.delete({ where: { id: sale.id } }).catch(() => undefined);
  await prisma.inventory.delete({ where: { id: inventory.id } }).catch(() => undefined);

  console.log("invoice-payment-ledger.integration.ts passed");
}

run()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
