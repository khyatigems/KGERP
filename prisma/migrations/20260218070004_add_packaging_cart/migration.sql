-- CreateTable
CREATE TABLE "PackagingCartItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "location" TEXT,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "PackagingCartItem_userId_idx" ON "PackagingCartItem"("userId");

-- CreateIndex
CREATE INDEX "PackagingCartItem_inventoryId_idx" ON "PackagingCartItem"("inventoryId");

-- CreateIndex
CREATE UNIQUE INDEX "PackagingCartItem_userId_inventoryId_key" ON "PackagingCartItem"("userId", "inventoryId");
