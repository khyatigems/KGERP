import { buildAddColumnStatements, executeDdlBatch, getMissingColumns } from "@/lib/prisma";

let ensured = false;
let pending: Promise<void> | null = null;

export async function ensureInventoryQrPaymentSchema() {
  if (ensured) return;
  if (pending) return pending;
  pending = (async () => {
    await executeDdlBatch([
      `CREATE TABLE IF NOT EXISTS "InventoryQrPaymentAuthorization" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "inventoryId" TEXT NOT NULL,
        "enabled" BOOLEAN NOT NULL DEFAULT false,
        "totalAmount" REAL NOT NULL,
        "amountToCollect" REAL NOT NULL,
        "currency" TEXT NOT NULL DEFAULT 'INR',
        "allowPartial" BOOLEAN NOT NULL DEFAULT false,
        "paidAmount" REAL NOT NULL DEFAULT 0,
        "customerName" TEXT,
        "customerEmail" TEXT,
        "customerPhone" TEXT,
        "orderReference" TEXT,
        "saleId" TEXT,
        "updatedByUserId" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "InventoryQrPaymentAuthorization_inventoryId_key" ON "InventoryQrPaymentAuthorization"("inventoryId")`,
      `CREATE INDEX IF NOT EXISTS "InventoryQrPaymentAuthorization_enabled_idx" ON "InventoryQrPaymentAuthorization"("enabled")`,
      `CREATE TABLE IF NOT EXISTS "InventoryQrPaymentAttempt" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "authorizationId" TEXT NOT NULL,
        "inventoryId" TEXT NOT NULL,
        "amount" REAL NOT NULL,
        "currency" TEXT NOT NULL DEFAULT 'INR',
        "status" TEXT NOT NULL DEFAULT 'CREATING',
        "razorpayOrderId" TEXT,
        "razorpayPaymentId" TEXT,
        "activeKey" TEXT,
        "failureReason" TEXT,
        "customerName" TEXT,
        "customerEmail" TEXT,
        "customerPhone" TEXT,
        "customerRemarks" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "paidAt" DATETIME
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "InventoryQrPaymentAttempt_razorpayOrderId_key" ON "InventoryQrPaymentAttempt"("razorpayOrderId")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "InventoryQrPaymentAttempt_razorpayPaymentId_key" ON "InventoryQrPaymentAttempt"("razorpayPaymentId")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "InventoryQrPaymentAttempt_activeKey_key" ON "InventoryQrPaymentAttempt"("activeKey")`,
      `CREATE INDEX IF NOT EXISTS "InventoryQrPaymentAttempt_authorizationId_status_idx" ON "InventoryQrPaymentAttempt"("authorizationId", "status")`,
      `CREATE INDEX IF NOT EXISTS "InventoryQrPaymentAttempt_inventoryId_createdAt_idx" ON "InventoryQrPaymentAttempt"("inventoryId", "createdAt")`,
    ]);
    const attemptColumns: Array<[string, string, string]> = [
      ["InventoryQrPaymentAttempt", "customerName", '"customerName" TEXT'],
      ["InventoryQrPaymentAttempt", "customerEmail", '"customerEmail" TEXT'],
      ["InventoryQrPaymentAttempt", "customerPhone", '"customerPhone" TEXT'],
      ["InventoryQrPaymentAttempt", "customerRemarks", '"customerRemarks" TEXT'],
    ];
    const missing = await getMissingColumns(attemptColumns.map(([table, column]) => [table, column]));
    await executeDdlBatch(buildAddColumnStatements(attemptColumns, missing));
    ensured = true;
  })().finally(() => { pending = null; });
  return pending;
}
