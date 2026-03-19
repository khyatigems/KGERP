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
  if (!pending.length) {
    process.stdout.write("[safe-deploy] no pending migrations to apply (libsql)\n");
    return;
  }
  const now = new Date().toISOString();
  for (const folder of pending) {
    const filePath = path.join(process.cwd(), "prisma", "migrations", folder, "migration.sql");
    if (!fs.existsSync(filePath)) continue;
    const sql = fs.readFileSync(filePath, "utf-8");
    process.stdout.write(`[safe-deploy] apply migration: ${folder}\n`);
    await client.executeMultiple(sql);
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
  if (process.env.RUN_SAFE_MIGRATIONS !== "true") {
    process.stdout.write("[safe-deploy] skipped (RUN_SAFE_MIGRATIONS is not true)\n");
    if (libsqlClient) {
      await applyLibsqlMigrations(libsqlClient);
    } else {
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
