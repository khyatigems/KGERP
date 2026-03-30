import { prisma } from "./lib/prisma";

async function testInvoice() {
  // Check any sale with inventory items
  const sale = await prisma.sale.findFirst({
    include: {
      inventory: true,
      invoice: true
    }
  });
  
  if (sale) {
    console.log('Sale ID:', sale.id);
    console.log('Invoice Number:', sale.invoice?.invoiceNumber);
    console.log('Inventory SKU:', sale.inventory.sku);
    console.log('Certificate No:', sale.inventory.certificateNo);
    console.log('Certification:', sale.inventory.certification);
    console.log('Lab:', sale.inventory.lab);
    console.log('Certificate Lab:', sale.inventory.certificateLab);
    console.log('Certificate Comments:', sale.inventory.certificateComments);
  } else {
    console.log('No sale found');
  }
  
  await prisma.$disconnect();
}

testInvoice().catch(console.error);
