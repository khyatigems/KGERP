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

type LoyaltyReportRow = {
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
};

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
  let reportData: LoyaltyReportRow[] = [];

  const ledgerColumns = await prisma
    .$queryRawUnsafe<Array<{ name: string }>>(`PRAGMA table_info("LoyaltyLedger")`)
    .catch(() => null);

  if (!ledgerColumns || ledgerColumns.length === 0) {
    return buildEmptyReport(startDate, endDate, loyaltySettings);
  }

  const hasInvoiceIdColumn = ledgerColumns.some((col) => col.name === "invoiceId");
  const hasRupeeValueColumn = ledgerColumns.some((col) => col.name === "rupeeValue");
  const hasRemarksColumn = ledgerColumns.some((col) => col.name === "remarks");

  const selectParts = [
    "ll.id AS id",
    "ll.customerId AS customerId",
    "c.name AS customerName",
    hasInvoiceIdColumn ? "ll.invoiceId AS invoiceId" : "NULL AS invoiceId",
    hasInvoiceIdColumn ? "i.invoiceNumber AS invoiceNumber" : "NULL AS invoiceNumber",
    hasInvoiceIdColumn ? "i.invoiceDate AS invoiceDate" : "NULL AS invoiceDate",
    "ll.type AS type",
    "ll.points AS points",
    hasRupeeValueColumn ? "ll.rupeeValue AS rupeeValue" : "0 AS rupeeValue",
    hasRemarksColumn ? "ll.remarks AS remarks" : "NULL AS remarks",
    "ll.createdAt AS createdAt",
    hasInvoiceIdColumn ? "i.totalAmount AS invoiceTotalAmount" : "NULL AS invoiceTotalAmount",
    hasInvoiceIdColumn ? "i.discountTotal AS invoiceDiscountTotal" : "NULL AS invoiceDiscountTotal",
    hasInvoiceIdColumn
      ? "(SELECT SUM(s.profit) FROM \"Sale\" s WHERE s.invoiceId = i.id) AS totalProfitOnInvoice"
      : "NULL AS totalProfitOnInvoice",
  ];

  const fromClause = hasInvoiceIdColumn
    ? `FROM "LoyaltyLedger" ll
       LEFT JOIN "Customer" c ON ll.customerId = c.id
       LEFT JOIN "Invoice" i ON ll.invoiceId = i.id`
    : `FROM "LoyaltyLedger" ll
       LEFT JOIN "Customer" c ON ll.customerId = c.id`;

  const loyaltyQuery = `
    SELECT
      ${selectParts.join(",\n      ")}
    ${fromClause}
    WHERE ll.createdAt >= ? AND ll.createdAt <= ?
    ORDER BY ll.createdAt DESC
  `;

  try {
    reportData = await prisma.$queryRawUnsafe<LoyaltyReportRow[]>(loyaltyQuery, startDate, endDate);
  } catch (error) {
    if (isMissingTableError(error)) {
      return buildEmptyReport(startDate, endDate, loyaltySettings);
    }
    throw error;
  }

  // Calculate "Profit on the Invoice minus Loyalty Points and Discount" for each entry
  const processedReportData = reportData.map(entry => {
    const points = Number(entry.points ?? 0);
    const rupeeValue = Number(entry.rupeeValue ?? 0);
    const invoiceTotalAmount = entry.invoiceTotalAmount !== null ? Number(entry.invoiceTotalAmount) : null;
    const invoiceDiscountTotal = entry.invoiceDiscountTotal !== null ? Number(entry.invoiceDiscountTotal) : null;
    const totalProfitOnInvoice = entry.totalProfitOnInvoice !== null ? Number(entry.totalProfitOnInvoice) : null;

    let profitMinusLoyaltyAndDiscount = totalProfitOnInvoice;

    if (entry.type === 'REDEEM' && profitMinusLoyaltyAndDiscount !== null) {
      profitMinusLoyaltyAndDiscount -= Math.abs(rupeeValue);
    }

    if (invoiceDiscountTotal !== null && profitMinusLoyaltyAndDiscount !== null) {
      profitMinusLoyaltyAndDiscount -= invoiceDiscountTotal;
    }

    return {
      ...entry,
      points: Number(points.toFixed(2)),
      rupeeValue: Number(rupeeValue.toFixed(2)),
      invoiceTotalAmount: invoiceTotalAmount !== null ? Number(invoiceTotalAmount.toFixed(2)) : null,
      invoiceDiscountTotal: invoiceDiscountTotal !== null ? Number(invoiceDiscountTotal.toFixed(2)) : null,
      totalProfitOnInvoice: totalProfitOnInvoice !== null ? Number(totalProfitOnInvoice.toFixed(2)) : null,
      profitMinusLoyaltyAndDiscount: profitMinusLoyaltyAndDiscount !== null ? Number(profitMinusLoyaltyAndDiscount.toFixed(2)) : null,
    };
  });


  // Aggregate summary
  const totalEarnedPoints = processedReportData
    .filter(entry => entry.type === 'EARN')
    .reduce((sum, entry) => sum + Number(entry.points ?? 0), 0);

  const totalRedeemedPoints = processedReportData
    .filter(entry => entry.type === 'REDEEM')
    .reduce((sum, entry) => sum + Math.abs(Number(entry.points ?? 0)), 0);

  const totalRedeemedValue = processedReportData
    .filter(entry => entry.type === 'REDEEM')
    .reduce((sum, entry) => sum + Math.abs(Number(entry.rupeeValue ?? 0)), 0);

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
