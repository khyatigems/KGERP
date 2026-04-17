import { prisma } from "./prisma";

export interface SalesReportData {
  totalSales: number;
  totalInrSales: number;
  totalUsdSales: number;
  conversionRate: number;
  salesByCategory: Array<{
    category: string;
    inrSales: number;
    usdSales: number;
    totalSales: number;
    itemCount: number;
  }>;
  salesByPaymentMethod: Array<{
    method: string;
    amount: number;
    currency: string;
    count: number;
  }>;
}

export async function getSalesReportData(
  startDate?: Date,
  endDate?: Date
): Promise<SalesReportData> {
  const where: any = {};
  if (startDate || endDate) {
    where.saleDate = {};
    if (startDate) where.saleDate.gte = startDate;
    if (endDate) where.saleDate.lte = endDate;
  }

  // Get all sales with invoice data for conversion rates
  const sales = await prisma.sale.findMany({
    where,
    select: {
      id: true,
      salePrice: true,
      // TODO: Re-enable usdPrice once database schema is properly migrated
      // usdPrice: true,
      paymentMethod: true,
      inventory: {
        select: {
          category: true,
        },
      },
      invoice: {
        select: {
          invoiceType: true,
          conversionRate: true,
          invoiceCurrency: true,
        },
      },
    },
  });

  let totalInrSales = 0;
  let totalUsdSales = 0;
  let totalSales = 0;
  const salesByCategory = new Map<string, { inrSales: number; usdSales: number; itemCount: number }>();
  const salesByPaymentMethod = new Map<string, { amount: number; currency: string; count: number }>();

  for (const sale of sales) {
    const category = sale.inventory?.category || "Uncategorized";
    const isExportInvoice = sale.invoice?.invoiceType === "EXPORT_INVOICE";
    const conversionRate = sale.invoice?.conversionRate || 1;
    const invoiceCurrency = sale.invoice?.invoiceCurrency || "INR";

    let inrAmount = 0;
    let usdAmount = 0;

    // TODO: Re-enable USD pricing once database schema is properly migrated
    // For now, handle all sales as INR since usdPrice field is not available
    inrAmount = sale.salePrice;
    if (isExportInvoice && invoiceCurrency !== "INR") {
      usdAmount = sale.salePrice / conversionRate;
    }

    totalInrSales += inrAmount;
    totalUsdSales += usdAmount;
    totalSales += inrAmount;

    // Update category stats
    if (!salesByCategory.has(category)) {
      salesByCategory.set(category, { inrSales: 0, usdSales: 0, itemCount: 0 });
    }
    const categoryStats = salesByCategory.get(category)!;
    categoryStats.inrSales += inrAmount;
    categoryStats.usdSales += usdAmount;
    categoryStats.itemCount += 1;

    // Update payment method stats
    if (sale.paymentMethod) {
      const key = `${sale.paymentMethod}_${invoiceCurrency}`;
      if (!salesByPaymentMethod.has(key)) {
        salesByPaymentMethod.set(key, { amount: 0, currency: invoiceCurrency, count: 0 });
      }
      const paymentStats = salesByPaymentMethod.get(key)!;
      paymentStats.amount += isExportInvoice && invoiceCurrency !== "INR" ? usdAmount : inrAmount;
      paymentStats.count += 1;
    }
  }

  return {
    totalSales,
    totalInrSales,
    totalUsdSales,
    conversionRate: 1, // This could be calculated from a specific period if needed
    salesByCategory: Array.from(salesByCategory.entries()).map(([category, stats]) => ({
      category,
      inrSales: stats.inrSales,
      usdSales: stats.usdSales,
      totalSales: stats.inrSales,
      itemCount: stats.itemCount,
    })),
    salesByPaymentMethod: Array.from(salesByPaymentMethod.entries()).map(([key, stats]) => ({
      method: key.split('_')[0],
      amount: stats.amount,
      currency: stats.currency,
      count: stats.count,
    })),
  };
}
