import { prisma } from "@/lib/prisma";

const globalForInventoryEnsure = globalThis as unknown as {
  __kgerpEnsuredInventoryColumns?: boolean;
};

let ensuredInventoryColumns = globalForInventoryEnsure.__kgerpEnsuredInventoryColumns ?? false;

export async function ensureInventoryBraceletSchema() {
  if (ensuredInventoryColumns) return;

  try {
    const columns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(`PRAGMA table_info("Inventory")`);
    const columnSet = new Set(columns.map((c) => c.name));

    if (!columnSet.has("bead_size_label")) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Inventory" ADD COLUMN "bead_size_label" TEXT;`);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("duplicate column name") && msg.includes("bead_size_label")) {
      ensuredInventoryColumns = true;
      return;
    }
    console.error("Failed to ensure Inventory bracelet schema", error);
  }

  ensuredInventoryColumns = true;
  globalForInventoryEnsure.__kgerpEnsuredInventoryColumns = true;
}

