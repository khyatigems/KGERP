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
  try {
    // Fetch loyalty settings via raw SQL (table exists but not modeled in Prisma schema)
    const loyaltyRows = await prisma.$queryRawUnsafe<Array<{
      id: string;
      redeemRupeePerPoint: number | null;
      minRedeemPoints: number | null;
      maxRedeemPercent: number | null;
      dobProfilePoints?: number | null;
      anniversaryProfilePoints?: number | null;
    }>>(`SELECT * FROM "LoyaltySettings" WHERE id = 'default' LIMIT 1`).catch(() => []);
    
    // Convert loyalty settings to ensure no BigInt values
    const loyaltySettings = loyaltyRows?.[0] ? {
      id: String(loyaltyRows[0].id),
      redeemRupeePerPoint: loyaltyRows[0].redeemRupeePerPoint !== null ? Number(loyaltyRows[0].redeemRupeePerPoint) : null,
      minRedeemPoints: loyaltyRows[0].minRedeemPoints !== null ? Number(loyaltyRows[0].minRedeemPoints) : null,
      maxRedeemPercent: loyaltyRows[0].maxRedeemPercent !== null ? Number(loyaltyRows[0].maxRedeemPercent) : null,
      dobProfilePoints: loyaltyRows[0].dobProfilePoints !== null ? Number(loyaltyRows[0].dobProfilePoints) : undefined,
      anniversaryProfilePoints: loyaltyRows[0].anniversaryProfilePoints !== null ? Number(loyaltyRows[0].anniversaryProfilePoints) : undefined,
    } : null;

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
    "CAST(ll.points AS REAL) AS points",
    hasRupeeValueColumn ? "CAST(ll.rupeeValue AS REAL) AS rupeeValue" : "0 AS rupeeValue",
    hasRemarksColumn ? "ll.remarks AS remarks" : "NULL AS remarks",
    "ll.createdAt AS createdAt",
    hasInvoiceIdColumn ? "CAST(i.totalAmount AS REAL) AS invoiceTotalAmount" : "NULL AS invoiceTotalAmount",
    hasInvoiceIdColumn ? "CAST(i.discountTotal AS REAL) AS invoiceDiscountTotal" : "NULL AS invoiceDiscountTotal",
    hasInvoiceIdColumn
      ? "CAST((SELECT COALESCE(SUM(s.profit), 0) FROM \"Sale\" s WHERE s.invoiceId = i.id) AS REAL) AS totalProfitOnInvoice"
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
    const rawReportData = await prisma.$queryRawUnsafe(loyaltyQuery, startDate, endDate);
    
    // Convert all potential BigInt values to regular numbers before processing
    reportData = (rawReportData as any[]).map((row: any) => ({
      id: String(row.id),
      customerId: String(row.customerId),
      customerName: String(row.customerName),
      invoiceId: row.invoiceId ? String(row.invoiceId) : null,
      invoiceNumber: row.invoiceNumber ? String(row.invoiceNumber) : null,
      invoiceDate: row.invoiceDate ? new Date(row.invoiceDate) : null,
      type: String(row.type),
      points: Number(row.points ?? 0),
      rupeeValue: Number(row.rupeeValue ?? 0),
      remarks: row.remarks ? String(row.remarks) : null,
      createdAt: new Date(row.createdAt),
      invoiceTotalAmount: row.invoiceTotalAmount !== null ? Number(row.invoiceTotalAmount) : null,
      invoiceDiscountTotal: row.invoiceDiscountTotal !== null ? Number(row.invoiceDiscountTotal) : null,
      totalProfitOnInvoice: row.totalProfitOnInvoice !== null ? Number(row.totalProfitOnInvoice) : null,
    }));
  } catch (error) {
    console.error('Query error:', error);
    if (isMissingTableError(error)) {
      return buildEmptyReport(startDate, endDate, loyaltySettings);
    }
    
    // If it's a BigInt error, try a simpler query without profit calculation
    if (error instanceof RangeError && error.message.includes('BigInt')) {
      console.log('BigInt error detected, using simplified query');
      const simplifiedQuery = `
        SELECT
          ${selectParts.slice(0, -1).join(",\n      ")}
        ${fromClause}
        WHERE ll.createdAt >= ? AND ll.createdAt <= ?
        ORDER BY ll.createdAt DESC
      `;
      
      const simplifiedData = await prisma.$queryRawUnsafe(simplifiedQuery, startDate, endDate);
      
      reportData = (simplifiedData as any[]).map((row: any) => ({
        id: String(row.id),
        customerId: String(row.customerId),
        customerName: String(row.customerName),
        invoiceId: row.invoiceId ? String(row.invoiceId) : null,
        invoiceNumber: row.invoiceNumber ? String(row.invoiceNumber) : null,
        invoiceDate: row.invoiceDate ? new Date(row.invoiceDate) : null,
        type: String(row.type),
        points: Number(row.points ?? 0),
        rupeeValue: Number(row.rupeeValue ?? 0),
        remarks: row.remarks ? String(row.remarks) : null,
        createdAt: new Date(row.createdAt),
        invoiceTotalAmount: row.invoiceTotalAmount !== null ? Number(row.invoiceTotalAmount) : null,
        invoiceDiscountTotal: row.invoiceDiscountTotal !== null ? Number(row.invoiceDiscountTotal) : null,
        totalProfitOnInvoice: null, // Skip profit calculation to avoid BigInt error
      }));
    } else {
      throw error;
    }
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

  // Ensure all numeric values are plain numbers (not BigInt) for serialization
  const serializableReportData = processedReportData.map(entry => ({
    ...entry,
    // Convert any potential BigInt to Number
    id: String(entry.id),
    customerId: String(entry.customerId),
    customerName: String(entry.customerName),
    invoiceId: entry.invoiceId ? String(entry.invoiceId) : null,
    invoiceNumber: entry.invoiceNumber ? String(entry.invoiceNumber) : null,
    invoiceDate: entry.invoiceDate ? new Date(entry.invoiceDate) : null,
    type: String(entry.type),
    points: Number(entry.points),
    rupeeValue: Number(entry.rupeeValue),
    remarks: entry.remarks ? String(entry.remarks) : null,
    createdAt: new Date(entry.createdAt),
    invoiceTotalAmount: entry.invoiceTotalAmount !== null ? Number(entry.invoiceTotalAmount) : null,
    invoiceDiscountTotal: entry.invoiceDiscountTotal !== null ? Number(entry.invoiceDiscountTotal) : null,
    totalProfitOnInvoice: entry.totalProfitOnInvoice !== null ? Number(entry.totalProfitOnInvoice) : null,
    profitMinusLoyaltyAndDiscount: entry.profitMinusLoyaltyAndDiscount !== null ? Number(entry.profitMinusLoyaltyAndDiscount) : null,
  }));


  // Aggregate summary using serializable data
  const totalEarnedPoints = serializableReportData
    .filter(entry => entry.type === 'EARN')
    .reduce((sum, entry) => sum + Number(entry.points ?? 0), 0);

  const totalRedeemedPoints = serializableReportData
    .filter(entry => entry.type === 'REDEEM')
    .reduce((sum, entry) => sum + Math.abs(Number(entry.points ?? 0)), 0);

  const totalRedeemedValue = serializableReportData
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
    details: serializableReportData,
    loyaltySettings,
    startDate,
    endDate,
  };
  } catch (error) {
    console.error('Error in getLoyaltyPointsReport:', error);
    
    // Return empty report on any error to prevent build failures
    return buildEmptyReport(startDate, endDate, null);
  }
}
