import { prisma } from "@/lib/prisma";
import { normalizeDateToUtcNoon } from "@/lib/date";
import { updateInvoiceBillingFromDisplayOptions } from "@/lib/invoice-billing";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

async function run() {
  const inv = await prisma.inventory.findFirst({ where: { status: "IN_STOCK" }, select: { id: true } });
  assert(inv, "Need at least one IN_STOCK inventory item for integration test");

  const sale = await prisma.sale.create({
    data: {
      inventoryId: inv!.id,
      platform: "TEST",
      saleDate: new Date("2026-03-11T00:00:00.000Z"),
      customerName: "Test Customer",
      salePrice: 16000,
      discountAmount: 0,
      netAmount: 16000,
      profit: 0,
      paymentStatus: "UNPAID",
    },
    select: { id: true }
  });

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: `INV-TEST-${Date.now()}`,
      token: `tok_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      status: "ISSUED",
      isActive: true,
      subtotal: 16000,
      taxTotal: 0,
      discountTotal: 0,
      totalAmount: 16000,
      paymentStatus: "UNPAID",
      paidAmount: 0,
      invoiceDate: normalizeDateToUtcNoon(new Date("2026-03-11T00:00:00.000Z")),
      displayOptions: JSON.stringify({ showSku: true })
    },
    select: { id: true }
  });
  const invoiceId = invoice.id;

  await prisma.sale.update({
    where: { id: sale.id },
    data: { invoiceId }
  });

  await prisma.payment.create({
    data: {
      invoiceId,
      amount: 16000,
      method: "UPI",
      date: new Date("2026-03-11T00:00:00.000Z"),
      reference: "TESTPAY",
      notes: "Integration test payment"
    }
  });
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { paidAmount: 16000, paymentStatus: "PAID", status: "PAID" }
  });

  const updateResult = await updateInvoiceBillingFromDisplayOptions({
    invoiceId,
    displayOptions: {
      showShippingCharge: true,
      shippingCharge: 150,
      showAdditionalCharge: false,
      additionalCharge: 0,
      showSku: true,
    },
    displayOptionsStr: JSON.stringify({
      showShippingCharge: true,
      shippingCharge: 150,
      showAdditionalCharge: false,
      additionalCharge: 0,
      showSku: true,
    })
  });
  const success = (updateResult as unknown as { success?: unknown }).success;
  assert(success === true, "Invoice should be updated");

  const updated = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { totalAmount: true, paidAmount: true, paymentStatus: true }
  });
  assert(updated, "Updated invoice must exist");
  assert(Math.abs((updated!.totalAmount || 0) - 16150) < 0.01, "Invoice total must include shipping charge");
  assert(Math.abs((updated!.paidAmount || 0) - 16000) < 0.01, "Paid amount must remain unchanged");
  assert(updated!.paymentStatus === "PARTIAL", "Payment status must downgrade to PARTIAL when balance increases");

  await prisma.invoice.delete({ where: { id: invoiceId } });
  await prisma.sale.delete({ where: { id: sale.id } });

  console.log("invoice-postpayment-charge.integration.ts passed");
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

