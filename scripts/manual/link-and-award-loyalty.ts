import { config } from "dotenv";

config({ path: ".env.local", override: true });
config({ path: ".env" });

import { ensureBillfreePhase1Schema, prisma } from "../../lib/prisma";
import { type PrismaTx } from "../../lib/accounting";

async function main() {
  console.log("Linking sale to invoice and awarding loyalty points...");
  
  // Get the test sale and invoice
  const testSale = await prisma.sale.findFirst({
    where: { customerName: "Test Customer" }
  });
  
  const testInvoice = await prisma.invoice.findFirst({
    where: { invoiceNumber: "INV-2024-0001" }
  });
  
  if (testSale && testInvoice) {
    console.log("Found test data:");
    console.log(`  Sale ID: ${testSale.id}`);
    console.log(`  Invoice ID: ${testInvoice.id}`);
    
    // Link sale to invoice
    await prisma.sale.update({
      where: { id: testSale.id },
      data: { invoiceId: testInvoice.id }
    });
    
    console.log("✅ Linked sale to invoice");
    
    // Now award loyalty points
    const { accrueLoyaltyPoints } = await import("../../lib/loyalty-accrual");
    
    await prisma.$transaction(async (tx) => {
      await accrueLoyaltyPoints({
        tx: tx as PrismaTx,
        customerId: testSale.customerId!,
        invoiceId: testInvoice.id,
        invoiceNumber: testInvoice.invoiceNumber,
        invoiceTotal: testInvoice.totalAmount,
        invoiceDate: testInvoice.invoiceDate || new Date()
      });
    });
    
    console.log("✅ Awarded loyalty points");
    
    // Check the result
    const loyaltyData = await prisma.$queryRawUnsafe<Array<{
      totalPoints: number;
      earnedPoints: number;
      redeemedPoints: number;
    }>>(`
      SELECT 
        COALESCE(SUM(points), 0) as totalPoints,
        COALESCE(SUM(CASE WHEN type = 'EARN' THEN points ELSE 0 END), 0) as earnedPoints,
        COALESCE(SUM(CASE WHEN type = 'REDEEM' THEN points ELSE 0 END), 0) as redeemedPoints
      FROM "LoyaltyLedger" 
      WHERE customerId = ?
    `, testSale.customerId);
    
    const loyalty = loyaltyData[0] || { totalPoints: 0, earnedPoints: 0, redeemedPoints: 0 };
    
    console.log("\n📊 Loyalty Summary:");
    console.log(`  Total Points: ${loyalty.totalPoints}`);
    console.log(`  Earned Points: ${loyalty.earnedPoints}`);
    console.log(`  Redeemed Points: ${loyalty.redeemedPoints}`);
    
    // Expected points
    const expectedPoints = Math.floor(testInvoice.totalAmount * 0.01);
    console.log(`  Expected Points: ${expectedPoints} (₹${testInvoice.totalAmount} × 0.01)`);
    
    if (loyalty.earnedPoints === expectedPoints) {
      console.log("✅ Loyalty points correctly calculated!");
    } else {
      console.log(`⚠️  Points mismatch: expected ${expectedPoints}, got ${loyalty.earnedPoints}`);
    }
  } else {
    console.log("❌ Could not find test data");
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
