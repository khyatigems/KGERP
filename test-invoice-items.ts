import { prisma } from "./lib/prisma";

async function testInvoice() {
  // Check any invoice with items
  const invoice = await prisma.invoice.findFirst({
    include: {
      sales: {
        include: {
          items: {
            include: {
              inventory: true
            }
          }
        }
      }
    }
  });
  
  if (invoice && invoice.sales) {
    console.log('Invoice ID:', invoice.id);
    console.log('Invoice Number:', invoice.invoiceNumber);
    console.log('Items count:', invoice.sales.items.length);
    
    for (const item of invoice.sales.items) {
      console.log('\nItem SKU:', item.inventory.sku);
      console.log('Certificate No:', item.inventory.certificateNo);
      console.log('Certification:', item.inventory.certification);
      console.log('Lab:', item.inventory.lab);
      console.log('Certificate Lab:', item.inventory.certificateLab);
      console.log('Certificate Comments:', item.inventory.certificateComments);
    }
  } else {
    console.log('No invoice with items found');
  }
  
  await prisma.$disconnect();
}

testInvoice().catch(console.error);
