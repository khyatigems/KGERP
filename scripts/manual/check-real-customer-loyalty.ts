import { config } from "dotenv";

config({ path: ".env.local", override: true });
config({ path: ".env" });

import { ensureBillfreePhase1Schema, prisma } from "../../lib/prisma";

async function main() {
  console.log("Checking real customer data and loyalty points...");
  
  // Check for actual customers with invoices
  const customersWithInvoices = await prisma.$queryRawUnsafe<Array<{
    customerId: string;
    customerName: string;
    invoiceCount: number;
    totalInvoiceAmount: number;
    paidInvoiceCount: number;
    paidInvoiceAmount: number;
  }>>(`
    SELECT 
      c.id as customerId,
      c.name as customerName,
      COUNT(DISTINCT i.id) as invoiceCount,
      COALESCE(SUM(i.totalAmount), 0) as totalInvoiceAmount,
      COUNT(DISTINCT CASE WHEN i.paymentStatus = 'PAID' THEN i.id END) as paidInvoiceCount,
      COALESCE(SUM(CASE WHEN i.paymentStatus = 'PAID' THEN i.totalAmount ELSE 0 END), 0) as paidInvoiceAmount
    FROM Customer c
    LEFT JOIN Sale s ON s.customerId = c.id
    LEFT JOIN Invoice i ON s.invoiceId = i.id
    WHERE c.id IS NOT NULL
    GROUP BY c.id, c.name
    HAVING COUNT(DISTINCT i.id) > 0
    ORDER BY paidInvoiceAmount DESC
  `);

  console.log(`\nFound ${customersWithInvoices.length} customers with invoices:`);
  
  for (const customer of customersWithInvoices) {
    console.log(`\n👤 Customer: ${customer.customerName} (${customer.customerId})`);
    console.log(`   📊 Invoices: ${customer.invoiceCount} total, ${customer.paidInvoiceCount} paid`);
    console.log(`   💰 Amount: ₹${customer.totalInvoiceAmount} total, ₹${customer.paidInvoiceAmount} paid`);
    
    // Check loyalty points for this customer
    const loyaltyData = await prisma.$queryRawUnsafe<Array<{
      totalPoints: number;
      earnedPoints: number;
      redeemedPoints: number;
      profilePoints: number;
    }>>(`
      SELECT 
        COALESCE(SUM(points), 0) as totalPoints,
        COALESCE(SUM(CASE WHEN type = 'EARN' THEN points ELSE 0 END), 0) as earnedPoints,
        COALESCE(SUM(CASE WHEN type = 'REDEEM' THEN points ELSE 0 END), 0) as redeemedPoints,
        COALESCE(SUM(CASE WHEN remarks LIKE '%DOB%' OR remarks LIKE '%anniversary%' THEN points ELSE 0 END), 0) as profilePoints
      FROM "LoyaltyLedger" 
      WHERE customerId = ?
    `, customer.customerId);
    
    const loyalty = loyaltyData[0] || { totalPoints: 0, earnedPoints: 0, redeemedPoints: 0, profilePoints: 0 };
    
    console.log(`   🎯 Loyalty: ${loyalty.totalPoints} total (${loyalty.earnedPoints} earned, ${loyalty.redeemedPoints} redeemed, ${loyalty.profilePoints} profile)`);
    
    // Expected points based on paid invoices
    const expectedPoints = Math.floor(customer.paidInvoiceAmount * 0.01); // 0.01 points per rupee
    const missingPoints = expectedPoints - loyalty.earnedPoints;
    
    if (missingPoints > 0) {
      console.log(`   ⚠️  Missing: ${missingPoints} points expected from purchases`);
    }
    
    // Show recent invoices for this customer
    const recentInvoices = await prisma.$queryRawUnsafe<Array<{
      invoiceNumber: string;
      totalAmount: number;
      paymentStatus: string;
      invoiceDate: string;
    }>>(`
      SELECT i.invoiceNumber, i.totalAmount, i.paymentStatus, i.invoiceDate
      FROM Invoice i
      JOIN Sale s ON s.invoiceId = i.id
      WHERE s.customerId = ?
      ORDER BY i.invoiceDate DESC
      LIMIT 3
    `, customer.customerId);
    
    if (recentInvoices.length > 0) {
      console.log(`   📄 Recent invoices:`);
      recentInvoices.forEach(inv => {
        console.log(`      ${inv.invoiceNumber}: ₹${inv.totalAmount} (${inv.paymentStatus}) on ${inv.invoiceDate}`);
      });
    }
  }
  
  // Check loyalty settings
  const loyaltySettings = await prisma.$queryRawUnsafe<Array<{
    pointsPerRupee: number;
    redeemRupeePerPoint: number;
    minRedeemPoints: number;
    maxRedeemPercent: number;
  }>>(`
    SELECT pointsPerRupee, redeemRupeePerPoint, minRedeemPoints, maxRedeemPercent 
    FROM "LoyaltySettings" 
    WHERE id = 'default'
  `);
  
  console.log(`\n⚙️  Loyalty Settings:`, loyaltySettings[0] || 'Not found');
  
  await prisma.$disconnect();
}

main().catch(console.error);
