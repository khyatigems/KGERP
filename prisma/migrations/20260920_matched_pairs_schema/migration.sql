-- Migration: Matched Pairs/Sets Finder
-- Created: 2026-09-20
-- Description: Add InventoryPair, InventorySet, InventorySetItem models and indexes for matched pairs/sets finder
-- Safe for Turso Cloud (SQLite) - no data loss, only additive changes

-- ============================================================
-- Step 1: Create new tables (additive only, no data loss)
-- ============================================================

CREATE TABLE "InventoryPair" (
  "id" TEXT PRIMARY KEY,
  "inventoryIdA" TEXT NOT NULL,
  "inventoryIdB" TEXT NOT NULL,
  "matchType" TEXT NOT NULL DEFAULT 'PAIR',
  "score" INTEGER NOT NULL,
  "matchDetails" TEXT NOT NULL, -- JSON
  "status" TEXT NOT NULL DEFAULT 'SUGGESTED',
  "suggestedPrice" REAL,
  "createdById" TEXT,
  "confirmedById" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmedAt" DATETIME,
  "soldAt" DATETIME,
  FOREIGN KEY ("inventoryIdA") REFERENCES "Inventory"("id") ON DELETE CASCADE,
  FOREIGN KEY ("inventoryIdB") REFERENCES "Inventory"("id") ON DELETE CASCADE,
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL,
  FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL
);

CREATE UNIQUE INDEX "InventoryPair_inventoryIdA_inventoryIdB_key" ON "InventoryPair"("inventoryIdA", "inventoryIdB");
CREATE INDEX "InventoryPair_inventoryIdA_idx" ON "InventoryPair"("inventoryIdA");
CREATE INDEX "InventoryPair_inventoryIdB_idx" ON "InventoryPair"("inventoryIdB");
CREATE INDEX "InventoryPair_status_idx" ON "InventoryPair"("status");
CREATE INDEX "InventoryPair_matchType_idx" ON "InventoryPair"("matchType");
CREATE INDEX "InventoryPair_createdAt_idx" ON "InventoryPair"("createdAt");

CREATE TABLE "InventorySet" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT,
  "matchType" TEXT NOT NULL,
  "itemCount" INTEGER NOT NULL,
  "score" INTEGER NOT NULL,
  "matchDetails" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SUGGESTED',
  "suggestedPrice" REAL,
  "createdById" TEXT,
  "confirmedById" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmedAt" DATETIME,
  "soldAt" DATETIME,
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL,
  FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL
);

CREATE INDEX "InventorySet_status_idx" ON "InventorySet"("status");
CREATE INDEX "InventorySet_matchType_idx" ON "InventorySet"("matchType");
CREATE INDEX "InventorySet_createdAt_idx" ON "InventorySet"("createdAt");

CREATE TABLE "InventorySetItem" (
  "id" TEXT PRIMARY KEY,
  "setId" TEXT NOT NULL,
  "inventoryId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  FOREIGN KEY ("setId") REFERENCES "InventorySet"("id") ON DELETE CASCADE,
  FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "InventorySetItem_setId_position_key" ON "InventorySetItem"("setId", "position");
CREATE INDEX "InventorySetItem_inventoryId_idx" ON "InventorySetItem"("inventoryId");

-- ============================================================
-- Step 2: Add indexes to Inventory table (online, non-blocking)
-- These indexes support the matched pairs/sets matching queries
-- ============================================================

CREATE INDEX "Inventory_status_gemType_color_shape_carats_idx" ON "Inventory"("status", "gemType", "color", "shape", "carats");
CREATE INDEX "Inventory_status_gemType_clarity_cut_carats_idx" ON "Inventory"("status", "gemType", "clarity", "cut", "carats");

-- ============================================================
-- Step 3: Verify migration
-- ============================================================

-- Verify tables exist
SELECT name FROM sqlite_master WHERE type='table' AND name IN ('InventoryPair', 'InventorySet', 'InventorySetItem');

-- Verify indexes exist
SELECT name FROM sqlite_master WHERE type='index' AND name LIKE '%InventoryPair%';
SELECT name FROM sqlite_master WHERE type='index' AND name LIKE '%InventorySet%';
SELECT name FROM sqlite_master WHERE type='index' AND name LIKE '%Inventory_status_gemType%';