
import { prisma } from "./lib/prisma";

async function main() {
  console.log("Checking for orphaned expenses...");
  const expenses = await prisma.expense.findMany({
    include: { category: true }
  });
  
  let orphans = 0;
  expenses.forEach(e => {
    if (!e.category) {
      console.log(`Orphaned expense found: ID ${e.id}, CategoryID ${e.categoryId}`);
      orphans++;
    }
  });
  
  if (orphans === 0) {
    console.log("No orphaned expenses found.");
  } else {
    console.log(`Found ${orphans} orphaned expenses.`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
