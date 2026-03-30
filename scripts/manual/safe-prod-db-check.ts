import { config } from "dotenv";

config({ path: ".env.local", override: true });
config({ path: ".env" });

import { ensureBillfreePhase1Schema, prisma } from "../../lib/prisma";

async function main() {
  console.log("🔍 SAFELY checking production database schema and data...");
  
  // Check database connection
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    console.log("✅ Database connection successful");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return;
  }
  
  // Check existing data (READ ONLY)
  console.log("\n📊 Checking existing data in production DB...");
  
  const counts = await Promise.all([
    prisma.customer.count(),
    prisma.invoice.count(),
    prisma.sale.count(),
    prisma.inventory.count(),
    prisma.journalEntry.count(),
    prisma.voucher.count(),
    prisma.$queryRawUnsafe<Array<{ count: number }>>(`SELECT COUNT(*) as count FROM "LoyaltyLedger"`),
    prisma.$queryRawUnsafe<Array<{ count: number }>>(`SELECT COUNT(*) as count FROM "LoyaltySettings"`)
  ]);
  
  console.log(`👥 Customers: ${counts[0]}`);
  console.log(`📄 Invoices: ${counts[1]}`);
  console.log(`💰 Sales: ${counts[2]}`);
  console.log(`📦 Inventory: ${counts[3]}`);
  console.log(`📝 Journal Entries: ${counts[4]}`);
  console.log(`🎫 Vouchers: ${counts[5]}`);
  console.log(`🎯 Loyalty Ledger: ${counts[6][0]?.count || 0}`);
  console.log(`⚙️  Loyalty Settings: ${counts[7][0]?.count || 0}`);
  
  // Check schema completeness
  console.log("\n🔍 Checking database schema...");
  
  try {
    // Check LoyaltyLedger schema
    const loyaltyColumns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
      `PRAGMA table_info("LoyaltyLedger")`
    );
    
    const requiredLoyaltyCols = ['id', 'customerId', 'invoiceId', 'type', 'points', 'rupeeValue', 'remarks', 'date', 'createdAt', 'updatedAt'];
    const missingLoyaltyCols = requiredLoyaltyCols.filter(col => !loyaltyColumns.some(c => c.name === col));
    
    if (missingLoyaltyCols.length > 0) {
      console.log(`⚠️  LoyaltyLedger missing columns: ${missingLoyaltyCols.join(', ')}`);
    } else {
      console.log("✅ LoyaltyLedger schema complete");
    }
  } catch (error) {
    console.log("ℹ️  LoyaltyLedger table doesn't exist - will be created");
  }
  
  try {
    // Check LoyaltySettings
    const settings = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM "LoyaltySettings" WHERE id = 'default'`
    );
    
    if (settings.length === 0) {
      console.log("ℹ️  LoyaltySettings missing - will be created");
    } else {
      console.log("✅ LoyaltySettings exists");
    }
  } catch (error) {
    console.log("ℹ️  LoyaltySettings table doesn't exist - will be created");
  }
  
  // Check permissions and roles
  try {
    const permissionCount = await prisma.permission.count();
    const roleCount = await prisma.role.count();
    const rolePermCount = await prisma.rolePermission.count();
    
    console.log(`🔐 Permissions: ${permissionCount}`);
    console.log(`👑 Roles: ${roleCount}`);
    console.log(`🔗 Role-Permission mappings: ${rolePermCount}`);
    
    if (permissionCount === 0 || roleCount === 0) {
      console.log("⚠️  Permissions/Roles missing - will be created");
    }
  } catch (error) {
    console.log("ℹ️  Permissions/Roles tables don't exist - will be created");
  }
  
  // Check for paid invoices without loyalty points
  if (counts[1] > 0) {
    try {
      const invoicesWithoutLoyalty = await prisma.$queryRawUnsafe<Array<{
        invoiceId: string;
        invoiceNumber: string;
        totalAmount: number;
        customerId: string;
      }>>(`
        SELECT 
          i.id as invoiceId,
          i.invoiceNumber,
          i.totalAmount,
          (SELECT s.customerId FROM Sale s WHERE s.invoiceId = i.id LIMIT 1) as customerId
        FROM Invoice i
        WHERE i.paymentStatus = 'PAID'
          AND i.totalAmount > 0
          AND i.id NOT IN (
            SELECT DISTINCT invoiceId FROM "LoyaltyLedger" 
            WHERE invoiceId IS NOT NULL AND type = 'EARN'
          )
        LIMIT 10
      `);
      
      if (invoicesWithoutLoyalty.length > 0) {
        console.log(`\n⚠️  Found ${invoicesWithoutLoyalty.length} paid invoices without loyalty points:`);
        invoicesWithoutLoyalty.forEach(inv => {
          console.log(`  ${inv.invoiceNumber}: ₹${inv.totalAmount} (Customer: ${inv.customerId})`);
        });
        console.log("💡 These customers need loyalty points backfill");
      } else {
        console.log("\n✅ All paid invoices have loyalty points");
      }
    } catch (error) {
      console.log("ℹ️  Could not check loyalty points - LoyaltyLedger may not exist");
    }
  }
  
  // Check for sales without journal entries
  if (counts[2] > 0) {
    try {
      const salesWithoutJournal = await prisma.$queryRawUnsafe<Array<{
        saleId: string;
        customerName: string;
        netAmount: number;
        invoiceId: string;
      }>>(`
        SELECT 
          s.id as saleId,
          s.customerName,
          s.netAmount,
          s.invoiceId
        FROM Sale s
        WHERE s.invoiceId IS NOT NULL
          AND s.invoiceId NOT IN (
            SELECT DISTINCT referenceId FROM JournalEntry 
            WHERE referenceType = 'INVOICE'
          )
        LIMIT 10
      `);
      
      if (salesWithoutJournal.length > 0) {
        console.log(`\n⚠️  Found ${salesWithoutJournal.length} sales without journal entries:`);
        salesWithoutJournal.forEach(sale => {
          console.log(`  ${sale.customerName}: ₹${sale.netAmount} (Invoice: ${sale.invoiceId})`);
        });
        console.log("💡 These sales need journal entries backfill");
      } else {
        console.log("\n✅ All sales have journal entries");
      }
    } catch (error) {
      console.log("ℹ️  Could not check journal entries");
    }
  }
  
  console.log("\n✅ Database check completed safely - NO DATA MODIFIED");
  console.log("📝 Ready to run safe migrations and backfills");
  
  await prisma.$disconnect();
}

main().catch(console.error);
