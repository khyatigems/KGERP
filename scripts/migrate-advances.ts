import { execSync } from "child_process";

const TURSO_DB_URL = process.env.TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_DB_URL || !TURSO_AUTH_TOKEN) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN");
  process.exit(1);
}

const sql = `
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

CREATE INDEX IF NOT EXISTS "CustomerAdvance_customerId_idx" ON "CustomerAdvance"(customerId);
CREATE INDEX IF NOT EXISTS "CustomerAdvance_remainingAmount_idx" ON "CustomerAdvance"(remainingAmount);

CREATE TABLE IF NOT EXISTS "CustomerAdvanceAdjustment" (
  id TEXT PRIMARY KEY NOT NULL,
  advanceId TEXT NOT NULL,
  saleId TEXT NOT NULL,
  amountUsed REAL NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "CustomerAdvanceAdjustment_advanceId_idx" ON "CustomerAdvanceAdjustment"(advanceId);
CREATE INDEX IF NOT EXISTS "CustomerAdvanceAdjustment_saleId_idx" ON "CustomerAdvanceAdjustment"(saleId);
`;

const runMigration = async () => {
  try {
    const response = await fetch(`${TURSO_DB_URL}/v2/pipeline`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TURSO_AUTH_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: sql.split(";").filter(s => s.trim()).map(s => ({
          type: "execute",
          stmt: { sql: s.trim() }
        }))
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

runMigration();
