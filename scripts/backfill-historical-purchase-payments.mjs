import "dotenv/config";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { getDatabaseUrl, parseLibsqlCredentials } from "./migration/libsql-client.mjs";

const APPLY = process.argv.includes("--apply");
const USE_EXISTING_BACKUP = process.argv.includes("--use-existing-backup");
const THRESHOLD = 10000;

function getClient() {
  const rawUrl = getDatabaseUrl();
  if (rawUrl.startsWith("file:")) {
    throw new Error("This backfill is intended for Turso. Refusing to run against a local SQLite URL.");
  }
  const { url, authToken } = parseLibsqlCredentials(rawUrl);
  return createClient({ url, authToken });
}

function runBackup() {
  if (USE_EXISTING_BACKUP) {
    const backupDir = path.join(process.cwd(), "migration-artifacts", "backups");
    const files = fs.readdirSync(backupDir)
      .filter((file) => file.startsWith("turso-backup-") && file.endsWith(".json"))
      .sort()
      .reverse();
    if (files.length === 0) throw new Error("No existing Turso backup found; refusing to modify live data.");
    console.log(`Using existing Turso backup: ${files[0]}`);
    return;
  }
  const result = spawnSync("node scripts/migration/turso-backup.mjs", {
    env: process.env,
    shell: true,
    encoding: "utf-8",
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error("Backup failed; no purchase payment records were changed.");
  }
}

const db = getClient();
const result = await db.execute(`
  SELECT
    p.id,
    p.invoiceNo,
    p.purchaseDate,
    p.totalAmount,
    p.paymentStatus,
    COUNT(pp.id) AS paymentCount
  FROM Purchase p
  LEFT JOIN PurchasePayment pp ON pp.purchaseId = p.id
  GROUP BY p.id, p.invoiceNo, p.purchaseDate, p.totalAmount, p.paymentStatus
  HAVING COUNT(pp.id) = 0
  ORDER BY p.purchaseDate ASC
`);

const candidates = result.rows.map((row) => {
  const totalAmount = Number(row.totalAmount || 0);
  const method = totalAmount >= THRESHOLD ? "UPI" : "CASH";
  return {
    id: String(row.id),
    invoiceNo: row.invoiceNo ? String(row.invoiceNo) : "(no reference)",
    purchaseDate: String(row.purchaseDate),
    totalAmount,
    oldStatus: row.paymentStatus ? String(row.paymentStatus) : "PENDING",
    method,
  };
});

console.log(`Found ${candidates.length} purchases with zero payment entries.`);
console.log(`Rule: below ₹${THRESHOLD.toLocaleString("en-IN")} = CASH; ₹${THRESHOLD.toLocaleString("en-IN")} or more = UPI.`);
for (const candidate of candidates) {
  console.log(`${candidate.invoiceNo} | ₹${candidate.totalAmount.toLocaleString("en-IN")} | ${candidate.method} | ${candidate.oldStatus} -> PAID`);
}

if (!APPLY) {
  console.log("DRY-RUN ONLY: no live data was changed. Run with --apply after reviewing the list.");
  process.exit(0);
}

if (candidates.length === 0) {
  console.log("No changes needed.");
  process.exit(0);
}

runBackup();

const now = new Date().toISOString();
for (const candidate of candidates) {
  await db.batch([
    {
      sql: `
        INSERT INTO PurchasePayment
          (id, purchaseId, amount, date, method, notes, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        crypto.randomUUID(),
        candidate.id,
        candidate.totalAmount,
        candidate.purchaseDate,
        candidate.method,
        "Historical payment backfill: marked as paid based on purchase total and legacy payment records.",
        now,
        now,
      ],
    },
    {
      sql: `UPDATE Purchase SET paymentStatus = 'PAID', paymentMode = ? WHERE id = ?`,
      args: [candidate.method, candidate.id],
    },
  ]);
}

console.log(`Applied ${candidates.length} historical purchase payment records safely.`);
