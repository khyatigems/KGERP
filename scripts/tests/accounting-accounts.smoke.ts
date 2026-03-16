import { prisma } from "@/lib/prisma";
import { getOrCreateAccountByCode, ACCOUNTS } from "@/lib/accounting";

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  const tx = prisma as any;
  const ar = await getOrCreateAccountByCode(ACCOUNTS.ASSETS.ACCOUNTS_RECEIVABLE, tx);
  const sales = await getOrCreateAccountByCode(ACCOUNTS.INCOME.SALES, tx);

  assert(ar.code === "1010", "Accounts receivable code should be 1010");
  assert(sales.code === "4001", "Sales revenue code should be 4001");
  assert(ar.isActive === true, "Accounts receivable should be active");
  assert(sales.isActive === true, "Sales revenue should be active");

  console.log("accounting-accounts.smoke.ts passed");
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
