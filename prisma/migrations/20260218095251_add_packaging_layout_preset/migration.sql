-- CreateTable
CREATE TABLE "PackagingLayoutPreset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'MM',
    "pageWidthMm" REAL NOT NULL DEFAULT 210,
    "pageHeightMm" REAL NOT NULL DEFAULT 297,
    "cols" INTEGER NOT NULL DEFAULT 2,
    "rows" INTEGER NOT NULL DEFAULT 5,
    "labelWidthMm" REAL NOT NULL DEFAULT 100,
    "labelHeightMm" REAL NOT NULL DEFAULT 50,
    "marginLeftMm" REAL NOT NULL DEFAULT 4,
    "marginTopMm" REAL NOT NULL DEFAULT 24,
    "gapXmm" REAL NOT NULL DEFAULT 2,
    "gapYmm" REAL NOT NULL DEFAULT 0,
    "offsetXmm" REAL NOT NULL DEFAULT 0,
    "offsetYmm" REAL NOT NULL DEFAULT 0,
    "startPosition" INTEGER NOT NULL DEFAULT 1,
    "selectedFieldsJson" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "PackagingLayoutPreset_name_key" ON "PackagingLayoutPreset"("name");
