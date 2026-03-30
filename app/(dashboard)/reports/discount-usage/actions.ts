"use server";

import { ensureBillfreePhase1Schema, prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

function buildEmptyReport(startDate: Date, endDate: Date) {
  return {
    summary: {
      totalDiscountAmount: 0,
      totalInvoicesWithDiscount: 0,
    },
    details: [],
    startDate,
    endDate,
  };
}

function isMissingCouponTableError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2010" && /no such table:\s*(Coupon|CouponRedemption)/i.test(error.message);
  }
  if (error instanceof Error) {
    return /no such table:\s*(Coupon|CouponRedemption)/i.test(error.message);
  }
  return false;
}

export async function getDiscountUsageReport(startDate: Date, endDate: Date) {
  await ensureBillfreePhase1Schema().catch(() => {});

  type ReportRow = {
    id: string;
    couponId: string;
    couponCode: string;
    couponType: string;
    couponValue: number;
    couponMaxDiscount: number | null;
    invoiceId: string;
    invoiceNumber: string;
    invoiceDate: Date;
    invoiceTotalAmount: number;
    invoiceSubtotal: number;
    invoiceTaxTotal: number;
    customerId: string | null;
    customerName: string | null;
    discountAmount: number;
    redeemedAt: Date;
    totalProfitOnInvoice: number | null;
  };

  let reportData: ReportRow[] = [];

  const couponTableInfo = await prisma
    .$queryRawUnsafe<Array<{ name: string }>>(`PRAGMA table_info("Coupon")`)
    .catch(() => null);
  const redemptionTableInfo = await prisma
    .$queryRawUnsafe<Array<{ name: string }>>(`PRAGMA table_info("CouponRedemption")`)
    .catch(() => null);

  if (!couponTableInfo || !redemptionTableInfo) {
    return buildEmptyReport(startDate, endDate);
  }

  const hasCouponType = couponTableInfo.some((col) => col.name === "type");
  const hasCouponValue = couponTableInfo.some((col) => col.name === "value");
  const hasCouponMaxDiscount = couponTableInfo.some((col) => col.name === "maxDiscount");

  const hasRedemptionDiscount = redemptionTableInfo.some((col) => col.name === "discountAmount");
  const hasRedemptionCustomer = redemptionTableInfo.some((col) => col.name === "customerId");
  const hasRedemptionRedeemedAt = redemptionTableInfo.some((col) => col.name === "redeemedAt");

  const redeemedAtExpression = hasRedemptionRedeemedAt ? "cr.redeemedAt" : "i.invoiceDate";

  const selectFragments = [
    "cr.id AS id",
    "cr.couponId AS couponId",
    "c.code AS couponCode",
    hasCouponType ? "c.type AS couponType" : "'UNKNOWN' AS couponType",
    hasCouponValue ? "c.value AS couponValue" : "0 AS couponValue",
    hasCouponMaxDiscount ? "c.maxDiscount AS couponMaxDiscount" : "NULL AS couponMaxDiscount",
    "cr.invoiceId AS invoiceId",
    "i.invoiceNumber AS invoiceNumber",
    "i.invoiceDate AS invoiceDate",
    "i.totalAmount AS invoiceTotalAmount",
    "i.subtotal AS invoiceSubtotal",
    "i.taxTotal AS invoiceTaxTotal",
    hasRedemptionCustomer ? "cr.customerId AS customerId" : "NULL AS customerId",
    "cust.name AS customerName",
    hasRedemptionDiscount ? "cr.discountAmount AS discountAmount" : "0 AS discountAmount",
    `${redeemedAtExpression} AS redeemedAt`,
    "(SELECT SUM(s.profit) FROM \"Sale\" s WHERE s.invoiceId = i.id) AS totalProfitOnInvoice",
  ];

  const discountUsageQuery = `
    SELECT
      ${selectFragments.join(",\n      ")}
    FROM "CouponRedemption" cr
    JOIN "Coupon" c ON cr.couponId = c.id
    JOIN "Invoice" i ON cr.invoiceId = i.id
    LEFT JOIN "Customer" cust ON cr.customerId = cust.id
    WHERE ${redeemedAtExpression} >= ? AND ${redeemedAtExpression} <= ?
    ORDER BY ${redeemedAtExpression} DESC
  `;

  try {
    reportData = await prisma.$queryRawUnsafe<ReportRow[]>(discountUsageQuery, startDate, endDate);
  } catch (error) {
    if (isMissingCouponTableError(error)) {
      return buildEmptyReport(startDate, endDate);
    }
    throw error;
  }

  const processedReportData = reportData.map(entry => {
    const discountAmount = Number(entry.discountAmount ?? 0);
    const invoiceTotalAmount = Number(entry.invoiceTotalAmount ?? 0);
    const invoiceSubtotal = Number(entry.invoiceSubtotal ?? 0);
    const invoiceTaxTotal = Number(entry.invoiceTaxTotal ?? 0);
    const totalProfitOnInvoice = entry.totalProfitOnInvoice !== null ? Number(entry.totalProfitOnInvoice) : null;

    let profitAfterDiscount = totalProfitOnInvoice;
    if (profitAfterDiscount !== null) {
      profitAfterDiscount -= discountAmount;
    }

    return {
      ...entry,
      discountAmount: Number(discountAmount.toFixed(2)),
      invoiceTotalAmount: Number(invoiceTotalAmount.toFixed(2)),
      invoiceSubtotal: Number(invoiceSubtotal.toFixed(2)),
      invoiceTaxTotal: Number(invoiceTaxTotal.toFixed(2)),
      totalProfitOnInvoice: totalProfitOnInvoice !== null ? Number(totalProfitOnInvoice.toFixed(2)) : null,
      profitAfterDiscount: profitAfterDiscount !== null ? Number(profitAfterDiscount.toFixed(2)) : null,
    };
  });

  // Aggregate summary
  const totalDiscountAmount = processedReportData.reduce((sum, entry) => sum + Number(entry.discountAmount ?? 0), 0);
  const totalInvoicesWithDiscount = new Set(processedReportData.map(entry => entry.invoiceId)).size;

  const summary = {
    totalDiscountAmount: parseFloat(totalDiscountAmount.toFixed(2)),
    totalInvoicesWithDiscount,
  };

  return {
    summary,
    details: processedReportData,
    startDate,
    endDate,
  };
}
