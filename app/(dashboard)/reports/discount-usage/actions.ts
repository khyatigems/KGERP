"use server";

import { prisma } from "@/lib/prisma";
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

  try {
    reportData = await prisma.$queryRaw<ReportRow[]>(Prisma.sql`
      SELECT
        cr.id,
        cr.couponId,
        c.code AS couponCode,
        c.type AS couponType,
        c.value AS couponValue,
        c.maxDiscount AS couponMaxDiscount,
        cr.invoiceId,
        i.invoiceNumber,
        i.invoiceDate,
        i.totalAmount AS invoiceTotalAmount,
        i.subtotal AS invoiceSubtotal,
        i.taxTotal AS invoiceTaxTotal,
        cr.customerId,
        cust.name AS customerName,
        cr.discountAmount,
        cr.redeemedAt,
        (SELECT SUM(s.profit) FROM "Sale" s WHERE s.invoiceId = i.id) AS totalProfitOnInvoice
      FROM "CouponRedemption" cr
      JOIN "Coupon" c ON cr.couponId = c.id
      JOIN "Invoice" i ON cr.invoiceId = i.id
      LEFT JOIN "Customer" cust ON cr.customerId = cust.id
      WHERE cr.redeemedAt >= ${startDate} AND cr.redeemedAt <= ${endDate}
      ORDER BY cr.redeemedAt DESC
    `);
  } catch (error) {
    if (isMissingCouponTableError(error)) {
      return buildEmptyReport(startDate, endDate);
    }
    throw error;
  }

  const processedReportData = reportData.map(entry => {
    let profitAfterDiscount = entry.totalProfitOnInvoice;

    if (profitAfterDiscount !== null) {
      profitAfterDiscount -= entry.discountAmount; // Subtract coupon-specific discount
    }

    return {
      ...entry,
      discountAmount: parseFloat(entry.discountAmount.toFixed(2)),
      invoiceTotalAmount: parseFloat(entry.invoiceTotalAmount.toFixed(2)),
      invoiceSubtotal: parseFloat(entry.invoiceSubtotal.toFixed(2)),
      invoiceTaxTotal: parseFloat(entry.invoiceTaxTotal.toFixed(2)),
      totalProfitOnInvoice: entry.totalProfitOnInvoice !== null ? parseFloat(entry.totalProfitOnInvoice.toFixed(2)) : null,
      profitAfterDiscount: profitAfterDiscount !== null ? parseFloat(profitAfterDiscount.toFixed(2)) : null,
    };
  });

  // Aggregate summary
  const totalDiscountAmount = processedReportData.reduce((sum, entry) => sum + entry.discountAmount, 0);
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
