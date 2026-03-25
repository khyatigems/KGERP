
import { prisma } from "@/lib/prisma";
import { Prisma, PrismaClient } from "@prisma/client";

// Use a loose type for the transaction client to avoid strict type caching issues
// This ensures compatibility with both the main client and transaction clients
export type PrismaTx = (Prisma.TransactionClient | PrismaClient) & {
  account: PrismaClient["account"];
  journalEntry: PrismaClient["journalEntry"];
  journalLine: PrismaClient["journalLine"];
};

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

const DEFAULT_ACCOUNTS: Array<{ code: string; name: string; type: string; subtype: string }> = [
  { code: "1001", name: "Cash on Hand", type: "ASSET", subtype: "CASH" },
  { code: "1002", name: "Bank HDFC", type: "ASSET", subtype: "BANK" },
  { code: "1003", name: "Bank SBI", type: "ASSET", subtype: "BANK" },
  { code: "1010", name: "Accounts Receivable", type: "ASSET", subtype: "AR" },
  { code: "1020", name: "Inventory Asset", type: "ASSET", subtype: "INVENTORY" },
  { code: "2001", name: "Accounts Payable", type: "LIABILITY", subtype: "AP" },
  { code: "2010", name: "GST Payable", type: "LIABILITY", subtype: "TAX" },
  { code: "2020", name: "Duties & Taxes", type: "LIABILITY", subtype: "TAX" },
  { code: "3001", name: "Capital Account", type: "EQUITY", subtype: "CAPITAL" },
  { code: "3002", name: "Retained Earnings", type: "EQUITY", subtype: "RETAINED_EARNINGS" },
  { code: "4001", name: "Sales Revenue", type: "INCOME", subtype: "REVENUE" },
  { code: "4002", name: "Other Income", type: "INCOME", subtype: "OTHER_INCOME" },
  { code: "5001", name: "Cost of Goods Sold", type: "EXPENSE", subtype: "COGS" },
  { code: "5002", name: "Salary Expense", type: "EXPENSE", subtype: "OPERATING" },
  { code: "5003", name: "Rent Expense", type: "EXPENSE", subtype: "OPERATING" },
  { code: "5004", name: "Electricity Expense", type: "EXPENSE", subtype: "OPERATING" },
  { code: "5005", name: "Office Expenses", type: "EXPENSE", subtype: "OPERATING" }
];

export async function getOrCreateAccountByCode(code: string, tx: PrismaTx = prisma) {
  const existing = await tx.account.findUnique({ where: { code } });
  if (existing) return existing;

  const defaults = DEFAULT_ACCOUNTS.find((a) => a.code === code);
  if (!defaults) {
    throw new Error(`Account code ${code} not found in Chart of Accounts`);
  }

  return tx.account.create({
    data: {
      code: defaults.code,
      name: defaults.name,
      type: defaults.type,
      subtype: defaults.subtype,
      isActive: true
    }
  });
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
    CREDIT_NOTES_APPLIED: "2025",
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
