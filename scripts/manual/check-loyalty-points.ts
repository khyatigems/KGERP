import { config } from "dotenv";

config({ path: ".env.local", override: true });
config({ path: ".env" });

import { prisma } from "../../lib/prisma";

async function checkLoyaltyPoints() {
  console.log("🔍 Checking Loyalty Points Entries...\n");
  
  try {
    // Check loyalty settings
    const settings = await prisma.$queryRawUnsafe(`SELECT pointsPerRupee, redeemRupeePerPoint FROM "LoyaltySettings" WHERE id = 'default' LIMIT 1`);
    console.log("📋 Loyalty Settings:", settings);
    
    // Check loyalty ledger entries
    const ledgerEntries = await prisma.$queryRawUnsafe(`SELECT customerId, type, points, rupeeValue, remarks, createdAt FROM "LoyaltyLedger" ORDER BY createdAt DESC LIMIT 10`);
    console.log("\n📊 Recent Loyalty Ledger Entries:", (ledgerEntries as any[]).length);
    (ledgerEntries as any[]).forEach((entry: any, i: number) => {
      console.log(`   ${i+1}. Customer: ${entry.customerId}, Type: ${entry.type}, Points: ${entry.points}, Date: ${entry.createdAt}`);
    });
    
    // Check customer loyalty balances (fixed for decimal points)
    const balances = await prisma.$queryRawUnsafe(`SELECT customerId, CAST(SUM(CAST(points AS REAL)) AS REAL) as totalPoints FROM "LoyaltyLedger" GROUP BY customerId HAVING SUM(CAST(points AS REAL)) != 0 ORDER BY totalPoints DESC LIMIT 5`);
    console.log("\n💰 Customer Loyalty Balances:", (balances as any[]).length);
    (balances as any[]).forEach((balance: any, i: number) => {
      console.log(`   ${i+1}. Customer: ${balance.customerId}, Balance: ${balance.totalPoints} points`);
    });
    
    // Check recent invoices to see if they should have loyalty points
    const recentInvoices = await prisma.$queryRawUnsafe(`SELECT id, invoiceNumber, totalAmount, paymentStatus, invoiceDate FROM "Invoice" WHERE paymentStatus = 'PAID' AND invoiceDate >= datetime('now', '-30 days') ORDER BY invoiceDate DESC LIMIT 5`);
    console.log("\n📄 Recent Paid Invoices (last 30 days):", (recentInvoices as any[]).length);
    (recentInvoices as any[]).forEach((invoice: any, i: number) => {
      console.log(`   ${i+1}. ${invoice.invoiceNumber}, Amount: ₹${invoice.totalAmount}, Status: ${invoice.paymentStatus}`);
    });
    
  } catch (error) {
    console.error("❌ Error checking loyalty points:", error);
  }
  
  await prisma.$disconnect();
}

checkLoyaltyPoints().catch(console.error);
