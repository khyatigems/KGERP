import { config } from "dotenv";

config({ path: ".env.local", override: true });
config({ path: ".env" });

import { ensureBillfreePhase1Schema, prisma } from "../../lib/prisma";

async function main() {
  console.log("Checking database for any data...");
  
  // Check for any invoices
  const invoiceCount = await prisma.invoice.count();
  console.log(`Total invoices: ${invoiceCount}`);
  
  // Check for any sales
  const saleCount = await prisma.sale.count();
  console.log(`Total sales: ${saleCount}`);
  
  // Check for any inventory
  const inventoryCount = await prisma.inventory.count();
  console.log(`Total inventory: ${inventoryCount}`);
  
  // Check for any customers
  const customerCount = await prisma.customer.count();
  console.log(`Total customers: ${customerCount}`);
  
  // Check for any journal entries
  const journalCount = await prisma.journalEntry.count();
  console.log(`Total journal entries: ${journalCount}`);
  
  // Check for any vouchers
  const voucherCount = await prisma.voucher.count();
  console.log(`Total vouchers: ${voucherCount}`);
  
  // Check for any loyalty entries
  const loyaltyCount = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
    `SELECT COUNT(*) as count FROM "LoyaltyLedger"`
  );
  console.log(`Total loyalty entries: ${loyaltyCount[0]?.count || 0}`);
  
  // Check loyalty settings
  const loyaltySettings = await prisma.$queryRawUnsafe<Array<{ pointsPerRupee: number }>>(
    `SELECT pointsPerRupee FROM "LoyaltySettings" WHERE id = 'default'`
  );
  console.log(`Loyalty settings points per rupee: ${loyaltySettings[0]?.pointsPerRupee || 'Not found'}`);
  
  // Show sample data if exists
  if (invoiceCount > 0) {
    const sampleInvoice = await prisma.invoice.findFirst({
      select: {
        id: true,
        invoiceNumber: true,
        totalAmount: true,
        paymentStatus: true,
        invoiceDate: true
      }
    });
    console.log('Sample invoice:', sampleInvoice);
  }
  
  if (saleCount > 0) {
    const sampleSale = await prisma.sale.findFirst({
      select: {
        id: true,
        netAmount: true,
        saleDate: true,
        customerName: true
      }
    });
    console.log('Sample sale:', sampleSale);
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
