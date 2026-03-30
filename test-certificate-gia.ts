import { prisma } from "./lib/prisma";

async function testCertificate() {
  // Check any inventory item with certificate fields
  const inventory = await prisma.inventory.findFirst({
    where: {
      OR: [
        { certificateNo: { contains: 'GIA' } },
        { certification: { contains: 'GIA' } },
        { lab: { contains: 'GIA' } },
        { certificateLab: { contains: 'GIA' } }
      ]
    }
  });
  
  if (inventory) {
    console.log('Inventory ID:', inventory.id);
    console.log('SKU:', inventory.sku);
    console.log('Certificate No:', inventory.certificateNo);
    console.log('Certification:', inventory.certification);
    console.log('Lab:', inventory.lab);
    console.log('Certificate Lab:', inventory.certificateLab);
    console.log('Certificate Comments:', inventory.certificateComments);
  } else {
    console.log('No inventory with GIA certificate data found');
  }
  
  await prisma.$disconnect();
}

testCertificate().catch(console.error);
