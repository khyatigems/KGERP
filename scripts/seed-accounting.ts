
import type { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

// Load env vars
const envPathLocal = path.resolve(process.cwd(), ".env.local");
const envPathDefault = path.resolve(process.cwd(), ".env");
const envVars: Record<string, string> = {};

for (const p of [envPathDefault, envPathLocal]) {
  if (fs.existsSync(p)) {
    const content = fs.readFileSync(p, "utf-8");
    content.split("\n").forEach((line) => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        let value = match[2].trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        const key = match[1].trim();
        envVars[key] = value;
      }
    });
  }
}

for (const [key, value] of Object.entries(envVars)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}

const defaultAccounts = [
  // Assets (1xxx)
  { code: "1001", name: "Cash on Hand", type: "ASSET", subtype: "CASH" },
  { code: "1002", name: "Bank HDFC", type: "ASSET", subtype: "BANK" },
  { code: "1003", name: "Bank SBI", type: "ASSET", subtype: "BANK" },
  { code: "1010", name: "Accounts Receivable", type: "ASSET", subtype: "AR" },
  { code: "1020", name: "Inventory Asset", type: "ASSET", subtype: "INVENTORY" },

  // Liabilities (2xxx)
  { code: "2001", name: "Accounts Payable", type: "LIABILITY", subtype: "AP" },
  { code: "2010", name: "GST Payable", type: "LIABILITY", subtype: "TAX" },
  { code: "2020", name: "Duties & Taxes", type: "LIABILITY", subtype: "TAX" },

  // Equity (3xxx)
  { code: "3001", name: "Capital Account", type: "EQUITY", subtype: "CAPITAL" },
  { code: "3002", name: "Retained Earnings", type: "EQUITY", subtype: "RETAINED_EARNINGS" },

  // Income (4xxx)
  { code: "4001", name: "Sales Revenue", type: "INCOME", subtype: "REVENUE" },
  { code: "4002", name: "Other Income", type: "INCOME", subtype: "OTHER_INCOME" },

  // Expenses (5xxx)
  { code: "5001", name: "Cost of Goods Sold", type: "EXPENSE", subtype: "COGS" },
  { code: "5002", name: "Salary Expense", type: "EXPENSE", subtype: "OPERATING" },
  { code: "5003", name: "Rent Expense", type: "EXPENSE", subtype: "OPERATING" },
  { code: "5004", name: "Electricity Expense", type: "EXPENSE", subtype: "OPERATING" },
  { code: "5005", name: "Office Expenses", type: "EXPENSE", subtype: "OPERATING" },
];

async function main() {
  const { PrismaClient: PrismaClientClass } = await import("@prisma/client");
  const prisma = new PrismaClientClass() as unknown as InstanceType<typeof PrismaClientClass> & {
    account: PrismaClient["account"];
  };
  
  console.log("Seeding Chart of Accounts...");

  try {
    for (const acc of defaultAccounts) {
      await prisma.account.upsert({
      where: { code: acc.code },
      update: {
        name: acc.name,
        type: acc.type,
        subtype: acc.subtype,
      },
      create: {
        code: acc.code,
        name: acc.name,
        type: acc.type,
        subtype: acc.subtype,
        isActive: true,
      },
    });
      console.log(`Synced account: ${acc.code} - ${acc.name}`);
    }

    console.log("Accounting seed completed.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
