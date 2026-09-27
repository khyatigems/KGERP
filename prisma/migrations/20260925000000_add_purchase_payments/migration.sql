CREATE TABLE "PurchasePayment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "purchaseId" TEXT NOT NULL,
  "amount" REAL NOT NULL,
  "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "method" TEXT NOT NULL,
  "reference" TEXT,
  "chequeNumber" TEXT,
  "bankName" TEXT,
  "chequePayee" TEXT,
  "chequeDate" DATETIME,
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "PurchasePayment_purchaseId_fkey"
    FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "PurchasePayment_purchaseId_idx" ON "PurchasePayment"("purchaseId");
