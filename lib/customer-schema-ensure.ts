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
    if (!columnSet.has("customerType")) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Customer" ADD COLUMN "customerType" TEXT DEFAULT 'Retail';`);
    }
    if (!columnSet.has("assignedSalesperson")) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Customer" ADD COLUMN "assignedSalesperson" TEXT;`);
    }
    if (!columnSet.has("interestedIn")) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Customer" ADD COLUMN "interestedIn" TEXT;`);
    }
    if (!columnSet.has("budgetRange")) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Customer" ADD COLUMN "budgetRange" TEXT;`);
    }
    if (!columnSet.has("whatsappNumber")) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Customer" ADD COLUMN "whatsappNumber" TEXT;`);
    }
    if (!columnSet.has("preferredContact")) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Customer" ADD COLUMN "preferredContact" TEXT;`);
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

