import { prisma } from "./lib/prisma";

async function testCertificate() {
  // Check any inventory item - just get first one
  const inventory = await prisma.inventory.findFirst();
  
  if (inventory) {
    console.log('Inventory ID:', inventory.id);
    console.log('SKU:', inventory.sku);
    console.log('Certificate No:', inventory.certificateNo);
    console.log('Certification:', inventory.certification);
    console.log('Lab:', inventory.lab);
    console.log('Certificate Lab:', inventory.certificateLab);
    console.log('Certificate Comments:', inventory.certificateComments);
  } else {
    console.log('No inventory found');
  }
  
  await prisma.$disconnect();
}

testCertificate().catch(console.error);
