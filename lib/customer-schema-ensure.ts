import { prisma } from "@/lib/prisma";

let ensuredCustomerColumns = false;

export async function ensureCustomerSecondaryPhoneSchema() {
  if (ensuredCustomerColumns) return;

  try {
    const columns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(`PRAGMA table_info("Customer")`);
    const columnSet = new Set(columns.map((c) => c.name));

    if (!columnSet.has("phoneSecondary")) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Customer" ADD COLUMN "phoneSecondary" TEXT;`);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("duplicate column name") && msg.includes("phoneSecondary")) {
      ensuredCustomerColumns = true;
      return;
    }
    console.error("Failed to ensure Customer schema", error);
  }

  ensuredCustomerColumns = true;
}

