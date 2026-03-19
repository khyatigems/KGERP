import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { getDatabaseUrl, parseLibsqlCredentials } from "./libsql-client.mjs";

function runStep(label, command) {
  process.stdout.write(`[safe-deploy] ${label}\n`);
  const result = spawnSync(command, { env: process.env, encoding: "utf-8", shell: true });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    const combined = `${result.stdout || ""}\n${result.stderr || ""}`;
    const error = new Error(`Step failed: ${label}`);
    Object.assign(error, { output: combined, code: result.status });
    throw error;
  }
}

function listMigrationFolders() {
  const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
  if (!fs.existsSync(migrationsDir)) return [];
  return fs
    .readdirSync(migrationsDir)
    .filter((name) => fs.statSync(path.join(migrationsDir, name)).isDirectory())
    .sort();
}

function maybeBaselineOnP3005(error) {
  const output = String(error?.output || "");
  if (!output.includes("P3005")) throw error;
  if (process.env.ALLOW_BASELINE_ON_NON_EMPTY_DB !== "true") {
    throw new Error("Detected P3005 (non-empty DB). Set ALLOW_BASELINE_ON_NON_EMPTY_DB=true to baseline safely after review.");
  }
  process.stdout.write("[safe-deploy] baselining existing non-empty DB\n");
  const folders = listMigrationFolders();
  for (const folder of folders) {
    runStep(`mark migration applied: ${folder}`, `npx prisma migrate resolve --applied ${folder}`);
  }
}

function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function splitSqlStatements(sql) {
  return String(sql)
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function isIgnorableSqlError(errorText) {
  return (
    errorText.includes("already exists") ||
    errorText.includes("duplicate column name") ||
    errorText.includes("UNIQUE constraint failed") ||
    errorText.includes("index") && errorText.includes("already exists")
  );
}

function isDestructiveSql(statement) {
  const s = String(statement);
  return /\bDROP\s+TABLE\b/i.test(s) || /\bDROP\s+COLUMN\b/i.test(s) || /\bTRUNCATE\b/i.test(s) || /\bDELETE\s+FROM\b/i.test(s);
}

async function ensureColumn(client, table, column, ddl) {
  const rows = await client.execute(`PRAGMA table_info("${table}")`);
  const existing = new Set(rows.rows.map((r) => String(r.name)));
  if (existing.has(column)) return;
  await client.execute(`ALTER TABLE "${table}" ADD COLUMN ${ddl}`);
}

async function ensureTable(client, createSql) {
  await client.executeMultiple(createSql);
}

async function ensureRuntimeSchema(client) {
  await ensureColumn(client, "Inventory", "hideFromAttention", `"hideFromAttention" INTEGER NOT NULL DEFAULT 0`);
  await client.execute(`UPDATE "Inventory" SET "category"='UNKNOWN' WHERE "category" IS NULL`);
  await ensureColumn(client, "Invoice", "invoiceDate", `"invoiceDate" DATETIME`);

  await ensureTable(
    client,
    `
    CREATE TABLE IF NOT EXISTS "AnalyticsDailySnapshot" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "snapshotDate" DATETIME NOT NULL,
      "inventoryCount" INTEGER NOT NULL,
      "inventoryValueCost" REAL NOT NULL,
      "inventoryValueSell" REAL NOT NULL,
      "salesCount" INTEGER NOT NULL,
      "salesRevenue" REAL NOT NULL,
      "profitAmount" REAL NOT NULL,
      "invoiceCount" INTEGER NOT NULL,
      "pendingInvoices" INTEGER NOT NULL,
      "paymentReceived" REAL NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "AnalyticsDailySnapshot_snapshotDate_key" ON "AnalyticsDailySnapshot"("snapshotDate");
    CREATE INDEX IF NOT EXISTS "AnalyticsDailySnapshot_snapshotDate_idx" ON "AnalyticsDailySnapshot"("snapshotDate");
  `
  );

  await ensureTable(
    client,
    `
    CREATE TABLE IF NOT EXISTS "AnalyticsInventorySnapshot" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "inventoryId" TEXT NOT NULL,
      "sku" TEXT NOT NULL,
      "itemName" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "vendorName" TEXT NOT NULL,
      "purchaseCost" REAL NOT NULL,
      "sellingPrice" REAL NOT NULL,
      "daysInStock" INTEGER NOT NULL,
      "status" TEXT NOT NULL,
      "ageBucket" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "AnalyticsInventorySnapshot_inventoryId_key" ON "AnalyticsInventorySnapshot"("inventoryId");
    CREATE INDEX IF NOT EXISTS "AnalyticsInventorySnapshot_category_idx" ON "AnalyticsInventorySnapshot"("category");
    CREATE INDEX IF NOT EXISTS "AnalyticsInventorySnapshot_vendorName_idx" ON "AnalyticsInventorySnapshot"("vendorName");
    CREATE INDEX IF NOT EXISTS "AnalyticsInventorySnapshot_status_idx" ON "AnalyticsInventorySnapshot"("status");
    CREATE INDEX IF NOT EXISTS "AnalyticsInventorySnapshot_daysInStock_idx" ON "AnalyticsInventorySnapshot"("daysInStock");
    CREATE INDEX IF NOT EXISTS "AnalyticsInventorySnapshot_ageBucket_idx" ON "AnalyticsInventorySnapshot"("ageBucket");
  `
  );

  await ensureTable(
    client,
    `
    CREATE TABLE IF NOT EXISTS "AnalyticsVendorSnapshot" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "vendorId" TEXT NOT NULL,
      "snapshotDate" DATETIME NOT NULL,
      "vendorName" TEXT NOT NULL,
      "totalItemsSupplied" INTEGER NOT NULL,
      "totalPurchaseValue" REAL NOT NULL,
      "inventoryInStock" INTEGER NOT NULL,
      "inventoryValue" REAL NOT NULL,
      "lastPurchaseDate" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "AnalyticsVendorSnapshot_vendorId_snapshotDate_key" ON "AnalyticsVendorSnapshot"("vendorId","snapshotDate");
    CREATE INDEX IF NOT EXISTS "AnalyticsVendorSnapshot_vendorId_idx" ON "AnalyticsVendorSnapshot"("vendorId");
    CREATE INDEX IF NOT EXISTS "AnalyticsVendorSnapshot_snapshotDate_idx" ON "AnalyticsVendorSnapshot"("snapshotDate");
  `
  );

  await ensureTable(
    client,
    `
    CREATE TABLE IF NOT EXISTS "AnalyticsSalesSnapshot" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "saleId" TEXT NOT NULL,
      "sku" TEXT NOT NULL,
      "itemName" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "purchaseCost" REAL NOT NULL,
      "sellingPrice" REAL NOT NULL,
      "profitAmount" REAL NOT NULL,
      "saleDate" DATETIME NOT NULL,
      "saleCycleDays" INTEGER NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "AnalyticsSalesSnapshot_saleId_key" ON "AnalyticsSalesSnapshot"("saleId");
    CREATE INDEX IF NOT EXISTS "AnalyticsSalesSnapshot_saleDate_idx" ON "AnalyticsSalesSnapshot"("saleDate");
    CREATE INDEX IF NOT EXISTS "AnalyticsSalesSnapshot_category_idx" ON "AnalyticsSalesSnapshot"("category");
    CREATE INDEX IF NOT EXISTS "AnalyticsSalesSnapshot_saleCycleDays_idx" ON "AnalyticsSalesSnapshot"("saleCycleDays");
  `
  );

  await ensureTable(
    client,
    `
    CREATE TABLE IF NOT EXISTS "AnalyticsLabelSnapshot" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "jobId" TEXT NOT NULL,
      "printedBy" TEXT NOT NULL,
      "labelsPrinted" INTEGER NOT NULL,
      "printedAt" DATETIME NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "AnalyticsLabelSnapshot_jobId_idx" ON "AnalyticsLabelSnapshot"("jobId");
    CREATE INDEX IF NOT EXISTS "AnalyticsLabelSnapshot_printedBy_idx" ON "AnalyticsLabelSnapshot"("printedBy");
    CREATE INDEX IF NOT EXISTS "AnalyticsLabelSnapshot_printedAt_idx" ON "AnalyticsLabelSnapshot"("printedAt");
  `
  );
}

async function ensurePrismaMigrationsTable(client) {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "checksum" TEXT NOT NULL,
      "finished_at" DATETIME,
      "migration_name" TEXT NOT NULL,
      "logs" TEXT,
      "rolled_back_at" DATETIME,
      "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    );
  `);
}

async function getExistingTables(client) {
  const result = await client.execute(`
    SELECT name FROM sqlite_master
    WHERE type='table'
      AND name NOT LIKE 'sqlite_%'
    ORDER BY name ASC
  `);
  return new Set(result.rows.map((row) => String(row.name)));
}

async function executeMigrationSqlSafely(client, sql, { skipDestructive }) {
  const statements = splitSqlStatements(sql);
  for (const stmt of statements) {
    if (isDestructiveSql(stmt)) {
      if (skipDestructive) continue;
      if (process.env.ALLOW_DESTRUCTIVE_MIGRATION === "true") {
        await client.execute(stmt);
        continue;
      }
      throw new Error("Destructive migration SQL detected. Set ALLOW_DESTRUCTIVE_MIGRATION=true to bypass after manual review.");
    }
    try {
      await client.execute(stmt);
    } catch (error) {
      const errorText = error instanceof Error ? error.message : String(error);
      if (isIgnorableSqlError(errorText)) continue;
      throw error;
    }
  }
}

function createLibsqlClientOrNull(rawUrl) {
  if (!rawUrl || rawUrl.startsWith("file:")) return null;
  const { url, authToken } = parseLibsqlCredentials(rawUrl);
  return createClient({ url, authToken });
}

async function getAppliedLibsqlMigrations(client) {
  try {
    const result = await client.execute("SELECT migration_name FROM _prisma_migrations");
    return new Set(result.rows.map((row) => String(row.migration_name)));
  } catch (error) {
    const errorText = error instanceof Error ? error.message : String(error);
    if (!errorText.includes("no such table: _prisma_migrations")) throw error;

    const tablesResult = await client.execute(`
      SELECT name FROM sqlite_master
      WHERE type='table'
        AND name NOT LIKE 'sqlite_%'
        AND name != '_prisma_migrations'
      ORDER BY name ASC
    `);
    const tableNames = tablesResult.rows.map((row) => String(row.name));
    if (tableNames.length === 0) {
      await ensurePrismaMigrationsTable(client);
      return new Set();
    }
    if (process.env.ALLOW_BASELINE_ON_NON_EMPTY_DB !== "true") {
      throw new Error("Detected non-empty DB without _prisma_migrations. Set ALLOW_BASELINE_ON_NON_EMPTY_DB=true to baseline safely after review.");
    }
    process.stdout.write("[safe-deploy] baselining existing non-empty DB (missing _prisma_migrations)\n");
    await ensurePrismaMigrationsTable(client);
    const folders = listMigrationFolders();
    const now = new Date().toISOString();
    for (const folder of folders) {
      const filePath = path.join(process.cwd(), "prisma", "migrations", folder, "migration.sql");
      const sql = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8") : "";
      const checksum = sha256(sql);
      await client.execute(
        `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
         VALUES (?, ?, ?, ?, NULL, NULL, ?, 1)`,
        [crypto.randomUUID(), checksum, now, folder, now]
      );
    }
    return new Set(folders);
  }
}

async function applyLibsqlMigrations(client) {
  const folders = listMigrationFolders();
  const applied = await getAppliedLibsqlMigrations(client);
  const pending = folders.filter((folder) => !applied.has(folder));
  const existingTables = await getExistingTables(client);
  const requiredTableMissing = !existingTables.has("AnalyticsDailySnapshot");
  if (!pending.length && !requiredTableMissing) {
    process.stdout.write("[safe-deploy] no pending migrations to apply (libsql)\n");
    return;
  }
  if (!pending.length && requiredTableMissing) {
    process.stdout.write("[safe-deploy] schema repair: missing AnalyticsDailySnapshot, applying non-destructive statements\n");
    const repairSet = new Set(folders);
    const now = new Date().toISOString();
    await ensurePrismaMigrationsTable(client);
    const existingApplied = applied;
    for (const folder of repairSet) {
      const filePath = path.join(process.cwd(), "prisma", "migrations", folder, "migration.sql");
      if (!fs.existsSync(filePath)) continue;
      const sql = fs.readFileSync(filePath, "utf-8");
      await executeMigrationSqlSafely(client, sql, { skipDestructive: true });
      if (!existingApplied.has(folder)) {
        await client.execute(
          `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
           VALUES (?, ?, ?, ?, NULL, NULL, ?, 1)`,
          [crypto.randomUUID(), sha256(sql), now, folder, now]
        );
      }
    }
    return;
  }
  const now = new Date().toISOString();
  for (const folder of pending) {
    const filePath = path.join(process.cwd(), "prisma", "migrations", folder, "migration.sql");
    if (!fs.existsSync(filePath)) continue;
    const sql = fs.readFileSync(filePath, "utf-8");
    process.stdout.write(`[safe-deploy] apply migration: ${folder}\n`);
    await executeMigrationSqlSafely(client, sql, { skipDestructive: false });
    await ensurePrismaMigrationsTable(client);
    await client.execute(
      `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
       VALUES (?, ?, ?, ?, NULL, NULL, ?, 1)`,
      [crypto.randomUUID(), sha256(sql), now, folder, now]
    );
  }
}

async function run() {
  runStep("guard destructive migrations", "node scripts/migration/guard-destructive-migrations.mjs");
  const rawUrl = getDatabaseUrl();
  const libsqlClient = createLibsqlClientOrNull(rawUrl);
  if (libsqlClient) {
    process.stdout.write("[safe-deploy] ensure runtime schema (libsql)\n");
    await ensureRuntimeSchema(libsqlClient);
  }
  if (process.env.RUN_SAFE_MIGRATIONS !== "true") {
    process.stdout.write("[safe-deploy] skipped (RUN_SAFE_MIGRATIONS is not true)\n");
    if (!libsqlClient) {
      runStep("prisma migrate deploy", "npx prisma migrate deploy");
    }
    return;
  }

  runStep("pre-migration backup", "node scripts/migration/turso-backup.mjs");
  runStep("pre-migration validation snapshot", "node scripts/migration/turso-validate.mjs");
  try {
    if (libsqlClient) {
      await applyLibsqlMigrations(libsqlClient);
    } else {
      runStep("apply prisma migrations", "npx prisma migrate deploy");
    }
  } catch (error) {
    if (libsqlClient) throw error;
    maybeBaselineOnP3005(error);
    runStep("apply prisma migrations after baseline", "npx prisma migrate deploy");
  }
  runStep("post-migration validation snapshot", "node scripts/migration/turso-validate.mjs");
}

run().catch((error) => {
  const combined = String(error?.output || "");
  if (combined) process.stderr.write(combined);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
