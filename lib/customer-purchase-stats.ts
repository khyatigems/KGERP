import { prisma } from "@/lib/prisma";

export type CustomerPurchaseStats = {
  customerId: string;
  totalRevenue: number;
  orderCount: number;
  highestOrder: number;
  lastOrderDate: string;
};

type RawCustomerPurchaseStats = {
  customerId: string;
  totalRevenue: unknown;
  orderCount: unknown;
  highestOrder: unknown;
  lastOrderDate: string | Date | null;
};

function toNumber(value: unknown): number {
  if (typeof value === "bigint" || typeof value === "number") return Number(value);
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

export async function getCustomerPurchaseStats(customerId?: string): Promise<CustomerPurchaseStats[]> {
  const rows = await prisma.$queryRawUnsafe<RawCustomerPurchaseStats[]>(
    `WITH CustomerInvoiceLinks AS (
       SELECT s.customerId, s.invoiceId
       FROM "Sale" s
       WHERE s.customerId IS NOT NULL
         AND s.invoiceId IS NOT NULL
         AND COALESCE(s.platform, '') != 'REPLACEMENT'
       UNION
       SELECT s.customerId, s.legacyInvoiceId
       FROM "Sale" s
       WHERE s.customerId IS NOT NULL
         AND s.legacyInvoiceId IS NOT NULL
         AND COALESCE(s.platform, '') != 'REPLACEMENT'
       UNION
       SELECT q.customerId, i.id
       FROM "Invoice" i
       JOIN "Quotation" q ON q.id = i.quotationId
       WHERE q.customerId IS NOT NULL
         AND NOT EXISTS (
           SELECT 1
           FROM "Sale" s
           WHERE s.invoiceId = i.id OR s.legacyInvoiceId = i.id
         )
     ),
     CustomerInvoices AS (
       SELECT DISTINCT
         links.customerId,
         i.id AS invoiceId,
         CASE
           WHEN UPPER(i.invoiceType) IN ('EXPORT_INVOICE', 'EXPORT')
             THEN COALESCE(i.totalInrValue, i.totalAmount)
           ELSE i.totalAmount
         END AS inrAmount,
         i.invoiceDate
       FROM CustomerInvoiceLinks links
       JOIN "Invoice" i ON i.id = links.invoiceId
     )
     SELECT
       customerId,
       CAST(SUM(inrAmount) AS TEXT) AS totalRevenue,
       CAST(COUNT(*) AS TEXT) AS orderCount,
       CAST(MAX(inrAmount) AS TEXT) AS highestOrder,
       CAST(MAX(invoiceDate) AS TEXT) AS lastOrderDate
     FROM CustomerInvoices
     WHERE (? IS NULL OR customerId = ?)
     GROUP BY customerId`,
    customerId ?? null,
    customerId ?? null
  );

  return rows.map((row) => ({
    customerId: row.customerId,
    totalRevenue: toNumber(row.totalRevenue),
    orderCount: toNumber(row.orderCount),
    highestOrder: toNumber(row.highestOrder),
    lastOrderDate: row.lastOrderDate ? String(row.lastOrderDate) : "",
  }));
}
