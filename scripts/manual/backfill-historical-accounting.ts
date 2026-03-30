import { config } from "dotenv";

config({ path: ".env.local", override: true });
config({ path: ".env" });

import { ensureBillfreePhase1Schema, prisma } from "../../lib/prisma";
import { createVoucher } from "../../lib/voucher-service";
import { type PrismaTx } from "../../lib/accounting";
import crypto from "crypto";

async function main() {
  console.log("Starting backfill for missing historical accounting entries...");
  
  // Find all sales that don't have journal entries
  const salesWithoutEntries = await prisma.$queryRawUnsafe<Array<{
    id: string;
    invoiceNumber: string | null;
    netAmount: number;
    saleDate: string;
    customerName: string | null;
    customerId: string | null;
    invoiceId: string | null;
  }>>(`
    SELECT 
      s.id,
      i.invoiceNumber,
      s.netAmount,
      s.saleDate,
      s.customerName,
      s.customerId,
      s.invoiceId
    FROM Sale s
    LEFT JOIN Invoice i ON s.invoiceId = i.id
    LEFT JOIN JournalEntry je ON je.referenceType = 'INVOICE' AND je.referenceId = s.invoiceId
    WHERE s.invoiceId IS NOT NULL 
      AND je.id IS NULL
      AND s.netAmount > 0
    ORDER BY s.saleDate ASC
  `);

  if (salesWithoutEntries.length === 0) {
    console.log("✅ All sales already have journal entries.");
    return;
  }

  console.log(`Found ${salesWithoutEntries.length} sales without journal entries. Creating entries...`);

  for (const sale of salesWithoutEntries) {
    await prisma.$transaction(async (tx) => {
      // Get or create accounts
      const arAccount = await tx.account.findFirst({ where: { code: "1010" } });
      const salesAccount = await tx.account.findFirst({ where: { code: "4001" } });
      
      if (!arAccount || !salesAccount) {
        console.log(`Skipping sale ${sale.id} - missing accounts`);
        return;
      }

      // Create journal entry
      await tx.journalEntry.create({
        data: {
          date: new Date(sale.saleDate),
          description: `[Backfill] Sale Invoice ${sale.invoiceNumber || `INV-${sale.invoiceId}`} - ${sale.customerName || "Walk-in"}`,
          referenceType: "INVOICE",
          referenceId: sale.invoiceId!,
          createdById: "system",
          lines: {
            create: [
              {
                accountId: arAccount.id,
                debit: Number(sale.netAmount),
                credit: 0,
                description: `Accounts Receivable for Invoice ${sale.invoiceNumber || `INV-${sale.invoiceId}`}`
              },
              {
                accountId: salesAccount.id,
                debit: 0,
                credit: Number(sale.netAmount),
                description: `Sales Revenue for Invoice ${sale.invoiceNumber || `INV-${sale.invoiceId}`}`
              }
            ]
          }
        }
      });

      // Create voucher
      await createVoucher({
        type: "RECEIPT",
        date: new Date(sale.saleDate),
        amount: Number(sale.netAmount),
        narration: `Sale Invoice ${sale.invoiceNumber || `INV-${sale.invoiceId}`} - ${sale.customerName || "Walk-in"}`,
        referenceId: sale.customerId || undefined,
        createdById: "system"
      }, tx);

      console.log(`✅ Created journal entry and voucher for sale ${sale.id}`);
    });
  }

  console.log("✅ Backfill completed successfully!");
}

main().catch((error) => {
  console.error("Backfill script failed:", error);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
});
