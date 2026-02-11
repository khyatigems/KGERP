
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient() as unknown as PrismaClient & {
  journalEntry: PrismaClient["journalEntry"];
};

async function main() {
  const salesCount = await prisma.sale.count({
    where: { invoiceId: { not: null } }
  });
  const expenseCount = await prisma.expense.count();
  const journalCount = await prisma.journalEntry.count();

  console.log(`Existing Sales (with Invoice): ${salesCount}`);
  console.log(`Existing Expenses: ${expenseCount}`);
  console.log(`Existing Journal Entries: ${journalCount}`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
