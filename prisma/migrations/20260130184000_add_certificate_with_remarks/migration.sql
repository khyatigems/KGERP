-- CreateTable
CREATE TABLE "CertificateCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "remarks" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "_CertificateCodeToInventory" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "CertificateCode_name_key" ON "CertificateCode"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CertificateCode_code_key" ON "CertificateCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "_CertificateCodeToInventory_AB_unique" ON "_CertificateCodeToInventory"("A", "B");

-- CreateIndex
CREATE INDEX "_CertificateCodeToInventory_B_index" ON "_CertificateCodeToInventory"("B");
