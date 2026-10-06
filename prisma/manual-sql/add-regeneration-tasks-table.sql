-- Add regeneration_tasks table for eBay description regeneration tracking
-- Note: databases created before the "selected items" feature lack the
-- selectedItemIds/selectionMode columns. SQLite has no ADD COLUMN IF NOT
-- EXISTS, so those are added conditionally by scripts/migrate-regeneration-tasks.mjs
-- and at runtime by app/api/inventory/regenerate-ebay/route.ts (ensureRegenerationTasksSchema).
CREATE TABLE IF NOT EXISTS regeneration_tasks (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'PENDING',
  total INTEGER NOT NULL DEFAULT 0,
  updated INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  pending INTEGER NOT NULL DEFAULT 0,
  errors TEXT NOT NULL DEFAULT '[]',
  startTime INTEGER NOT NULL,
  endTime INTEGER,
  message TEXT,
  selectedItemIds TEXT,
  selectionMode TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
