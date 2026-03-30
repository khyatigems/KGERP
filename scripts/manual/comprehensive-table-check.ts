import { config } from "dotenv";

config({ path: ".env.local", override: true });
config({ path: ".env" });

import { ensureBillfreePhase1Schema, prisma } from "../../lib/prisma";

async function main() {
  console.log("🔍 COMPREHENSIVE DATABASE TABLE VERIFICATION...");
  
  try {
    // Get all tables in the database
    const tables = await prisma.$queryRawUnsafe<Array<{ 
      name: string;
      type: string;
      sql: string;
    }>>(`
      SELECT name, type, sql FROM sqlite_master 
      WHERE type = 'table' 
        AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);
    
    console.log(`\n📊 Found ${tables.length} tables in database:`);
    
    // Expected tables based on schema
    const expectedTables = [
      'Account', 'ActivityLog', 'Customer', 'CustomerCampaignLog', 'CustomerProfileExtra',
      'Inventory', 'InventoryMedia', 'Invoice', 'InvoicePromotionSettings', 'InvoiceVersion',
      'JournalEntry', 'JournalLine', 'Listing', 'ListingPriceHistory', 'Memo', 'MemoItem',
      'MessageTemplate', 'OfferBanner', 'Payment', 'Permission', 'Purchase', 'PurchaseItem',
      'Quotation', 'QuotationItem', 'Role', 'RolePermission', 'Sale', 'SalesReturn', 
      'SalesReturnItem', 'SerializedUnit', 'SerialActivityLog', 'Setting', 'CompanySettings',
      'FollowUp', 'CreditNote', 'InvoiceSettings', 'PaymentSettings', 'User', 'UserPermission',
      'Voucher', 'Expense', 'ExpenseCategory', 'Coupon', 'CouponRedemption', 'LoyaltyLedger',
      'LoyaltySettings', 'CategoryCode', 'GemstoneCode', 'ColorCode', 'CutCode', 'CollectionCode',
      'RashiCode', 'CertificateCode', 'PriceOverrideAudit', 'DashboardNote', 'LabelPrintJob',
      'LabelPrintJobItem', 'LabelCartItem', 'PackagingCartItem', 'SalesMarginAnalytics',
      'ReportExportJob', 'WorkerLockHeartbeat', 'AnalyticsDailySnapshot', 'AnalyticsInventorySnapshot',
      'AnalyticsVendorSnapshot', 'AnalyticsSalesSnapshot', 'AnalyticsLabelSnapshot',
      'GPISSettings', 'GPISLayoutPreset', 'GPISSerial', 'GPISPrintJob', 'GPISPrintJobItem',
      'GPISVerificationLog', 'CertificateCodeToInventory', 'InventoryToRashiCode'
    ];
    
    console.log("\n✅ TABLE STATUS CHECK:");
    
    let presentCount = 0;
    let missingCount = 0;
    
    for (const expectedTable of expectedTables) {
      const found = tables.find(t => t.name === expectedTable);
      if (found) {
        console.log(`  ✅ ${expectedTable} - PRESENT`);
        presentCount++;
      } else {
        console.log(`  ❌ ${expectedTable} - MISSING`);
        missingCount++;
      }
    }
    
    // Check for any unexpected tables
    const unexpectedTables = tables.filter(t => !expectedTables.includes(t.name));
    if (unexpectedTables.length > 0) {
      console.log("\n⚠️  UNEXPECTED TABLES:");
      unexpectedTables.forEach(table => {
        console.log(`  📋 ${table.name} (${table.type})`);
      });
    }
    
    // Summary
    console.log(`\n📈 TABLE VERIFICATION SUMMARY:`);
    console.log(`  ✅ Present: ${presentCount}/${expectedTables.length}`);
    console.log(`  ❌ Missing: ${missingCount}/${expectedTables.length}`);
    console.log(`  ⚠️  Unexpected: ${unexpectedTables.length}`);
    
    // Check critical tables have data
    console.log("\n🔍 CRITICAL TABLES DATA VERIFICATION:");
    
    const criticalTables = [
      { name: 'Customer', description: 'Customer records' },
      { name: 'Invoice', description: 'Invoice records' },
      { name: 'Sale', description: 'Sales records' },
      { name: 'Inventory', description: 'Inventory items' },
      { name: 'JournalEntry', description: 'Accounting entries' },
      { name: 'LoyaltyLedger', description: 'Loyalty points' },
      { name: 'LoyaltySettings', description: 'Loyalty configuration' },
      { name: 'Permission', description: 'System permissions' },
      { name: 'Role', description: 'User roles' },
      { name: 'User', description: 'System users' }
    ];
    
    for (const table of criticalTables) {
      try {
        let count;
        if (table.name === 'LoyaltyLedger' || table.name === 'LoyaltySettings') {
          count = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
            `SELECT COUNT(*) as count FROM "${table.name}"`
          );
          count = count[0]?.count || 0;
        } else {
          count = await (prisma as any)[table.name.toLowerCase()].count();
        }
        
        console.log(`  📊 ${table.name}: ${count} records (${table.description})`);
      } catch (error) {
        console.log(`  ❌ ${table.name}: ERROR - ${(error as Error).message}`);
      }
    }
    
    // Check foreign key constraints
    console.log("\n🔗 FOREIGN KEY CONSTRAINTS:");
    
    const fkChecks = [
      {
        table: 'Sale',
        column: 'customerId',
        refTable: 'Customer',
        query: `SELECT COUNT(*) as count FROM Sale s LEFT JOIN Customer c ON s.customerId = c.id WHERE s.customerId IS NOT NULL AND c.id IS NULL`
      },
      {
        table: 'Sale',
        column: 'invoiceId',
        refTable: 'Invoice',
        query: `SELECT COUNT(*) as count FROM Sale s LEFT JOIN Invoice i ON s.invoiceId = i.id WHERE s.invoiceId IS NOT NULL AND i.id IS NULL`
      },
      {
        table: 'JournalEntry',
        column: 'createdById',
        refTable: 'User',
        query: `SELECT COUNT(*) as count FROM JournalEntry j LEFT JOIN "User" u ON j.createdById = u.id WHERE u.id IS NULL`
      }
    ];
    
    for (const fk of fkChecks) {
      try {
        const result = await prisma.$queryRawUnsafe<Array<{ count: number }>>(fk.query);
        const brokenFk = result[0]?.count || 0;
        if (brokenFk > 0) {
          console.log(`  ⚠️  ${fk.table}.${fk.column}: ${brokenFk} broken references to ${fk.refTable}`);
        } else {
          console.log(`  ✅ ${fk.table}.${fk.column}: All references valid`);
        }
      } catch (error) {
        console.log(`  ❌ ${fk.table}.${fk.column}: Check failed`);
      }
    }
    
    console.log("\n✅ COMPREHENSIVE VERIFICATION COMPLETED");
    
  } catch (error) {
    console.error("❌ Error during verification:", error);
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
