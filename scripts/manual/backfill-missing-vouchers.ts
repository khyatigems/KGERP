import { config } from "dotenv";

config({ path: ".env.local", override: true });
config({ path: ".env" });

import { ensureBillfreePhase1Schema, prisma } from "../../lib/prisma";
import { createVoucher } from "../../lib/voucher-service";
import { type PrismaTx } from "../../lib/accounting";

async function main() {
  await ensureBillfreePhase1Schema();
  console.log("Starting backfill for missing vouchers...");

  // Find all payments that don't have corresponding vouchers
  const paymentsWithoutVouchers = await prisma.$queryRawUnsafe<Array<{
    id: string;
    invoiceId: string;
    amount: number;
    method: string;
    date: string;
    reference: string | null;
    recordedBy: string | null;
    invoiceNumber: string | null;
    customerId: string | null;
  }>>(`
    SELECT 
      p.id,
      p.invoiceId,
      p.amount,
      p.method,
      p.date,
      p.reference,
      p.recordedBy,
      i.invoiceNumber,
      (SELECT s.customerId FROM Sale s WHERE s.invoiceId = p.invoiceId LIMIT 1) as customerId
    FROM Payment p
    JOIN Invoice i ON p.invoiceId = i.id
    LEFT JOIN Voucher v ON v.referenceType = 'INVOICE_PAYMENT' AND v.referenceId = p.id
    WHERE v.id IS NULL
    ORDER BY p.date ASC
  `);

  if (paymentsWithoutVouchers.length === 0) {
    console.log("✅ All payments already have vouchers.");
    return;
  }

  console.log(`Found ${paymentsWithoutVouchers.length} payments without vouchers. Creating vouchers...`);

  let successCount = 0;
  let errorCount = 0;

  for (const payment of paymentsWithoutVouchers) {
    try {
      await prisma.$transaction(async (tx: PrismaTx) => {
        await createVoucher({
          type: "RECEIPT",
          date: new Date(payment.date),
          amount: Number(payment.amount),
          narration: `Payment received for Invoice ${payment.invoiceNumber || `INV-${payment.invoiceId}`}${payment.reference ? ` (Ref: ${payment.reference})` : ""}`,
          referenceId: payment.customerId || undefined,
          createdById: payment.recordedBy || "system"
        }, tx);
      });
      
      successCount++;
      if (successCount % 100 === 0) {
        console.log(`Processed ${successCount} vouchers...`);
      }
    } catch (error) {
      errorCount++;
      console.error(`❌ Failed to create voucher for payment ${payment.id}:`, error instanceof Error ? error.message : error);
    }
  }

  console.log(`\n✅ Backfill completed:`);
  console.log(`   - Successfully created: ${successCount} vouchers`);
  console.log(`   - Failed: ${errorCount} vouchers`);
  
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Backfill script failed:", error);
  prisma.$disconnect().finally(() => process.exit(1));
});
