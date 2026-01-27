/*
  Warnings:

  - You are about to drop the column `baseAmount` on the `Expense` table. All the data in the column will be lost.
  - You are about to drop the column `gstAmount` on the `Expense` table. All the data in the column will be lost.
  - You are about to drop the column `gstApplicable` on the `Expense` table. All the data in the column will be lost.
  - You are about to drop the column `gstRate` on the `Expense` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "Voucher" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "voucherNumber" TEXT NOT NULL,
    "voucherType" TEXT NOT NULL,
    "voucherDate" DATETIME NOT NULL,
    "referenceId" TEXT,
    "narration" TEXT,
    "amount" REAL NOT NULL,
    "isReversed" BOOLEAN NOT NULL DEFAULT false,
    "reversalReason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expenseDate" DATETIME NOT NULL,
    "categoryId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "vendorName" TEXT,
    "referenceNo" TEXT,
    "totalAmount" REAL NOT NULL,
    "paymentMode" TEXT NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PAID',
    "paidAmount" REAL NOT NULL DEFAULT 0,
    "paymentDate" DATETIME,
    "paymentRef" TEXT,
    "attachmentUrl" TEXT,
    "voucherId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Expense" ("attachmentUrl", "categoryId", "createdAt", "createdById", "description", "expenseDate", "id", "paidAmount", "paymentDate", "paymentMode", "paymentRef", "paymentStatus", "referenceNo", "totalAmount", "updatedAt", "vendorName") SELECT "attachmentUrl", "categoryId", "createdAt", "createdById", "description", "expenseDate", "id", "paidAmount", "paymentDate", "paymentMode", "paymentRef", "paymentStatus", "referenceNo", "totalAmount", "updatedAt", "vendorName" FROM "Expense";
DROP TABLE "Expense";
ALTER TABLE "new_Expense" RENAME TO "Expense";
CREATE UNIQUE INDEX "Expense_voucherId_key" ON "Expense"("voucherId");
CREATE INDEX "Expense_categoryId_idx" ON "Expense"("categoryId");
CREATE INDEX "Expense_createdById_idx" ON "Expense"("createdById");
CREATE INDEX "Expense_expenseDate_idx" ON "Expense"("expenseDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Voucher_voucherNumber_key" ON "Voucher"("voucherNumber");

-- CreateIndex
CREATE INDEX "Voucher_createdById_idx" ON "Voucher"("createdById");

-- CreateIndex
CREATE INDEX "Voucher_voucherNumber_idx" ON "Voucher"("voucherNumber");

-- CreateIndex
CREATE INDEX "Voucher_referenceId_idx" ON "Voucher"("referenceId");

-- CreateIndex
CREATE INDEX "Voucher_voucherDate_idx" ON "Voucher"("voucherDate");
