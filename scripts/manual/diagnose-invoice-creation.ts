import { config } from "dotenv";

config({ path: ".env.local", override: true });
config({ path: ".env" });

import { ensureBillfreePhase1Schema, ensureInvoiceSupportSchema, hasTable, prisma } from "../../lib/prisma";
import { getOrCreateAccountByCode, ACCOUNTS, PrismaTx } from "../../lib/accounting";

async function diagnoseInvoiceCreation() {
  console.log("🔍 Diagnosing Invoice Creation Issues...\n");

  try {
    await ensureBillfreePhase1Schema();
    await ensureInvoiceSupportSchema();
    console.log("✅ Database schemas are properly set up");
  } catch (error) {
    console.error("❌ Schema setup failed:", error);
    return;
  }

  // Check 1: Required Tables
  console.log("\n📋 Checking required tables...");
  const requiredTables = [
    "Account", "JournalEntry", "JournalLine", "Invoice", "Sale", 
    "Inventory", "Customer", "Payment", "LoyaltySettings", "LoyaltyLedger"
  ];

  const tableChecks = await Promise.all(
    requiredTables.map(async (table) => {
      const exists = await hasTable(table);
      return { table, exists };
    })
  );

  tableChecks.forEach(({ table, exists }) => {
    console.log(`${exists ? '✅' : '❌'} ${table}`);
  });

  const missingTables = tableChecks.filter(t => !t.exists);
  if (missingTables.length > 0) {
    console.log(`\n❌ Missing tables: ${missingTables.map(t => t.table).join(', ')}`);
    return;
  }

  // Check 2: Chart of Accounts
  console.log("\n💼 Checking Chart of Accounts...");
  try {
    const requiredAccounts = [
      ACCOUNTS.ASSETS.ACCOUNTS_RECEIVABLE,
      ACCOUNTS.INCOME.SALES,
      ACCOUNTS.LIABILITIES.GST_PAYABLE
    ];

    for (const accountCode of requiredAccounts) {
      try {
        const account = await getOrCreateAccountByCode(accountCode);
        console.log(`✅ Account ${accountCode}: ${account.name}`);
      } catch (error) {
        console.error(`❌ Failed to get/create account ${accountCode}:`, error instanceof Error ? error.message : error);
      }
    }
  } catch (error) {
    console.error("❌ Chart of Accounts check failed:", error);
  }

  // Check 3: Loyalty Settings
  console.log("\n🎯 Checking Loyalty Settings...");
  try {
    const loyaltySettings = await prisma.$queryRawUnsafe<Array<{
      id: string;
      pointsPerRupee: number | null;
      redeemRupeePerPoint: number | null;
    }>>(`SELECT id, pointsPerRupee, redeemRupeePerPoint FROM "LoyaltySettings" WHERE id = 'default' LIMIT 1`);
    
    if (loyaltySettings.length > 0) {
      const settings = loyaltySettings[0];
      console.log(`✅ Loyalty Settings found: pointsPerRupee=${settings.pointsPerRupee}, redeemRupeePerPoint=${settings.redeemRupeePerPoint}`);
    } else {
      console.log("⚠️  No loyalty settings found (this is OK if loyalty isn't being used)");
    }
  } catch (error) {
    console.error("❌ Loyalty settings check failed:", error instanceof Error ? error.message : error);
  }

  // Check 4: Recent Invoice Creation Attempts
  console.log("\n📄 Checking recent invoice creation attempts...");
  try {
    const recentInvoices = await prisma.invoice.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        invoiceNumber: true,
        status: true,
        paymentStatus: true,
        totalAmount: true,
        createdAt: true
      }
    });

    if (recentInvoices.length > 0) {
      console.log("✅ Recent invoices found:");
      recentInvoices.forEach(invoice => {
        console.log(`   ${invoice.invoiceNumber} - ${invoice.status} - ${invoice.paymentStatus} - ₹${invoice.totalAmount} - ${invoice.createdAt}`);
      });
    } else {
      console.log("⚠️  No recent invoices found");
    }
  } catch (error) {
    console.error("❌ Failed to check recent invoices:", error instanceof Error ? error.message : error);
  }

  // Check 5: Inventory Status
  console.log("\n📦 Checking Inventory Status...");
  try {
    const inventoryStats = await prisma.inventory.groupBy({
      by: ['status'],
      _count: { id: true }
    });

    console.log("✅ Inventory Status:");
    inventoryStats.forEach(stat => {
      console.log(`   ${stat.status}: ${stat._count.id} items`);
    });

    const inStockCount = inventoryStats.find(s => s.status === 'IN_STOCK')?._count.id || 0;
    if (inStockCount === 0) {
      console.log("⚠️  No items in stock - this could prevent invoice creation");
    }
  } catch (error) {
    console.error("❌ Failed to check inventory:", error instanceof Error ? error.message : error);
  }

  // Check 6: Customer Records
  console.log("\n👥 Checking Customer Records...");
  try {
    const customerCount = await prisma.customer.count();
    console.log(`✅ Found ${customerCount} customers in the system`);

    if (customerCount === 0) {
      console.log("⚠️  No customers found - invoice creation might require customer data");
    }
  } catch (error) {
    console.error("❌ Failed to check customers:", error instanceof Error ? error.message : error);
  }

  console.log("\n🎯 Common Invoice Creation Issues & Solutions:");
  console.log("1. Missing required tables - Run database migrations");
  console.log("2. Missing Chart of Accounts - Accounts will be auto-created on first use");
  console.log("3. No items in stock - Add inventory items with IN_STOCK status");
  console.log("4. Governance rules - Check if system is frozen or requires customer names");
  console.log("5. Permission issues - Ensure user has SALES_CREATE permission");
  console.log("6. Invalid data - Check all required fields are filled correctly");

  await prisma.$disconnect();
}

diagnoseInvoiceCreation().catch((error) => {
  console.error("❌ Diagnostic script failed:", error);
  prisma.$disconnect().finally(() => process.exit(1));
});
