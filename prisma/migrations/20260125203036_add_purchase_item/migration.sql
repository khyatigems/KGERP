-- CreateTable
CREATE TABLE "PurchaseItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "shape" TEXT,
    "dimensions" TEXT,
    "beadSizeMm" REAL,
    "weightValue" REAL NOT NULL,
    "weightUnit" TEXT NOT NULL,
    "quantity" REAL NOT NULL DEFAULT 1,
    "unitCost" REAL NOT NULL,
    "totalCost" REAL NOT NULL,
    "notes" TEXT
);

-- CreateIndex
CREATE INDEX "PurchaseItem_purchaseId_idx" ON "PurchaseItem"("purchaseId");
