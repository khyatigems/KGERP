import { prisma } from "@/lib/prisma";

const globalForReturnsEnsure = globalThis as unknown as {
  __kgerpEnsuredReturnsSchema?: boolean;
};

let ensured = globalForReturnsEnsure.__kgerpEnsuredReturnsSchema ?? false;

export async function ensureReturnsSchema() {
  if (ensured) return;
  try {
    const tables = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
      `SELECT name FROM sqlite_master WHERE type='table'`
    );
    const set = new Set((tables || []).map((t) => t.name));

    if (!set.has("SalesReturn")) {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "SalesReturn" (
          "id" TEXT PRIMARY KEY NOT NULL,
          "invoiceId" TEXT NOT NULL,
          "returnNumber" TEXT NOT NULL,
          "returnDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "disposition" TEXT NOT NULL,
          "taxableAmount" REAL NOT NULL DEFAULT 0,
          "igst" REAL NOT NULL DEFAULT 0,
          "cgst" REAL NOT NULL DEFAULT 0,
          "sgst" REAL NOT NULL DEFAULT 0,
          "totalTax" REAL NOT NULL DEFAULT 0,
          "totalAmount" REAL NOT NULL DEFAULT 0,
          "remarks" TEXT,
          "createdById" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }
    if (!set.has("SalesReturnItem")) {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "SalesReturnItem" (
          "id" TEXT PRIMARY KEY NOT NULL,
          "salesReturnId" TEXT NOT NULL,
          "inventoryId" TEXT NOT NULL,
          "quantity" INTEGER NOT NULL DEFAULT 1,
          "sellingPrice" REAL NOT NULL,
          "resaleable" INTEGER NOT NULL DEFAULT 1
        );
      `);
    }
    if (!set.has("CreditNote")) {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "CreditNote" (
          "id" TEXT PRIMARY KEY NOT NULL,
          "customerId" TEXT,
          "invoiceId" TEXT,
          "creditNoteNumber" TEXT NOT NULL,
          "issueDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "activeUntil" DATETIME,
          "totalAmount" REAL NOT NULL,
          "taxableAmount" REAL NOT NULL DEFAULT 0,
          "igst" REAL NOT NULL DEFAULT 0,
          "cgst" REAL NOT NULL DEFAULT 0,
          "sgst" REAL NOT NULL DEFAULT 0,
          "totalTax" REAL NOT NULL DEFAULT 0,
          "balanceAmount" REAL NOT NULL,
          "isActive" INTEGER NOT NULL DEFAULT 1,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }

    try {
      const cols = await prisma.$queryRawUnsafe<Array<{ name: string }>>(`PRAGMA table_info("CreditNote")`);
      const colSet = new Set((cols || []).map((c) => c.name));
      if (!colSet.has("activeUntil")) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "CreditNote" ADD COLUMN "activeUntil" DATETIME`);
      }
      await prisma.$executeRawUnsafe(
        `UPDATE "CreditNote" SET "activeUntil" = datetime("issueDate", '+90 day') WHERE "activeUntil" IS NULL`
      );
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "CreditNote_creditNoteNumber_key" ON "CreditNote"("creditNoteNumber")`);
    } catch {}

    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "CustomerCode" (
          "id" TEXT PRIMARY KEY NOT NULL,
          "customerId" TEXT NOT NULL,
          "code" TEXT NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "CustomerCode_code_key" ON "CustomerCode"("code")`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CustomerCode_customerId_idx" ON "CustomerCode"("customerId")`);
    } catch {}

    try {
      const idx = await prisma.$queryRawUnsafe<Array<{ name: string; unique: number }>>(`PRAGMA index_list("Sale")`);
      for (const r of idx || []) {
        if (!r?.name || Number(r.unique || 0) !== 1) continue;
        const cols = await prisma.$queryRawUnsafe<Array<{ name: string }>>(`PRAGMA index_info("${r.name.replaceAll('"', '""')}")`);
        const names = new Set((cols || []).map((c) => c.name));
        if (names.has("inventoryId")) {
          await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "${r.name.replaceAll('"', '""')}"`);
        }
      }
    } catch {}
  } catch {
    // ignore
  }
  ensured = true;
  globalForReturnsEnsure.__kgerpEnsuredReturnsSchema = true;
}
