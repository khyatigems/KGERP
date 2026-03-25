-- Unique index on Customer.phone (ignore NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS "Customer_phone_unique" ON "Customer"("phone") WHERE "phone" IS NOT NULL;

-- Follow-up history table
CREATE TABLE IF NOT EXISTS "FollowUp" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "invoiceId" TEXT NOT NULL,
  "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "action" TEXT,
  "note" TEXT,
  "promisedDate" DATETIME,
  "createdBy" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FollowUp_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "FollowUp_invoiceId_idx" ON "FollowUp"("invoiceId");
