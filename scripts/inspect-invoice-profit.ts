import { prisma } from "../lib/prisma";

function parseDisplayOptions(displayOptions: string | null | undefined): Record<string, unknown> | null {
  if (!displayOptions) return null;
  try {
    return JSON.parse(String(displayOptions)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function computeInvoiceDisplayDiscount(params: {
  displayOptions: string | null | undefined;
  itemsInclusiveTotal: number;
}): number {
  const parsed = parseDisplayOptions(params.displayOptions);
  if (!parsed) return 0;
  const affectsTotal = parsed.invoiceDiscountAffectsTotal !== false;
  if (!affectsTotal) return 0;

  const discountType = parsed.invoiceDiscountType === "PERCENT" ? "PERCENT" : "AMOUNT";
  const discountValue = Number(parsed.invoiceDiscountValue || 0);
  if (!Number.isFinite(discountValue) || discountValue <= 0) return 0;

  const raw = discountType === "PERCENT" ? (params.itemsInclusiveTotal * discountValue) / 100 : discountValue;
  return Math.max(0, Math.min(raw, params.itemsInclusiveTotal));
}

async function main() {
  const identifier = process.argv[2];
  if (!identifier) {
    // eslint-disable-next-line no-console
    console.error("Usage: npx tsx scripts/inspect-invoice-profit.ts <INV-2026-0026|token>");
    process.exitCode = 1;
    return;
  }

  const invoice = await prisma.invoice.findFirst({
    where: {
      OR: [{ invoiceNumber: identifier }, { token: identifier }],
    },
    select: {
      id: true,
      invoiceNumber: true,
      token: true,
      discountTotal: true,
      totalAmount: true,
      displayOptions: true,
      sales: {
        select: {
          id: true,
          inventoryId: true,
          salePrice: true,
          netAmount: true,
          taxAmount: true,
          discountAmount: true,
          costPriceSnapshot: true,
          profit: true,
          inventory: { select: { sku: true, itemName: true } },
        },
      },
    },
  });

  if (!invoice) {
    // eslint-disable-next-line no-console
    console.error(`Invoice not found: ${identifier}`);
    process.exitCode = 1;
    return;
  }

  const list = invoice.sales;
  const itemsInclusiveTotal = list.reduce((sum, s) => sum + Number(s.netAmount || 0), 0);
  const taxableTotal = list.reduce((sum, s) => {
    const net = Number(s.netAmount || 0);
    const tax = Number(s.taxAmount ?? NaN);
    const base = Number.isFinite(tax) && tax > 0 ? net - tax : net;
    return sum + (Number.isFinite(base) ? base : 0);
  }, 0);

  const totalItemDiscount = list.reduce((sum, s) => sum + Number(s.discountAmount || 0), 0);
  const persistedDiscountTotal = Number(invoice.discountTotal || 0);
  const couponDiscount = Math.max(0, persistedDiscountTotal - totalItemDiscount);
  const displayDiscount = computeInvoiceDisplayDiscount({
    displayOptions: invoice.displayOptions,
    itemsInclusiveTotal,
  });
  const totalInvoiceLevelDiscountInclusive = couponDiscount + displayDiscount;
  const totalInvoiceLevelDiscountTaxable = totalInvoiceLevelDiscountInclusive > 0
    ? totalInvoiceLevelDiscountInclusive * (taxableTotal / (itemsInclusiveTotal || 1))
    : 0;

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    token: invoice.token,
    itemsInclusiveTotal,
    taxableTotal,
    discountTotalPersisted: persistedDiscountTotal,
    totalItemDiscount,
    couponDiscount,
    displayDiscount,
    totalInvoiceLevelDiscountInclusive,
    totalInvoiceLevelDiscountTaxable,
    totalAmountPersisted: Number(invoice.totalAmount || 0),
    displayOptions: parseDisplayOptions(invoice.displayOptions),
  }, null, 2));

  for (const s of list) {
    const net = Number(s.netAmount || 0);
    const tax = Number(s.taxAmount ?? NaN);
    const lineTaxable = Number.isFinite(tax) && tax > 0 ? net - tax : net;
    const cost = Number(s.costPriceSnapshot ?? NaN);
    const baseProfit = Number.isFinite(cost) ? lineTaxable - cost : Number(s.profit || 0);
    const weight = taxableTotal > 0 ? lineTaxable / taxableTotal : 0;
    const share = totalInvoiceLevelDiscountTaxable > 0 ? totalInvoiceLevelDiscountTaxable * weight : 0;
    const computedProfit = baseProfit - share;

    // eslint-disable-next-line no-console
    console.log(JSON.stringify({
      saleId: s.id,
      sku: s.inventory.sku,
      itemName: s.inventory.itemName,
      salePrice: Number(s.salePrice || 0),
      netAmount: net,
      taxAmount: Number.isFinite(tax) ? tax : null,
      taxable: lineTaxable,
      discountAmount: Number(s.discountAmount || 0),
      costPriceSnapshot: Number.isFinite(cost) ? cost : null,
      storedProfit: Number(s.profit || 0),
      computedProfit,
      discountShareTaxable: share,
    }, null, 2));
  }
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
