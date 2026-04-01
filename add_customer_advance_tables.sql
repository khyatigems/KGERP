-- Customer Advance Migration for Turso/LibSQL
-- Run this with: turso db shell <db-name> < add_customer_advance_tables.sql

-- Create CustomerAdvance table
CREATE TABLE IF NOT EXISTS "CustomerAdvance" (
  id TEXT PRIMARY KEY NOT NULL,
  customerId TEXT NOT NULL,
  amount REAL NOT NULL,
  paymentMode TEXT NOT NULL DEFAULT 'CASH',
  paymentRef TEXT,
  notes TEXT,
  isAdjusted INTEGER NOT NULL DEFAULT 0,
  adjustedAmount REAL NOT NULL DEFAULT 0,
  remainingAmount REAL NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "CustomerAdvance_customerId_idx" ON "CustomerAdvance"(customerId);
CREATE INDEX IF NOT EXISTS "CustomerAdvance_remainingAmount_idx" ON "CustomerAdvance"(remainingAmount);

-- Create CustomerAdvanceAdjustment table
CREATE TABLE IF NOT EXISTS "CustomerAdvanceAdjustment" (
  id TEXT PRIMARY KEY NOT NULL,
  advanceId TEXT NOT NULL,
  saleId TEXT NOT NULL,
  amountUsed REAL NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "CustomerAdvanceAdjustment_advanceId_idx" ON "CustomerAdvanceAdjustment"(advanceId);
CREATE INDEX IF NOT EXISTS "CustomerAdvanceAdjustment_saleId_idx" ON "CustomerAdvanceAdjustment"(saleId);
