import { config } from "dotenv";

config({ path: ".env.local", override: true });
config({ path: ".env" });

import { ensureBillfreePhase1Schema, prisma } from "../../lib/prisma";
import { postJournalEntry } from "../../lib/accounting";
import { createVoucher } from "../../lib/voucher-service";
import crypto from "crypto";

async function main() {
  console.log("📝 SAFELY backfilling accounting entries for paid sales...");
  
  // Get sales without journal entries
  const salesWithoutJournal = await prisma.$queryRawUnsafe<Array<{
    saleId: string;
    customerName: string;
    customerId: string | null;
    netAmount: number;
    invoiceId: string;
    invoiceNumber: string;
    saleDate: string;
    paymentMethod: string;
  }>>(`
    SELECT 
      s.id as saleId,
      s.customerName,
      s.customerId,
      s.netAmount,
      s.invoiceId,
      i.invoiceNumber,
      s.saleDate,
      s.paymentMethod
    FROM Sale s
    LEFT JOIN Invoice i ON s.invoiceId = i.id
    WHERE s.invoiceId IS NOT NULL
      AND s.paymentStatus = 'PAID'
      AND s.invoiceId NOT IN (
        SELECT DISTINCT referenceId FROM JournalEntry 
        WHERE referenceType = 'INVOICE'
      )
    ORDER BY s.saleDate ASC
  `);
  
  console.log(`\n📊 Found ${salesWithoutJournal.length} paid sales without journal entries`);
  
  if (salesWithoutJournal.length === 0) {
    console.log("✅ All paid sales already have journal entries");
    return;
  }
  
  // Get valid user ID
  const validUser = await prisma.$queryRawUnsafe<Array<{ id: string; name: string }>>(
    `SELECT id, name FROM "User" LIMIT 1`
  );
  
  const validUserId = validUser.length > 0 ? validUser[0].id : null;
  
  if (!validUserId) {
    console.error("❌ No valid users found in database. Cannot create journal entries.");
    return;
  }
  
  console.log(`👤 Using user: ${validUser[0].name || validUser[0].id} for journal entries`);
  const accounts = await prisma.account.findMany({
    where: {
      code: {
        in: ['1010', '4001', '2001'] // AR, Sales, GST Payable
      }
    }
  });
  
  const arAccount = accounts.find(a => a.code === '1010');
  const salesAccount = accounts.find(a => a.code === '4001');
  const gstPayableAccount = accounts.find(a => a.code === '2001');
  
  if (!arAccount || !salesAccount) {
    console.error("❌ Required accounts not found. Please ensure accounts 1010 and 4001 exist.");
    return;
  }
  
  // Process each sale safely
  let successCount = 0;
  let errorCount = 0;
  let totalJournalEntries = 0;
  
  for (const sale of salesWithoutJournal) {
    try {
      await prisma.$transaction(async (tx) => {
        // Check if journal entry already exists
        const existingJournal = await tx.$queryRawUnsafe<Array<{ id: string }>>(
          `SELECT id FROM "JournalEntry" WHERE referenceType = ? AND referenceId = ? LIMIT 1`,
          'INVOICE',
          sale.invoiceId
        );
        
        if (existingJournal.length > 0) {
          console.log(`⏭️  Skipping ${sale.invoiceNumber} - journal entry already exists`);
          return;
        }
        
        // Create journal entry
        const journalEntryInput = {
          referenceType: "INVOICE" as const,
          referenceId: sale.invoiceId,
          description: `Sale Invoice ${sale.invoiceNumber}`,
          date: new Date(sale.saleDate),
          userId: validUserId,
          lines: [
            {
              accountId: arAccount.id,
              debit: sale.netAmount,
              credit: 0,
              description: `Accounts Receivable for Invoice ${sale.invoiceNumber}`,
            },
            {
              accountId: salesAccount.id,
              debit: 0,
              credit: sale.netAmount,
              description: `Sales Revenue for Invoice ${sale.invoiceNumber}`,
            },
          ],
        };
        
        await postJournalEntry(journalEntryInput, tx);
        totalJournalEntries++;
        
        // Create voucher
        try {
          await createVoucher({
            type: "RECEIPT",
            date: new Date(sale.saleDate),
            amount: Number(sale.netAmount),
            narration: `Sale Invoice ${sale.invoiceNumber} - ${sale.customerName || "Walk-in"}`,
            referenceId: sale.customerId || undefined,
            createdById: validUserId
          }, tx);
        } catch (voucherError) {
          console.log(`⚠️  Voucher creation failed for ${sale.invoiceNumber}:`, (voucherError as Error).message);
        }
        
        console.log(`✅ Created journal entry for ${sale.invoiceNumber}: ₹${sale.netAmount}`);
        successCount++;
      });
    } catch (error) {
      console.error(`❌ Failed to process ${sale.invoiceNumber}:`, (error as Error).message);
      errorCount++;
    }
  }
  
  // Create log entry
  try {
    await prisma.$executeRawUnsafe(`
      INSERT OR IGNORE INTO "ActivityLog" (id, userId, action, details, createdAt)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `,
    crypto.randomUUID(),
    'system',
    'ACCOUNTING_BACKFILL',
    `Processed ${successCount} sales, created ${totalJournalEntries} journal entries, ${errorCount} errors`
    );
    console.log("✅ Activity log entry created");
  } catch (error) {
    console.log("ℹ️  Could not create activity log entry");
  }
  
  // Summary
  console.log(`\n📈 Accounting Backfill Summary:`);
  console.log(`  ✅ Successful: ${successCount} sales`);
  console.log(`  ❌ Failed: ${errorCount} sales`);
  console.log(`  📝 Journal Entries Created: ${totalJournalEntries}`);
  
  // Verify results
  const finalCheck = await prisma.journalEntry.count({
    where: {
      referenceType: 'INVOICE'
    }
  });
  
  console.log(`\n🔍 Total invoice journal entries: ${finalCheck}`);
  
  console.log("\n✅ Accounting backfill completed safely - NO DATA DELETED");
  
  await prisma.$disconnect();
}

main().catch(console.error);
