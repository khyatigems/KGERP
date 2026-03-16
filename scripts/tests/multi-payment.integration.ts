import { prisma } from "@/lib/prisma";
import { recordInvoicePayment } from "@/lib/invoice-payment";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

async function run() {
  const inventory = await prisma.inventory.findFirst({ where: { status: "IN_STOCK" }, select: { id: true } });
  let inventoryId = inventory?.id;
  let createdTemporaryInventory = false;
  if (!inventoryId) {
    const created = await prisma.inventory.create({
      data: {
        sku: `TMPMP${Date.now()}`,
        itemName: "Multi Payment Temp SKU",
        category: "Loose Gemstone",
        costPrice: 1,
        sellingPrice: 1,
        status: "IN_STOCK",
      },
      select: { id: true }
    });
    inventoryId = created.id;
    createdTemporaryInventory = true;
  }

  const sale = await prisma.sale.create({
    data: {
      inventoryId: inventoryId!,
      platform: "TEST",
      saleDate: new Date("2026-03-16T00:00:00.000Z"),
      customerName: "Multi Payment Test",
      salePrice: 7000,
      discountAmount: 0,
      netAmount: 7000,
      profit: 0,
      paymentStatus: "UNPAID",
    },
    select: { id: true }
  });

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: `INV-MP-${Date.now()}`,
      token: `tok_mp_${Date.now()}`,
      status: "ISSUED",
      isActive: true,
      subtotal: 7000,
      taxTotal: 0,
      discountTotal: 0,
      totalAmount: 7000,
      paymentStatus: "UNPAID",
      paidAmount: 0
    },
    select: { id: true, totalAmount: true }
  });

  await prisma.sale.update({ where: { id: sale.id }, data: { invoiceId: invoice.id } });

  const p1 = await recordInvoicePayment({
    invoiceId: invoice.id,
    targetStatus: "PARTIAL",
    amount: 3000,
    method: "UPI",
    date: "2026-03-16",
    reference: "UPI-3000",
    notes: "First tranche"
  });
  assert(p1.success, "First payment should be accepted");

  const p2 = await recordInvoicePayment({
    invoiceId: invoice.id,
    targetStatus: "PARTIAL",
    amount: 3800,
    method: "BANK_TRANSFER",
    date: "2026-03-17",
    reference: "BANK-3800",
    notes: "Second tranche"
  });
  assert(p2.success, "Second payment should be accepted");

  const current = await prisma.invoice.findUnique({
    where: { id: invoice.id },
    select: { paidAmount: true, paymentStatus: true, totalAmount: true }
  });
  assert(Boolean(current), "Invoice should exist");
  assert(current!.paidAmount === 6800, "Paid amount should be 6800");
  assert(current!.paymentStatus === "PARTIAL", "Status should remain PARTIAL after 6800/7000");

  const overpay = await recordInvoicePayment({
    invoiceId: invoice.id,
    targetStatus: "PARTIAL",
    amount: 500,
    method: "CASH",
    date: "2026-03-18",
    reference: "CASH-500",
    notes: "Overpayment attempt"
  });
  assert(!overpay.success, "Overpayment should be blocked");

  const settle = await recordInvoicePayment({
    invoiceId: invoice.id,
    targetStatus: "PAID",
    amount: 200,
    method: "CASH",
    date: "2026-03-18",
    reference: "CASH-200",
    notes: "Final settlement"
  });
  assert(settle.success, "Final settlement should succeed");

  const settled = await prisma.invoice.findUnique({
    where: { id: invoice.id },
    select: { paidAmount: true, paymentStatus: true, totalAmount: true, payments: { select: { id: true, method: true, amount: true }, orderBy: { date: "asc" } } }
  });
  assert(Boolean(settled), "Invoice should still exist");
  assert(settled!.paidAmount === 7000, "Paid amount should be capped at total");
  assert(settled!.paymentStatus === "PAID", "Status should be PAID after full settlement");
  assert(settled!.payments.length === 3, "There should be 3 recorded payment rows");

  await prisma.invoice.delete({ where: { id: invoice.id } });
  await prisma.sale.delete({ where: { id: sale.id } });
  if (createdTemporaryInventory) {
    await prisma.inventory.delete({ where: { id: inventoryId! } });
  }

  console.log("multi-payment.integration.ts passed");
}

run()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
