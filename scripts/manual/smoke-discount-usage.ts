import { config } from "dotenv";

config({ path: ".env.local", override: true });
config({ path: ".env" });

import { ensureBillfreePhase1Schema, prisma } from "../../lib/prisma";
import { getDiscountUsageReport } from "../../app/(dashboard)/reports/discount-usage/actions";

async function main() {
  const args = process.argv.slice(2);
  const [fromArg, toArg] = args;

  let endDate = toArg ? new Date(toArg) : new Date();
  if (Number.isNaN(endDate.getTime())) {
    throw new Error(`Invalid end date: ${toArg}`);
  }
  let startDate: Date;
  if (fromArg) {
    startDate = new Date(fromArg);
    if (Number.isNaN(startDate.getTime())) {
      throw new Error(`Invalid start date: ${fromArg}`);
    }
  } else {
    startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - 24);
  }

  await ensureBillfreePhase1Schema();
  const report = await getDiscountUsageReport(startDate, endDate);

  const hasDiscountAmount = await hasColumn("CouponRedemption", "discountAmount");
  const hasRedeemedAt = await hasColumn("CouponRedemption", "redeemedAt");

  const redeemedAtExpr = hasRedeemedAt ? 'cr."redeemedAt"' : 'i."invoiceDate"';
  const discountExpr = hasDiscountAmount ? 'cr."discountAmount"' : "0";

  const dbStats = await prisma.$queryRawUnsafe<
    Array<{
      totalDiscountAmount: number | null;
      invoicesWithDiscount: number | null;
      minRedeemedAt: string | null;
      maxRedeemedAt: string | null;
    }>
  >(
    `
      SELECT
        SUM(COALESCE(${discountExpr}, 0)) AS totalDiscountAmount,
        COUNT(DISTINCT cr."invoiceId") AS invoicesWithDiscount,
        MIN(${redeemedAtExpr}) AS minRedeemedAt,
        MAX(${redeemedAtExpr}) AS maxRedeemedAt
      FROM "CouponRedemption" cr
      JOIN "Invoice" i ON cr."invoiceId" = i."id"
      WHERE ${redeemedAtExpr} >= ?
        AND ${redeemedAtExpr} <= ?
    `,
    startDate,
    endDate
  );

  const stats = dbStats[0] ?? {
    totalDiscountAmount: 0,
    invoicesWithDiscount: 0,
    minRedeemedAt: null,
    maxRedeemedAt: null,
  };

  console.log("=== Discount Usage Report Smoke Test ===");
  console.log("Date window:", startDate.toISOString(), "->", endDate.toISOString());
  console.log("Report summary:", report.summary);
  console.log("DB aggregate:", {
    totalDiscountAmount: Number(stats.totalDiscountAmount ?? 0).toFixed(2),
    invoicesWithDiscount: stats.invoicesWithDiscount ?? 0,
    minRedeemedAt: stats.minRedeemedAt,
    maxRedeemedAt: stats.maxRedeemedAt,
  });

  const sample = report.details.slice(0, 5).map((row) => ({
    couponCode: row.couponCode,
    invoiceId: row.invoiceId,
    discountAmount: row.discountAmount,
    redeemedAt: row.redeemedAt,
    invoiceDate: row.invoiceDate,
  }));
  console.log("Sample rows:", sample);

  const summaryMatches =
    Number(stats.totalDiscountAmount ?? 0).toFixed(2) ===
      report.summary.totalDiscountAmount.toFixed(2) &&
    Number(stats.invoicesWithDiscount ?? 0) === report.summary.totalInvoicesWithDiscount;

  console.log("Summary matches aggregates:", summaryMatches);

  if (!summaryMatches) {
    console.warn("⚠ Summary mismatch detected. Inspect details above.");
  }

  await prisma.$disconnect();
}

async function hasColumn(table: string, column: string) {
  const columns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    `PRAGMA table_info("${table}")`
  );
  return columns.some((col) => col.name === column);
}

main().catch((error) => {
  console.error(error);
  prisma.$disconnect().finally(() => process.exit(1));
});
