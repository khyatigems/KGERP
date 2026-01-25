-- AlterTable
ALTER TABLE "CompanySettings" ADD COLUMN "otherDocsLogoUrl" TEXT;
ALTER TABLE "CompanySettings" ADD COLUMN "skuViewLogoUrl" TEXT;

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "recordedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNumber" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "quotationId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "dueDate" DATETIME,
    "notes" TEXT,
    "subtotal" REAL NOT NULL,
    "taxTotal" REAL NOT NULL,
    "discountTotal" REAL NOT NULL,
    "totalAmount" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "paidAmount" REAL NOT NULL DEFAULT 0
);
INSERT INTO "new_Invoice" ("createdAt", "discountTotal", "dueDate", "id", "invoiceNumber", "isActive", "notes", "quotationId", "status", "subtotal", "taxTotal", "token", "totalAmount", "updatedAt") SELECT "createdAt", "discountTotal", "dueDate", "id", "invoiceNumber", "isActive", "notes", "quotationId", "status", "subtotal", "taxTotal", "token", "totalAmount", "updatedAt" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
CREATE UNIQUE INDEX "Invoice_token_key" ON "Invoice"("token");
CREATE INDEX "Invoice_quotationId_idx" ON "Invoice"("quotationId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");
