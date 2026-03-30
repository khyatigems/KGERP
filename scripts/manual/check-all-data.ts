import { config } from "dotenv";

config({ path: ".env.local", override: true });
config({ path: ".env" });

import { ensureBillfreePhase1Schema, prisma } from "../../lib/prisma";

async function main() {
  console.log("Checking ALL data in database...");
  
  // Check customers
  const customerCount = await prisma.customer.count();
  console.log(`👥 Total customers: ${customerCount}`);
  
  if (customerCount > 0) {
    const customers = await prisma.customer.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        createdAt: true
      },
      take: 10
    });
    
    console.log("Sample customers:");
    customers.forEach(c => {
      console.log(`  ${c.name} (${c.id}) - ${c.phone} - Created: ${c.createdAt}`);
    });
  }
  
  // Check invoices
  const invoiceCount = await prisma.invoice.count();
  console.log(`\n📄 Total invoices: ${invoiceCount}`);
  
  if (invoiceCount > 0) {
    const invoices = await prisma.invoice.findMany({
      select: {
        id: true,
        invoiceNumber: true,
        totalAmount: true,
        paymentStatus: true,
        invoiceDate: true
      },
      take: 10,
      orderBy: { invoiceDate: 'desc' }
    });
    
    console.log("Sample invoices:");
    invoices.forEach(i => {
      console.log(`  ${i.invoiceNumber}: ₹${i.totalAmount} (${i.paymentStatus}) on ${i.invoiceDate}`);
    });
  }
  
  // Check sales
  const saleCount = await prisma.sale.count();
  console.log(`\n💰 Total sales: ${saleCount}`);
  
  if (saleCount > 0) {
    const sales = await prisma.sale.findMany({
      select: {
        id: true,
        customerName: true,
        customerId: true,
        netAmount: true,
        paymentStatus: true,
        saleDate: true,
        invoiceId: true
      },
      take: 10,
      orderBy: { saleDate: 'desc' }
    });
    
    console.log("Sample sales:");
    sales.forEach(s => {
      console.log(`  ${s.customerName} (${s.customerId}): ₹${s.netAmount} (${s.paymentStatus}) on ${s.saleDate}`);
    });
  }
  
  // Check loyalty ledger
  const loyaltyCount = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
    `SELECT COUNT(*) as count FROM "LoyaltyLedger"`
  );
  console.log(`\n🎯 Total loyalty entries: ${loyaltyCount[0]?.count || 0}`);
  
  if (loyaltyCount[0]?.count > 0) {
    const loyaltyEntries = await prisma.$queryRawUnsafe<Array<{
      customerId: string;
      type: string;
      points: number;
      rupeeValue: number;
      remarks: string;
      createdAt: string;
    }>>(`
      SELECT customerId, type, points, rupeeValue, remarks, createdAt
      FROM "LoyaltyLedger"
      ORDER BY createdAt DESC
      LIMIT 10
    `);
    
    console.log("Recent loyalty entries:");
    loyaltyEntries.forEach(l => {
      console.log(`  ${l.type}: ${l.points} points (₹${l.rupeeValue}) - ${l.remarks} - ${l.createdAt}`);
    });
  }
  
  // Check customer-loyalty summary
  if (customerCount > 0 && loyaltyCount[0]?.count > 0) {
    const customerLoyalty = await prisma.$queryRawUnsafe<Array<{
      customerName: string;
      totalPoints: number;
      earnedPoints: number;
      redeemedPoints: number;
    }>>(`
      SELECT 
        c.name as customerName,
        COALESCE(SUM(ll.points), 0) as totalPoints,
        COALESCE(SUM(CASE WHEN ll.type = 'EARN' THEN ll.points ELSE 0 END), 0) as earnedPoints,
        COALESCE(SUM(CASE WHEN ll.type = 'REDEEM' THEN ll.points ELSE 0 END), 0) as redeemedPoints
      FROM Customer c
      LEFT JOIN "LoyaltyLedger" ll ON c.id = ll.customerId
      WHERE c.id IN (SELECT DISTINCT customerId FROM "LoyaltyLedger")
      GROUP BY c.id, c.name
      ORDER BY totalPoints DESC
    `);
    
    console.log("\n🏆 Customer loyalty summary:");
    customerLoyalty.forEach(cl => {
      console.log(`  ${cl.customerName}: ${cl.totalPoints} total (${cl.earnedPoints} earned, ${cl.redeemedPoints} redeemed)`);
    });
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
