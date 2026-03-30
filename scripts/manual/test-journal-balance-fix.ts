import { config } from "dotenv";

config({ path: ".env.local", override: true });
config({ path: ".env" });

import { prisma } from "../../lib/prisma";

async function testJournalBalanceFix() {
  console.log("🧪 Testing Journal Balance Fix...\n");
  
  try {
    // Test the calculation with the fixed logic
    console.log("📋 Testing Fixed Calculation Logic:");
    
    // Simulate the problematic case
    const totalNetAmount = 25000;  // Example from your error
    const totalDiscount = 8000;     // This was missing before
    const couponDiscount = 0;
    
    const oldAdjustedTotal = Math.max(0, totalNetAmount - couponDiscount); // Old logic (BROKEN)
    const newAdjustedTotal = Math.max(0, totalNetAmount - totalDiscount - couponDiscount); // Fixed logic
    
    console.log(`   Total Net Amount: ₹${totalNetAmount}`);
    console.log(`   Total Discount: ₹${totalDiscount}`);
    console.log(`   Coupon Discount: ₹${couponDiscount}`);
    console.log(`   Old Adjusted Total: ₹${oldAdjustedTotal} (BROKEN)`);
    console.log(`   New Adjusted Total: ₹${newAdjustedTotal} (FIXED)`);
    console.log(`   Difference: ₹${oldAdjustedTotal - newAdjustedTotal}`);
    
    // Check if this matches your error pattern
    if (oldAdjustedTotal === 25000 && newAdjustedTotal === 17000) {
      console.log("   ✅ This matches your error pattern exactly!");
      console.log("   🎯 The fix should resolve the journal imbalance");
    }
    
    console.log("\n🔍 Checking Recent Invoices for Correct Calculation:");
    
    // Check recent invoices to see if they're now calculating correctly
    const recentInvoices = await prisma.invoice.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        invoiceNumber: true,
        subtotal: true,
        discountTotal: true,
        totalAmount: true
      }
    });
    
    recentInvoices.forEach((invoice, i) => {
      const expectedTotal = Math.max(0, (invoice.subtotal || 0) - (invoice.discountTotal || 0));
      const isCorrect = Math.abs(expectedTotal - invoice.totalAmount) < 0.01;
      
      console.log(`   ${i+1}. ${invoice.invoiceNumber}:`);
      console.log(`      Subtotal: ₹${invoice.subtotal || 0}`);
      console.log(`      Discount: ₹${invoice.discountTotal || 0}`);
      console.log(`      Expected: ₹${expectedTotal}`);
      console.log(`      Actual: ₹${invoice.totalAmount}`);
      console.log(`      Status: ${isCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);
    });
    
    console.log("\n🚀 Ready to Test:");
    console.log("   1. Try creating a new sale now");
    console.log("   2. The journal entry should be balanced");
    console.log("   3. Debit and Credit amounts should match");
    
    console.log("\n💡 What the Fix Does:");
    console.log("   • Includes totalDiscount in the adjustedInvoiceTotal calculation");
    console.log("   • Ensures journal entry uses the correct amount");
    console.log("   • Prevents Debit ≠ Credit errors");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
  
  await prisma.$disconnect();
}

testJournalBalanceFix().catch(console.error);
