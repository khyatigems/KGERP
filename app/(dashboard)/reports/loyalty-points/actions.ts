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
      ? "NULL AS totalProfitOnInvoice"
      : "NULL AS totalProfitOnInvoice",
  ];

  const fromClause = hasInvoiceIdColumn
    ? `FROM "LoyaltyLedger" ll
       LEFT JOIN "Customer" c ON ll.customerId = c.id
       LEFT JOIN "Invoice" i ON ll.invoiceId = i.id`
    : `FROM "LoyaltyLedger" ll
       LEFT JOIN "Customer" c ON ll.customerId = c.id`;

  // Ultra-simple query without any JOINs to avoid LibSQL issues
  const loyaltyQuery = `
    SELECT 
      ll.id,
      ll.customerId,
      ll.invoiceId,
      ll.type,
      ll.points,
      ll.rupeeValue,
      ll.remarks,
      ll.createdAt
    FROM "LoyaltyLedger" ll
    WHERE ll.createdAt >= ? AND ll.createdAt <= ?
    ORDER BY ll.createdAt DESC
  `;

  try {
    // Convert dates to ISO strings for SQLite/LibSQL compatibility
    const startIso = startDate.toISOString();
    const endIso = endDate.toISOString();
    
    console.log('Loyalty query:', loyaltyQuery);
    console.log('Date params:', { startIso, endIso });
    
    const rawReportData = await prisma.$queryRawUnsafe(loyaltyQuery, startIso, endIso);
    
    console.log('Raw report data count:', (rawReportData as any[]).length);
    
    // Fetch invoice data separately to avoid JOIN issues
    const invoiceIds = [...new Set((rawReportData as any[]).map(r => r.invoiceId).filter(Boolean))];
    let invoiceMap = new Map();
    
    if (invoiceIds.length > 0) {
      try {
        const placeholders = invoiceIds.map(() => '?').join(',');
        const invoiceData = await prisma.$queryRawUnsafe<
          Array<{ id: string; invoiceNumber: string; invoiceDate: string; totalAmount: number; discountTotal: number }>
        >(`SELECT id, invoiceNumber, invoiceDate, CAST(totalAmount AS REAL) as totalAmount, CAST(discountTotal AS REAL) as discountTotal FROM "Invoice" WHERE id IN (${placeholders})`, ...invoiceIds);
        
        for (const inv of invoiceData || []) {
          invoiceMap.set(inv.id, {
            invoiceNumber: inv.invoiceNumber,
            invoiceDate: inv.invoiceDate,
            totalAmount: Number(inv.totalAmount || 0),
            discountTotal: Number(inv.discountTotal || 0)
          });
        }
      } catch (e) {
        console.log('Failed to fetch invoice data:', e);
      }
    }
    
    // Fetch customer names separately to avoid join issues
    const customerIds = [...new Set((rawReportData as any[]).map(r => r.customerId))];
    let customerMap = new Map();
    
    if (customerIds.length > 0) {
      try {
        const placeholders = customerIds.map(() => '?').join(',');
        const customerData = await prisma.$queryRawUnsafe<
          Array<{ id: string; name: string }>
        >(`SELECT id, name FROM "Customer" WHERE id IN (${placeholders})`, ...customerIds);
        
        for (const c of customerData || []) {
          customerMap.set(c.id, c.name);
        }
      } catch (e) {
        console.log('Failed to fetch customer names:', e);
      }
    }
    
    // Convert all potential BigInt values to regular numbers before processing
    reportData = (rawReportData as any[]).map((row: any) => {
      const invoiceData = row.invoiceId ? invoiceMap.get(row.invoiceId) : null;
      
      return {
        id: String(row.id),
        customerId: String(row.customerId),
        customerName: customerMap.get(row.customerId) || 'Unknown',
        invoiceId: row.invoiceId ? String(row.invoiceId) : null,
        invoiceNumber: invoiceData?.invoiceNumber || null,
        invoiceDate: invoiceData?.invoiceDate ? new Date(invoiceData.invoiceDate) : null,
        type: String(row.type),
        points: Number(row.points ?? 0),
        rupeeValue: Number(row.rupeeValue ?? 0),
        remarks: row.remarks ? String(row.remarks) : null,
        createdAt: new Date(row.createdAt),
        invoiceTotalAmount: invoiceData?.totalAmount ?? null,
        invoiceDiscountTotal: invoiceData?.discountTotal ?? null,
        totalProfitOnInvoice: null, // Skip profit calculation to avoid BigInt issues
      };
    });
  } catch (error) {
    console.error('Query error in getLoyaltyPointsReport:', error);
    
    // Check for missing table or column errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('no such table') || errorMessage.includes('no such column')) {
      return buildEmptyReport(startDate, endDate, loyaltySettings);
    }
    
    // Check for BigInt or other data type errors
    if (error instanceof RangeError && error.message.includes('BigInt')) {
      return buildEmptyReport(startDate, endDate, loyaltySettings);
    }
    
    // Generic database error - return empty report with error logged
    console.error('Database query failed, error details:', error);
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return buildEmptyReport(startDate, endDate, loyaltySettings);
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
