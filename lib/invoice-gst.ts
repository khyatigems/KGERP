export type GstRatesMap = Record<string, string>;

export const getGstRateForItem = (params: {
  category: string;
  itemName: string;
  gstRates?: GstRatesMap;
  defaultRate?: number;
}) => {
  const defaultRate = params.defaultRate ?? 3;
  const rates = params.gstRates;
  if (!rates || typeof rates !== "object") return defaultRate;
  const rateStr = rates[params.category] || rates[params.itemName] || String(defaultRate);
  const parsed = Number.parseFloat(rateStr);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultRate;
};

export type InvoiceLineInput = {
  salePrice?: number | null;
  netAmount?: number | null;
  discountAmount?: number | null;
  inventory: {
    category?: string | null;
    itemName?: string | null;
  };
};

export type ProcessedInvoiceLine<T extends InvoiceLineInput> = T & {
  gstRate: number;
  grossInclusive: number;
  netInclusiveBeforeInvoiceDiscount: number;
  invoiceDiscountShare: number;
  finalInclusive: number;
  finalTotal: number;
  basePrice: number;
  calculatedGst: number;
};

export const computeInvoiceGst = <T extends InvoiceLineInput>(params: {
  items: T[];
  gstRates?: GstRatesMap;
  displayOptions: Record<string, unknown>;
}) => {
  const normalizedItems = params.items.map((item) => {
    const category = item.inventory.category || "General";
    const itemName = item.inventory.itemName || "Item";
    const gstRate = getGstRateForItem({ category, itemName, gstRates: params.gstRates, defaultRate: 3 });

    const grossInclusive = Number(item.salePrice ?? item.netAmount ?? 0) || 0;
    const itemDiscount = Number(item.discountAmount ?? 0) || 0;
    const netInclusiveBeforeInvoiceDiscount =
      Number(item.netAmount ?? Math.max(0, grossInclusive - itemDiscount)) || 0;

    return {
      item,
      gstRate,
      grossInclusive,
      netInclusiveBeforeInvoiceDiscount,
    };
  });

  const itemsTotal = normalizedItems.reduce((sum, x) => sum + x.netInclusiveBeforeInvoiceDiscount, 0);
  const invoiceDiscountType = params.displayOptions.invoiceDiscountType === "PERCENT" ? "PERCENT" : "AMOUNT";
  const invoiceDiscountValue = Number(params.displayOptions.invoiceDiscountValue || 0);
  const invoiceDiscountAmountRaw =
    invoiceDiscountType === "PERCENT" ? (itemsTotal * invoiceDiscountValue) / 100 : invoiceDiscountValue;
  const invoiceDiscountAmount = Math.max(0, Math.min(itemsTotal, Number(invoiceDiscountAmountRaw) || 0));

  const processed = normalizedItems.map(({ item, gstRate, grossInclusive, netInclusiveBeforeInvoiceDiscount }) => {
    const weight = itemsTotal > 0 ? netInclusiveBeforeInvoiceDiscount / itemsTotal : 0;
    const invoiceDiscountShare = invoiceDiscountAmount * weight;
    const finalInclusive = Math.max(0, netInclusiveBeforeInvoiceDiscount - invoiceDiscountShare);
    const basePrice = finalInclusive / (1 + gstRate / 100);
    const calculatedGst = finalInclusive - basePrice;

    return {
      ...item,
      gstRate,
      grossInclusive,
      netInclusiveBeforeInvoiceDiscount,
      invoiceDiscountShare,
      finalInclusive,
      finalTotal: finalInclusive,
      basePrice,
      calculatedGst,
    } as ProcessedInvoiceLine<T>;
  });

  const grossTotal = processed.reduce((sum, i) => sum + i.grossInclusive, 0);
  const finalTotal = processed.reduce((sum, i) => sum + i.finalInclusive, 0);
  const taxableTotal = processed.reduce((sum, i) => sum + i.basePrice, 0);
  const gstTotal = processed.reduce((sum, i) => sum + i.calculatedGst, 0);
  const itemDiscountTotal = processed.reduce((sum, i) => sum + (Number(i.discountAmount ?? 0) || 0), 0);

  return {
    processedItems: processed,
    grossTotal,
    itemsTotalBeforeInvoiceDiscount: itemsTotal,
    invoiceDiscountAmount,
    itemDiscountTotal,
    discountTotal: itemDiscountTotal + invoiceDiscountAmount,
    taxableTotal,
    gstTotal,
    finalTotal,
  };
};
