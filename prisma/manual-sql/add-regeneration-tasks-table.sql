-- Add regeneration_tasks table for eBay description regeneration tracking
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
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
