
import { prisma } from "@/lib/prisma";
import { Prisma, PrismaClient } from "@prisma/client";

type PrismaTx = Prisma.TransactionClient | PrismaClient;

export interface JournalLineInput {
  accountId: string; // ID of the account
  debit?: number;
  credit?: number;
  description?: string;
}

export interface JournalEntryInput {
  date: Date;
  description: string;
  referenceType: string;
  referenceId: string;
  lines: JournalLineInput[];
  userId: string;
}

/**
 * Posts a double-entry journal transaction to the ledger.
 * Ensures that total Debits equal total Credits.
 */
export async function postJournalEntry(input: JournalEntryInput, tx: PrismaTx = prisma) {
  // Validate Debits == Credits
  const totalDebit = input.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredit = input.lines.reduce((sum, line) => sum + (line.credit || 0), 0);

  // Floating point tolerance check
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`Journal Entry Unbalanced: Debit ${totalDebit.toFixed(2)} != Credit ${totalCredit.toFixed(2)}`);
  }

  // Create Entry and Lines transactionally
  return await tx.journalEntry.create({
    data: {
      date: input.date,
      description: input.description,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      createdById: input.userId,
      lines: {
        create: input.lines.map(line => ({
          accountId: line.accountId,
          debit: line.debit || 0,
          credit: line.credit || 0,
          description: line.description
        }))
      }
    }
  });
}

/**
 * Helper to retrieve an Account ID by its code (e.g., "1001" for Cash).
 */
export async function getAccountByCode(code: string, tx: PrismaTx = prisma) {
  const account = await tx.account.findUnique({ where: { code } });
  if (!account) throw new Error(`Account code ${code} not found in Chart of Accounts`);
  return account;
}

/**
 * Common account codes for easy reference
 */
export const ACCOUNTS = {
  ASSETS: {
    CASH: "1001",
    BANK_HDFC: "1002",
    BANK_SBI: "1003",
    ACCOUNTS_RECEIVABLE: "1010",
    INVENTORY: "1020",
  },
  LIABILITIES: {
    ACCOUNTS_PAYABLE: "2001",
    GST_PAYABLE: "2010",
    DUTIES_TAXES: "2020",
  },
  INCOME: {
    SALES: "4001",
    OTHER: "4002",
  },
  EXPENSES: {
    COGS: "5001",
    SALARY: "5002",
    RENT: "5003",
    ELECTRICITY: "5004",
    OFFICE: "5005",
  }
};
