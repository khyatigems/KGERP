
import { PrismaClient } from '@prisma/client-custom-v2';

const prisma = new PrismaClient();

async function main() {
  try {
    const tables = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' AND name='PurchaseItem';`;
    console.log('Tables found:', tables);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
