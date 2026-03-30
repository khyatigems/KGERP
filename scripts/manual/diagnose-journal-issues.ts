import { config } from "dotenv";

config({ path: ".env.local", override: true });
config({ path: ".env" });

import { prisma } from "../../lib/prisma";
import { ACCOUNTS, getOrCreateAccountByCode } from "../../lib/accounting";

async function diagnoseJournalIssues() {
  console.log("🔍 Diagnosing Journal Entry Issues...\n");
  
  try {
    // 1. Check if required accounts exist
    console.log("📋 Checking Required Accounts:");
    
    const requiredAccounts = [
      { code: ACCOUNTS.ASSETS.ACCOUNTS_RECEIVABLE, name: "Accounts Receivable" },
      { code: ACCOUNTS.INCOME.SALES, name: "Sales Revenue" }
    ];
    
    for (const account of requiredAccounts) {
      try {
        const existing = await prisma.account.findUnique({ where: { code: account.code } });
        if (existing) {
          console.log(`   ✅ ${account.name} (${account.code}) - EXISTS`);
        } else {
          console.log(`   ❌ ${account.name} (${account.code}) - MISSING`);
        }
      } catch (error) {
        console.log(`   ⚠️  ${account.name} (${account.code}) - ERROR: ${error}`);
      }
    }
    
    // 2. Check recent journal entries
    console.log("\n📊 Recent Journal Entries:");
    const recentJournals = await prisma.journalEntry.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        lines: true,
        createdBy: {
          select: { name: true, email: true }
        }
      }
    });
    
    if (recentJournals.length === 0) {
      console.log("   No journal entries found");
    } else {
      recentJournals.forEach((journal, i) => {
        const totalDebit = journal.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
        const totalCredit = journal.lines.reduce((sum, line) => sum + (line.credit || 0), 0);
        const balanced = Math.abs(totalDebit - totalCredit) < 0.01;
        
        console.log(`   ${i+1}. ${journal.description} - ${balanced ? '✅' : '❌'}`);
        console.log(`      Date: ${journal.date}`);
        console.log(`      User: ${journal.createdBy?.name || 'Unknown'}`);
        console.log(`      Debit: ₹${totalDebit}, Credit: ₹${totalCredit}`);
        console.log(`      Lines: ${journal.lines.length}`);
      });
    }
    
    // 3. Check recent sales attempts
    console.log("\n💰 Recent Sales Attempts:");
    const recentSales = await prisma.sale.findMany({
      take: 5,
      orderBy: { id: 'desc' },
      include: {
        invoice: {
          select: { invoiceNumber: true, totalAmount: true, paymentStatus: true }
        }
      }
    });
    
    if (recentSales.length === 0) {
      console.log("   No sales found");
    } else {
      recentSales.forEach((sale, i) => {
        console.log(`   ${i+1}. Sale ID: ${sale.id}`);
        console.log(`      Invoice: ${sale.invoice?.invoiceNumber || 'No invoice'}`);
        console.log(`      Amount: ₹${sale.invoice?.totalAmount || 0}`);
        console.log(`      Status: ${sale.invoice?.paymentStatus || 'Unknown'}`);
        console.log(`      Customer: ${sale.customerId || 'Walk-in'}`);
      });
    }
    
    // 4. Test account creation
    console.log("\n🧪 Testing Account Creation:");
    try {
      const testTx = prisma;
      const arAccount = await getOrCreateAccountByCode(ACCOUNTS.ASSETS.ACCOUNTS_RECEIVABLE, testTx);
      console.log(`   ✅ Accounts Receivable: ${arAccount.name} (${arAccount.id})`);
      
      const salesAccount = await getOrCreateAccountByCode(ACCOUNTS.INCOME.SALES, testTx);
      console.log(`   ✅ Sales Revenue: ${salesAccount.name} (${salesAccount.id})`);
    } catch (error) {
      console.log(`   ❌ Account creation failed: ${error}`);
    }
    
    // 5. Check database schema
    console.log("\n🗄️  Checking Database Schema:");
    try {
      const accountCount = await prisma.account.count();
      const journalCount = await prisma.journalEntry.count();
      const lineCount = await prisma.journalLine.count();
      
      console.log(`   Accounts: ${accountCount}`);
      console.log(`   Journal Entries: ${journalCount}`);
      console.log(`   Journal Lines: ${lineCount}`);
    } catch (error) {
      console.log(`   ❌ Schema check failed: ${error}`);
    }
    
  } catch (error) {
    console.error("❌ Diagnosis failed:", error);
  }
  
  await prisma.$disconnect();
}

diagnoseJournalIssues().catch(console.error);
