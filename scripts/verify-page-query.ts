
import 'dotenv/config';
import { prisma } from '../lib/prisma';

async function verifyPageQuery() {
  try {
    console.log("Verifying Inventory Page Query...");
    
    const inventory = await prisma.inventory.findMany({
      take: 1,
      include: {
        media: { take: 1 },
        categoryCode: { select: { name: true, code: true } },
        gemstoneCode: { select: { name: true, code: true } },
        colorCode: { select: { name: true, code: true } },
        cutCode: { select: { name: true, code: true } },
        collectionCode: { select: { name: true } },
        rashis: { select: { name: true } },
      },
    });

    console.log("Query Successful!");
    console.log("Found items:", inventory.length);
    if (inventory.length > 0) {
        console.log("First item rashis:", inventory[0].rashis);
    }
  } catch (e) {
    console.error("Query Failed:", e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyPageQuery();
