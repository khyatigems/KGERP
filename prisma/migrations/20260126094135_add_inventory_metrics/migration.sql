-- CreateTable
CREATE TABLE "InventoryMetrics" (
    "inventoryId" TEXT NOT NULL PRIMARY KEY,
    "daysInStock" INTEGER NOT NULL,
    "memoDays" INTEGER,
    "lastUpdated" DATETIME NOT NULL
);
