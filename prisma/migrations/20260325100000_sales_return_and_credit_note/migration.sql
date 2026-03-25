CREATE TABLE IF NOT EXISTS "SalesReturn" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "returnNumber" TEXT NOT NULL,
  "returnDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "disposition" TEXT NOT NULL, -- REFUND or REPLACEMENT
  "remarks" TEXT,
  "createdById" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SalesReturn_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "SalesReturn_returnNumber_unique" ON "SalesReturn"("returnNumber");

CREATE TABLE IF NOT EXISTS "SalesReturnItem" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "salesReturnId" TEXT NOT NULL,
  "inventoryId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "sellingPrice" REAL NOT NULL,
  "resaleable" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "SalesReturnItem_salesReturnId_fkey" FOREIGN KEY ("salesReturnId") REFERENCES "SalesReturn" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SalesReturnItem_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "SalesReturnItem_salesReturnId_idx" ON "SalesReturnItem"("salesReturnId");

CREATE TABLE IF NOT EXISTS "CreditNote" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "customerId" TEXT,
  "invoiceId" TEXT,
  "creditNoteNumber" TEXT NOT NULL,
  "issueDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "totalAmount" REAL NOT NULL,
  "balanceAmount" REAL NOT NULL,
  "isActive" INTEGER NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreditNote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "CreditNote_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "CreditNote_creditNoteNumber_unique" ON "CreditNote"("creditNoteNumber");
