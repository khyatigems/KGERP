import { prisma } from "./lib/prisma";

async function testCertificate() {
  // Check any inventory item with certificate fields
  const inventory = await prisma.inventory.findFirst({
    where: {
      OR: [
        { certificateNo: { not: null } },
        { certification: { not: null } },
        { certificateComments: { not: null } },
        { certificateLab: { not: null } }
      ]
    }
  });
  
  if (inventory) {
    console.log('Inventory ID:', inventory.id);
    console.log('SKU:', inventory.sku);
    console.log('Certificate No:', inventory.certificateNo);
    console.log('Certification:', inventory.certification);
    console.log('Certificate Comments:', inventory.certificateComments);
    console.log('Certificate Lab:', inventory.certificateLab);
  } else {
    console.log('No inventory with certificate data found');
  }
  
  await prisma.$disconnect();
}

testCertificate().catch(console.error);
