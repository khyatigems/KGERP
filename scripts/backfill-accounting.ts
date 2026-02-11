
import { PrismaClient } from "@prisma/client";
import { postJournalEntry, ACCOUNTS, getAccountByCode } from "../lib/accounting";

const prisma = new PrismaClient() as unknown as PrismaClient & {
  journalEntry: PrismaClient["journalEntry"];
  account: PrismaClient["account"];
};

async function main() {
  console.log("Starting Accounting Backfill...");

  // 1. Backfill Sales
  const sales = await prisma.sale.findMany({
    where: {
      invoiceId: { not: null },
      // Check if already backfilled
    },
    include: {
      invoice: true
    }
  });

  console.log(`Found ${sales.length} sales to check.`);

  // Get Account IDs
  const acAR = await getAccountByCode(ACCOUNTS.ASSETS.ACCOUNTS_RECEIVABLE);
  const acSales = await getAccountByCode(ACCOUNTS.INCOME.SALES);

  // Get a fallback user for creation attribution
  const fallbackUser = await prisma.user.findFirst();
  if (!fallbackUser) {
      throw new Error("No users found in database. Cannot backfill journal entries without a user.");
  }
  const fallbackUserId = fallbackUser.id;

  for (const sale of sales) {
    if (!sale.invoice) continue;

    // Check if JE exists
    const existingJE = await prisma.journalEntry.findFirst({
      where: {
        referenceType: "INVOICE",
        referenceId: sale.invoice.id
      }
    });

    if (existingJE) {
      console.log(`Skipping Sale ${sale.id} (Invoice ${sale.invoice.invoiceNumber}) - JE exists.`);
      continue;
    }

    console.log(`Backfilling Sale ${sale.id} (Invoice ${sale.invoice.invoiceNumber})...`);

    // Use 'totalAmount' from schema
    const amount = sale.invoice.totalAmount || 0;

    if (amount === 0) {
      console.warn(`Invoice ${sale.invoice.invoiceNumber} has 0 total. Skipping.`);
      continue;
    }

    await postJournalEntry({
      date: sale.saleDate || new Date(),
      description: `[Backfill] Invoice #${sale.invoice.invoiceNumber} - ${sale.customerName || "Walk-in"}`,
      referenceType: "INVOICE",
      referenceId: sale.invoice.id,
      userId: fallbackUserId, // Sale doesn't have createdBy, use fallback
      lines: [
        { accountId: acAR.id, debit: amount },
        { accountId: acSales.id, credit: amount }
      ]
    });
  }

  // 2. Backfill Expenses (if any)
  const expenses = await prisma.expense.findMany({
    include: {
      category: true
    }
  });
  
  console.log(`Found ${expenses.length} expenses to check.`);
  
  // Default accounts for expenses
  const acCash = await getAccountByCode(ACCOUNTS.ASSETS.CASH);
  const acBank = await getAccountByCode(ACCOUNTS.ASSETS.BANK_HDFC);
  const acOfficeExp = await getAccountByCode(ACCOUNTS.EXPENSES.OFFICE);

  for (const exp of expenses) {
    // Check if JE exists
    const existingJE = await prisma.journalEntry.findFirst({
      where: {
        referenceType: "EXPENSE",
        referenceId: exp.id
      }
    });

    if (existingJE) {
      console.log(`Skipping Expense ${exp.id} - JE exists.`);
      continue;
    }

    console.log(`Backfilling Expense ${exp.id}...`);

    let debitAccountId = acOfficeExp.id;
    // Try to find matching account for category
    if (exp.category?.code) {
      const acc = await prisma.account.findUnique({ where: { code: exp.category.code } });
      if (acc) debitAccountId = acc.id;
    }

    let creditAccountId = acCash.id;
    if (exp.paymentMode && exp.paymentMode !== "CASH") {
      creditAccountId = acBank.id;
    }

    await postJournalEntry({
      date: exp.expenseDate,
      description: `[Backfill] Expense: ${exp.description}`,
      referenceType: "EXPENSE",
      referenceId: exp.id,
      userId: exp.createdById || fallbackUserId,
      lines: [
        { accountId: debitAccountId, debit: exp.totalAmount },
        { accountId: creditAccountId, credit: exp.totalAmount }
      ]
    });
  }

  console.log("Backfill completed.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
