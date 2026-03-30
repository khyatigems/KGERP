"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

function buildEmptyReport(startDate: Date, endDate: Date, loyaltySettings: unknown) {
  const emptySummary = {
    totalEarnedPoints: 0,
    totalRedeemedPoints: 0,
    totalRedeemedValue: 0,
    netPoints: 0,
  };

  return {
    summary: emptySummary,
    details: [],
    loyaltySettings,
    startDate,
    endDate,
  };
}

function isMissingTableError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2010" && /no such table/i.test(error.message);
  }
  if (error instanceof Error) {
    return /no such table/i.test(error.message);
  }
  return false;
}

export async function getLoyaltyPointsReport(startDate: Date, endDate: Date) {
  // Fetch loyalty settings via raw SQL (table exists but not modeled in Prisma schema)
  const loyaltyRows = await prisma.$queryRawUnsafe<Array<{
    id: string;
    redeemRupeePerPoint: number | null;
    minRedeemPoints: number | null;
    maxRedeemPercent: number | null;
    dobProfilePoints?: number | null;
    anniversaryProfilePoints?: number | null;
  }>>(`SELECT * FROM "LoyaltySettings" WHERE id = 'default' LIMIT 1`).catch(() => []);
  const loyaltySettings = loyaltyRows?.[0] || null;

  // This query will fetch loyalty ledger entries along with related invoice and customer details.
  // We need to join LoyaltyLedger with Invoice and Sale to get the required details.
  let reportData: Array<{
    id: string;
    customerId: string;
    customerName: string;
    invoiceId: string | null;
    invoiceNumber: string | null;
    invoiceDate: Date | null;
    type: string;
    points: number;
    rupeeValue: number;
    remarks: string | null;
    createdAt: Date;
    invoiceTotalAmount: number | null;
    invoiceDiscountTotal: number | null;
    totalProfitOnInvoice: number | null;
  }> = [];

  try {
    reportData = await prisma.$queryRaw<
      Array<{
        id: string;
        customerId: string;
        customerName: string;
        invoiceId: string | null;
        invoiceNumber: string | null;
        invoiceDate: Date | null;
        type: string;
        points: number;
        rupeeValue: number;
        remarks: string | null;
        createdAt: Date;
        invoiceTotalAmount: number | null;
        invoiceDiscountTotal: number | null;
        totalProfitOnInvoice: number | null;
      }>
    >(Prisma.sql`
      SELECT
        ll.id,
        ll.customerId,
        c.name AS customerName,
        ll.invoiceId,
        i.invoiceNumber,
        i.invoiceDate,
        ll.type,
        ll.points,
        ll.rupeeValue,
        ll.remarks,
        ll.createdAt,
        i.totalAmount AS invoiceTotalAmount,
        i.discountTotal AS invoiceDiscountTotal,
        (SELECT SUM(s.profit) FROM "Sale" s WHERE s.invoiceId = i.id) AS totalProfitOnInvoice
      FROM "LoyaltyLedger" ll
      LEFT JOIN "Customer" c ON ll.customerId = c.id
      LEFT JOIN "Invoice" i ON ll.invoiceId = i.id
      WHERE ll.createdAt >= ${startDate} AND ll.createdAt <= ${endDate}
      ORDER BY ll.createdAt DESC
    `);
  } catch (error) {
    if (isMissingTableError(error)) {
      return buildEmptyReport(startDate, endDate, loyaltySettings);
    }
    throw error;
  }

  // Calculate "Profit on the Invoice minus Loyalty Points and Discount" for each entry
  const processedReportData = reportData.map(entry => {
    let profitMinusLoyaltyAndDiscount = entry.totalProfitOnInvoice;

    if (entry.type === 'REDEEM' && entry.rupeeValue !== null && profitMinusLoyaltyAndDiscount !== null) {
      // Subtract the monetary value of redeemed points from profit
      profitMinusLoyaltyAndDiscount -= Math.abs(entry.rupeeValue);
    }

    if (entry.invoiceDiscountTotal !== null && profitMinusLoyaltyAndDiscount !== null) {
      // Subtract invoice discount from profit
      profitMinusLoyaltyAndDiscount -= entry.invoiceDiscountTotal;
    }

    return {
      ...entry,
      profitMinusLoyaltyAndDiscount: profitMinusLoyaltyAndDiscount !== null ? parseFloat(profitMinusLoyaltyAndDiscount.toFixed(2)) : null,
      points: parseFloat(entry.points.toFixed(2)),
      rupeeValue: parseFloat(entry.rupeeValue.toFixed(2)),
      invoiceTotalAmount: entry.invoiceTotalAmount !== null ? parseFloat(entry.invoiceTotalAmount.toFixed(2)) : null,
      invoiceDiscountTotal: entry.invoiceDiscountTotal !== null ? parseFloat(entry.invoiceDiscountTotal.toFixed(2)) : null,
      totalProfitOnInvoice: entry.totalProfitOnInvoice !== null ? parseFloat(entry.totalProfitOnInvoice.toFixed(2)) : null,
    };
  });


  // Aggregate summary
  const totalEarnedPoints = processedReportData
    .filter(entry => entry.type === 'EARN')
    .reduce((sum, entry) => sum + entry.points, 0);

  const totalRedeemedPoints = processedReportData
    .filter(entry => entry.type === 'REDEEM')
    .reduce((sum, entry) => sum + Math.abs(entry.points), 0);

  const totalRedeemedValue = processedReportData
    .filter(entry => entry.type === 'REDEEM')
    .reduce((sum, entry) => sum + Math.abs(entry.rupeeValue), 0);

  const summary = {
    totalEarnedPoints: parseFloat(totalEarnedPoints.toFixed(2)),
    totalRedeemedPoints: parseFloat(totalRedeemedPoints.toFixed(2)),
    totalRedeemedValue: parseFloat(totalRedeemedValue.toFixed(2)),
    netPoints: parseFloat((totalEarnedPoints - totalRedeemedPoints).toFixed(2)),
  };

  return {
    summary,
    details: processedReportData,
    loyaltySettings,
    startDate,
    endDate,
  };
}
