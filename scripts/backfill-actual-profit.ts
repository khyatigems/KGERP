import { config } from "dotenv";

config({ path: ".env.local", override: true });
config({ path: ".env" });

import { prisma } from "../lib/prisma";

async function main() {
  console.log("Backfilling Sale.actualProfit from legacy profit where missing...");
  const result = await prisma.$executeRawUnsafe(
    `UPDATE "Sale" SET "actualProfit" = "profit" WHERE "actualProfit" IS NULL AND "profit" IS NOT NULL`
  );
  console.log(`Updated ${result} sale rows.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
