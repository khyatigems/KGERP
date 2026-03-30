import { prisma } from "./lib/prisma";
import { resolveInventoryCertificateUrl } from "./lib/certificate-url";

async function testCertificate() {
  const inventory = await prisma.inventory.findFirst({
    where: { certificates: { some: {} } },
    include: { certificates: true }
  });
  
  if (inventory) {
    console.log('Inventory ID:', inventory.id);
    console.log('Certificates:', JSON.stringify(inventory.certificates, null, 2));
    console.log('Resolved URL:', resolveInventoryCertificateUrl(inventory));
  } else {
    console.log('No inventory with certificates found');
  }
  
  await prisma.$disconnect();
}

testCertificate().catch(console.error);
