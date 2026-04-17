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
  itemsTotal: number;
}): number {
  const parsed = parseDisplayOptions(params.displayOptions);
  if (!parsed) return 0;

  // Even if configured as "display-only" (invoiceDiscountAffectsTotal = false), it is still a
  // commercial discount given to the customer and should reduce profit.
  const showDiscount = parsed.showInvoiceDiscount === true;
  const discountType = parsed.invoiceDiscountType === "PERCENT" ? "PERCENT" : "AMOUNT";
  const discountValue = Number(parsed.invoiceDiscountValue || 0);
  if (!(showDiscount || discountValue > 0)) return 0;
  if (!Number.isFinite(discountValue) || discountValue <= 0) return 0;

  const raw = discountType === "PERCENT" ? (params.itemsTotal * discountValue) / 100 : discountValue;
  return Math.max(0, Math.min(raw, params.itemsTotal));
}

async function main() {
  const sales = await prisma.sale.findMany({
    where: { invoiceId: { not: null } },
    select: {
      id: true,
      invoiceId: true,
      netAmount: true,
      taxAmount: true,
      discountAmount: true,
      costPriceSnapshot: true,
      profit: true,
      inventory: {
        select: {
          flatPurchaseCost: true,
          purchaseRatePerCarat: true,
          weightValue: true,
        },
      },
      invoice: {
        select: {
          id: true,
          discountTotal: true,
          displayOptions: true,
        },
      },
    },
  });

  const byInvoice = new Map<string, typeof sales>();
  for (const s of sales) {
    const invId = s.invoiceId;
    if (!invId) continue;
    const list = byInvoice.get(invId) || [];
    list.push(s);
    byInvoice.set(invId, list);
  }

  let updated = 0;
  let skipped = 0;

  for (const [invoiceId, list] of byInvoice.entries()) {
    const invoice = list[0]?.invoice;
    if (!invoice) {
      skipped += list.length;
      continue;
    }

    const itemsTotal = list.reduce((sum, s) => sum + Number(s.netAmount || 0), 0);
    if (!Number.isFinite(itemsTotal) || itemsTotal <= 0) {
      skipped += list.length;
      continue;
    }

    const taxableTotal = list.reduce((sum, s) => {
      const net = Number(s.netAmount || 0);
      const tax = Number(s.taxAmount ?? NaN);
      const base = Number.isFinite(tax) && tax > 0 ? net - tax : net;
      return sum + (Number.isFinite(base) ? base : 0);
    }, 0);
    if (!Number.isFinite(taxableTotal) || taxableTotal <= 0) {
      skipped += list.length;
      continue;
    }

    const totalItemDiscount = list.reduce((sum, s) => sum + Number(s.discountAmount || 0), 0);
    const persistedDiscountTotal = Number(invoice.discountTotal || 0);
    const couponDiscount = Math.max(0, persistedDiscountTotal - totalItemDiscount);

    const displayDiscount = computeInvoiceDisplayDiscount({
      displayOptions: invoice.displayOptions,
      itemsTotal,
    });

    const totalInvoiceLevelDiscount = couponDiscount + displayDiscount;
    const discountTaxable = totalInvoiceLevelDiscount > 0 ? totalInvoiceLevelDiscount * (taxableTotal / itemsTotal) : 0;

    const updates: Array<ReturnType<typeof prisma.sale.update>> = [];
    for (const s of list) {
      const costSnapshot = Number(s.costPriceSnapshot ?? NaN);
      const invFlatCost = Number(s.inventory?.flatPurchaseCost ?? NaN);
      const invRate = Number(s.inventory?.purchaseRatePerCarat ?? NaN);
      const invWeight = Number(s.inventory?.weightValue ?? NaN);
      const computedInventoryCost = Number.isFinite(invFlatCost) && invFlatCost > 0
        ? invFlatCost
        : (Number.isFinite(invRate) && Number.isFinite(invWeight) && invRate > 0 && invWeight > 0)
        ? invRate * invWeight
        : NaN;
      const effectiveCost = Number.isFinite(costSnapshot) ? costSnapshot : computedInventoryCost;
      const netAmount = Number(s.netAmount || 0);

      const tax = Number(s.taxAmount ?? NaN);
      const lineTaxable = Number.isFinite(tax) && tax > 0 ? netAmount - tax : netAmount;

      const baseProfit = Number.isFinite(effectiveCost) ? lineTaxable - effectiveCost : Number(s.profit || 0);
      const weight = taxableTotal > 0 ? lineTaxable / taxableTotal : 0;
      const share = discountTaxable > 0 ? discountTaxable * weight : 0;
      const newProfit = baseProfit - (Number.isFinite(share) ? share : 0);

      updates.push(
        prisma.sale.update({
          where: { id: s.id },
          data: {
            profit: newProfit,
            ...(Number.isFinite(costSnapshot)
              ? {}
              : Number.isFinite(computedInventoryCost)
              ? { costPriceSnapshot: computedInventoryCost }
              : {}),
          },
        })
      );
    }

    await prisma.$transaction(updates);
    updated += updates.length;

    if (updated % 500 === 0) {
      // eslint-disable-next-line no-console
      console.log(`Updated ${updated} sale rows...`);
    }
  }

  // eslint-disable-next-line no-console
  console.log(`Done. Updated=${updated}, Skipped=${skipped}`);
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
