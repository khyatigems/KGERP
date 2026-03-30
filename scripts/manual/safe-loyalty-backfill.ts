import { config } from "dotenv";

config({ path: ".env.local", override: true });
config({ path: ".env" });

import { ensureBillfreePhase1Schema, prisma } from "../../lib/prisma";
import { accrueLoyaltyPoints } from "../../lib/loyalty-accrual";
import { type PrismaTx } from "../../lib/accounting";
import crypto from "crypto";

async function main() {
  console.log("🎯 SAFELY backfilling loyalty points for all paid invoices...");
  
  // Get all paid invoices without loyalty points
  const invoicesWithoutLoyalty = await prisma.$queryRawUnsafe<Array<{
    invoiceId: string;
    invoiceNumber: string;
    totalAmount: number;
    customerId: string | null;
    invoiceDate: string;
  }>>(`
    SELECT 
      i.id as invoiceId,
      i.invoiceNumber,
      i.totalAmount,
      (SELECT s.customerId FROM Sale s WHERE s.invoiceId = i.id LIMIT 1) as customerId,
      i.invoiceDate
    FROM Invoice i
    WHERE i.paymentStatus = 'PAID'
      AND i.totalAmount > 0
      AND i.id NOT IN (
        SELECT DISTINCT invoiceId FROM "LoyaltyLedger" 
        WHERE invoiceId IS NOT NULL AND type = 'EARN'
      )
    ORDER BY i.invoiceDate ASC
  `);
  
  console.log(`\n📊 Found ${invoicesWithoutLoyalty.length} paid invoices without loyalty points`);
  
  if (invoicesWithoutLoyalty.length === 0) {
    console.log("✅ All paid invoices already have loyalty points");
    return;
  }
  
  // Process each invoice safely
  let successCount = 0;
  let errorCount = 0;
  let totalPointsAwarded = 0;
  
  for (const invoice of invoicesWithoutLoyalty) {
    if (!invoice.customerId) {
      console.log(`⚠️  Skipping ${invoice.invoiceNumber} - no customer linked`);
      continue;
    }
    
    try {
      await prisma.$transaction(async (tx) => {
        // Check if loyalty points already exist for this invoice
        const existingPoints = await tx.$queryRawUnsafe<Array<{ count: number }>>(
          `SELECT COUNT(*) as count FROM "LoyaltyLedger" WHERE invoiceId = ? AND type = 'EARN'`,
          invoice.invoiceId
        );

        if (existingPoints[0]?.count > 0) {
          console.log(`⏭️  Skipping ${invoice.invoiceNumber} - loyalty points already exist`);
          return;
        }
        
        // Calculate and award loyalty points
        await accrueLoyaltyPoints({
          tx: tx as PrismaTx,
          customerId: invoice.customerId!,
          invoiceId: invoice.invoiceId,
          invoiceNumber: invoice.invoiceNumber,
          invoiceTotal: Number(invoice.totalAmount),
          invoiceDate: new Date(invoice.invoiceDate)
        });
        
        // Calculate expected points for logging
        const expectedPoints = Math.floor(Number(invoice.totalAmount) * 0.01);
        totalPointsAwarded += expectedPoints;
        
        console.log(`✅ Awarded ${expectedPoints} points for ${invoice.invoiceNumber} (₹${invoice.totalAmount})`);
        successCount++;
      });
    } catch (error) {
      console.error(`❌ Failed to process ${invoice.invoiceNumber}:`, (error as Error).message);
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
    'LOYALTY_BACKFILL',
    `Processed ${successCount} invoices, awarded ${totalPointsAwarded} points, ${errorCount} errors`
    );
    console.log("✅ Activity log entry created");
  } catch (error) {
    console.log("ℹ️  Could not create activity log entry");
  }
  
  // Summary
  console.log(`\n📈 Loyalty Points Backfill Summary:`);
  console.log(`  ✅ Successful: ${successCount} invoices`);
  console.log(`  ❌ Failed: ${errorCount} invoices`);
  console.log(`  🎯 Total Points Awarded: ${totalPointsAwarded}`);
  
  // Verify results
  const finalCheck = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
    `SELECT COUNT(*) as count FROM "LoyaltyLedger" WHERE type = 'EARN'`
  );
  
  console.log(`\n🔍 Total loyalty entries in system: ${finalCheck[0]?.count || 0}`);
  
  console.log("\n✅ Loyalty points backfill completed safely - NO DATA DELETED");
  
  await prisma.$disconnect();
}

main().catch(console.error);
