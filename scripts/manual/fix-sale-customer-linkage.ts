import { config } from "dotenv";

config({ path: ".env.local", override: true });
config({ path: ".env" });

import { ensureBillfreePhase1Schema, prisma } from "../../lib/prisma";

async function main() {
  console.log("Checking sale-invoice linkage...");
  
  // Check the test sale we created
  const testSale = await prisma.sale.findFirst({
    select: {
      id: true,
      customerId: true,
      customerName: true,
      invoiceId: true,
      netAmount: true,
      paymentStatus: true
    }
  });
  
  if (testSale) {
    console.log("Test Sale:");
    console.log(`  ID: ${testSale.id}`);
    console.log(`  Customer: ${testSale.customerName} (${testSale.customerId})`);
    console.log(`  Invoice ID: ${testSale.invoiceId}`);
    console.log(`  Amount: ₹${testSale.netAmount}`);
    console.log(`  Payment Status: ${testSale.paymentStatus}`);
    
    // Check the corresponding invoice
    if (testSale.invoiceId) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: testSale.invoiceId },
        select: {
          id: true,
          invoiceNumber: true,
          totalAmount: true,
          paymentStatus: true,
          invoiceDate: true
        }
      });
      
      if (invoice) {
        console.log("\nCorresponding Invoice:");
        console.log(`  ID: ${invoice.id}`);
        console.log(`  Number: ${invoice.invoiceNumber}`);
        console.log(`  Amount: ₹${invoice.totalAmount}`);
        console.log(`  Status: ${invoice.paymentStatus}`);
        console.log(`  Date: ${invoice.invoiceDate}`);
        
        // Update sale to link properly to customer
        await prisma.sale.update({
          where: { id: testSale.id },
          data: { customerId: "c30be4f9-fc5f-4235-b8ad-57677f0a342e" }
        });
        
        console.log("\n✅ Updated sale with customer ID");
      }
    }
  }
  
  // Check all sales and their customer linkage
  const salesWithCustomers = await prisma.$queryRawUnsafe<Array<{
    saleId: string;
    customerName: string;
    customerId: string | null;
    invoiceId: string | null;
    invoiceNumber: string | null;
    netAmount: number;
    paymentStatus: string;
  }>>(`
    SELECT 
      s.id as saleId,
      s.customerName,
      s.customerId,
      s.invoiceId,
      i.invoiceNumber,
      s.netAmount,
      s.paymentStatus
    FROM Sale s
    LEFT JOIN Invoice i ON s.invoiceId = i.id
    ORDER BY s.saleDate DESC
  `);
  
  console.log("\n📊 All Sales:");
  salesWithCustomers.forEach(s => {
    console.log(`  ${s.customerName}: ₹${s.netAmount} (${s.paymentStatus}) - Invoice: ${s.invoiceNumber || 'None'} - Customer ID: ${s.customerId || 'NULL'}`);
  });
  
  await prisma.$disconnect();
}

main().catch(console.error);
