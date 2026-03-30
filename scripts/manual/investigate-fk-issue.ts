import { config } from "dotenv";

config({ path: ".env.local", override: true });
config({ path: ".env" });

import { ensureBillfreePhase1Schema, prisma } from "../../lib/prisma";
import crypto from "crypto";

async function main() {
  console.log("🔍 SAFELY investigating foreign key constraint issue...");
  
  // Check the problematic invoice IDs
  const problematicInvoices = await prisma.$queryRawUnsafe<Array<{
    invoiceId: string;
    invoiceNumber: string;
    customerName: string;
    netAmount: number;
    customerId: string | null;
  }>>(`
    SELECT 
      s.invoiceId,
      i.invoiceNumber,
      s.customerName,
      s.netAmount,
      s.customerId
    FROM Sale s
    LEFT JOIN Invoice i ON s.invoiceId = i.id
    WHERE s.invoiceId IS NOT NULL
      AND s.paymentStatus = 'PAID'
      AND s.invoiceId NOT IN (
        SELECT DISTINCT referenceId FROM JournalEntry 
        WHERE referenceType = 'INVOICE'
      )
  `);
  
  console.log(`Found ${problematicInvoices.length} problematic invoices:`);
  problematicInvoices.forEach(inv => {
    console.log(`  ${inv.invoiceNumber}: ${inv.invoiceId} - Customer: ${inv.customerName}`);
  });
  
  // Check if these invoice IDs actually exist in Invoice table
  for (const inv of problematicInvoices) {
    const invoiceExists = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
      `SELECT COUNT(*) as count FROM Invoice WHERE id = ?`,
      inv.invoiceId
    );
    
    console.log(`Invoice ${inv.invoiceNumber} (${inv.invoiceId}) exists: ${invoiceExists[0]?.count > 0 ? 'YES' : 'NO'}`);
    
    if (invoiceExists[0]?.count > 0) {
      // Check if there's a valid user for createdById
      const users = await prisma.$queryRawUnsafe<Array<{ id: string; name: string }>>(
        `SELECT id, name FROM "User" LIMIT 5`
      );
      
      console.log(`Available users: ${users.length}`);
      if (users.length > 0) {
        console.log(`  First user: ${users[0].name || users[0].id}`);
      }
    }
  }
  
  // Check system user existence
  const systemUser = await prisma.$queryRawUnsafe<Array<{ id: string; name: string }>>(
    `SELECT id, name FROM "User" WHERE id = 'system' OR email LIKE '%system%'`
  );
  
  console.log(`System user found: ${systemUser.length > 0 ? 'YES' : 'NO'}`);
  if (systemUser.length > 0) {
    console.log(`  System user: ${systemUser[0].name || systemUser[0].id}`);
  }
  
  console.log("\n✅ Investigation completed - NO DATA MODIFIED");
  
  await prisma.$disconnect();
}

main().catch(console.error);
