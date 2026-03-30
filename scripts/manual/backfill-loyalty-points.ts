import { config } from "dotenv";

config({ path: ".env.local", override: true });
config({ path: ".env" });

import { ensureBillfreePhase1Schema, prisma } from "../../lib/prisma";
import { accrueLoyaltyPoints } from "../../lib/loyalty-accrual";
import { type PrismaTx } from "../../lib/accounting";
import crypto from "crypto";

async function main() {
  await ensureBillfreePhase1Schema();
  console.log("Starting loyalty points backfill for historical invoices...");

  // Find all paid invoices that don't have loyalty EARN entries
  const invoicesWithoutPoints = await prisma.$queryRawUnsafe<Array<{
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
      AND NOT EXISTS (
        SELECT 1 FROM "LoyaltyLedger" ll 
        WHERE ll.invoiceId = i.id AND ll.type = 'EARN'
      )
    ORDER BY i.invoiceDate ASC
  `);

  if (invoicesWithoutPoints.length === 0) {
    console.log("✅ All paid invoices already have loyalty points.");
    return;
  }

  console.log(`Found ${invoicesWithoutPoints.length} paid invoices without loyalty points. Awarding points...`);

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (const invoice of invoicesWithoutPoints) {
    if (!invoice.customerId) {
      skippedCount++;
      continue; // Skip invoices without customers
    }

    try {
      await prisma.$transaction(async (tx: PrismaTx) => {
        await accrueLoyaltyPoints({
          tx,
          customerId: invoice.customerId!,
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber || `INV-${invoice.id}`,
          invoiceTotal: Number(invoice.totalAmount),
          invoiceDate: new Date(invoice.invoiceDate)
        });
      });
      
      successCount++;
      if (successCount % 100 === 0) {
        console.log(`Processed ${successCount} invoices...`);
      }
    } catch (error) {
      errorCount++;
      console.error(`❌ Failed to award points for invoice ${invoice.invoiceNumber}:`, error instanceof Error ? error.message : error);
    }
  }

  console.log(`\n✅ Loyalty points backfill completed:`);
  console.log(`   - Successfully awarded points: ${successCount} invoices`);
  console.log(`   - Failed: ${errorCount} invoices`);
  console.log(`   - Skipped (no customer): ${skippedCount} invoices`);
  
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Loyalty backfill script failed:", error);
  prisma.$disconnect().finally(() => process.exit(1));
});
