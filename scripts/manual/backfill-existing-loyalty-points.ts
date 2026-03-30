import { config } from "dotenv";

config({ path: ".env.local", override: true });
config({ path: ".env" });

import { ensureBillfreePhase1Schema, prisma } from "../../lib/prisma";
import { accrueLoyaltyPoints } from "../../lib/loyalty-accrual";
import { type PrismaTx } from "../../lib/accounting";

async function main() {
  console.log("Backfilling loyalty points for existing paid invoices...");
  
  // Find all paid invoices
  const paidInvoices = await prisma.$queryRawUnsafe<Array<{
    id: string;
    invoiceNumber: string | null;
    totalAmount: number;
    invoiceDate: string;
    customerId: string | null;
  }>>(`
    SELECT 
      i.id,
      i.invoiceNumber,
      i.totalAmount,
      i.invoiceDate,
      (SELECT s.customerId FROM Sale s WHERE s.invoiceId = i.id LIMIT 1) as customerId
    FROM Invoice i
    WHERE i.paymentStatus = 'PAID'
      AND i.totalAmount > 0
    ORDER BY i.invoiceDate ASC
  `);

  if (paidInvoices.length === 0) {
    console.log("✅ No paid invoices found.");
    return;
  }

  console.log(`Found ${paidInvoices.length} paid invoices. Processing loyalty points...`);

  for (const invoice of paidInvoices) {
    if (!invoice.customerId) {
      console.log(`Skipping invoice ${invoice.invoiceNumber} - no customer`);
      continue;
    }

    // Check if loyalty points already exist for this invoice
    const existingPoints = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
      `SELECT COUNT(*) as count FROM "LoyaltyLedger" WHERE invoiceId = ? AND type = 'EARN'`,
      invoice.id
    );

    if (existingPoints[0]?.count > 0) {
      console.log(`⏭️  Skipping invoice ${invoice.invoiceNumber} - loyalty points already exist`);
      continue;
    }

    await prisma.$transaction(async (tx) => {
      try {
        await accrueLoyaltyPoints({
          tx: tx as PrismaTx,
          customerId: invoice.customerId!,
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber || `INV-${invoice.id}`,
          invoiceTotal: Number(invoice.totalAmount),
          invoiceDate: new Date(invoice.invoiceDate)
        });
        console.log(`✅ Awarded loyalty points for invoice ${invoice.invoiceNumber}`);
      } catch (error) {
        console.error(`❌ Failed to process loyalty for invoice ${invoice.invoiceNumber}:`, error);
      }
    });
  }

  console.log("✅ Loyalty points backfill completed!");
  
  // Show summary
  const summary = await prisma.$queryRawUnsafe<Array<{
    customerName: string;
    totalPoints: number;
    earnedPoints: number;
  }>>(`
    SELECT 
      c.name as customerName,
      COALESCE(SUM(ll.points), 0) as totalPoints,
      COALESCE(SUM(CASE WHEN ll.type = 'EARN' THEN ll.points ELSE 0 END), 0) as earnedPoints
    FROM Customer c
    LEFT JOIN "LoyaltyLedger" ll ON c.id = ll.customerId
    WHERE c.id IN (SELECT DISTINCT customerId FROM "LoyaltyLedger")
    GROUP BY c.id, c.name
    ORDER BY totalPoints DESC
  `);
  
  console.log("\n📊 Loyalty Summary:");
  summary.forEach(s => {
    console.log(`  ${s.customerName}: ${s.totalPoints} total (${s.earnedPoints} earned)`);
  });
  
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Loyalty backfill script failed:", error);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
});
