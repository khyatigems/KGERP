import { config } from "dotenv";

config({ path: ".env.local", override: true });
config({ path: ".env" });

import { ensureBillfreePhase1Schema, prisma } from "../../lib/prisma";
import { accrueLoyaltyPoints } from "../../lib/loyalty-accrual";
import { type PrismaTx } from "../../lib/accounting";
import crypto from "crypto";

async function main() {
  console.log("Starting loyalty points backfill for ALL historical invoices (including previously processed)...");
  
  // Find ALL paid invoices (not just ones without loyalty points)
  const allPaidInvoices = await prisma.$queryRawUnsafe<Array<{
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
      AND i.invoiceDate >= date('now', '-2 years')
    ORDER BY i.invoiceDate ASC
  `);

  if (allPaidInvoices.length === 0) {
    console.log("✅ No paid invoices found.");
    return;
  }

  console.log(`Found ${allPaidInvoices.length} paid invoices. Processing loyalty points...`);

  for (const invoice of allPaidInvoices) {
    if (!invoice.customerId) {
      console.log(`Skipping invoice ${invoice.invoiceNumber} - no customer`);
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
        console.log(`✅ Processed loyalty points for invoice ${invoice.invoiceNumber}`);
      } catch (error) {
        console.error(`Failed to process loyalty for invoice ${invoice.invoiceNumber}:`, error);
      }
    });
  }

  console.log("✅ Loyalty points backfill completed!");
}

main().catch((error) => {
  console.error("Loyalty backfill script failed:", error);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
});
