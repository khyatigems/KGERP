import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createClient } from "@libsql/client";
import { getDatabaseUrl, parseLibsqlCredentials } from "./libsql-client.mjs";

const destructivePatterns = [
  /\bDROP\s+TABLE\b/i,
  /\bDROP\s+COLUMN\b/i,
  /\bTRUNCATE\b/i,
  /\bDELETE\s+FROM\b/i
];

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

async function getAppliedMigrations() {
  const rawUrl = getDatabaseUrl();
  const isFile = rawUrl.startsWith("file:");
  const envHints = {
    has_DATABASE_URL: !!process.env.DATABASE_URL,
    has_TURSO_DATABASE_URL: !!process.env.TURSO_DATABASE_URL,
    has_TURSO_URL: !!process.env.TURSO_URL,
    has_TURSO_AUTH_TOKEN: !!process.env.TURSO_AUTH_TOKEN,
    has_TURSO_TOKEN: !!process.env.TURSO_TOKEN
  };
  const client = isFile
    ? createClient({ url: rawUrl })
    : (() => {
        const { url, authToken } = parseLibsqlCredentials(rawUrl);
        return createClient({ url, authToken });
      })();
  const folders = (() => {
    const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
    if (!fs.existsSync(migrationsDir)) return [];
    return fs
      .readdirSync(migrationsDir)
      .filter((name) => fs.statSync(path.join(migrationsDir, name)).isDirectory())
      .sort();
  })();
  try {
    const result = await client.execute("SELECT migration_name FROM _prisma_migrations");
    return new Set(result.rows.map((row) => String(row.migration_name)));
  } catch (error) {
    if (isFile) return new Set();
    const base = rawUrl.split("?")[0];
    const safeUrl = base.replace(/^libsql:\/\//, "libsql://").replace(/^https:\/\//, "https://");
    const errorText = error instanceof Error ? error.message : String(error);
    if (errorText.includes("no such table: _prisma_migrations")) {
      const tablesResult = await client.execute(`
        SELECT name FROM sqlite_master
        WHERE type='table'
          AND name NOT LIKE 'sqlite_%'
          AND name != '_prisma_migrations'
        ORDER BY name ASC
      `);
      const tableNames = tablesResult.rows.map((row) => String(row.name));
      if (tableNames.length === 0) {
        return new Set();
      }
      if (process.env.ALLOW_BASELINE_ON_NON_EMPTY_DB !== "true") {
        throw new Error(
          `Detected non-empty DB without _prisma_migrations.\n` +
            `- url: ${safeUrl}\n` +
            `- env: ${JSON.stringify(envHints)}\n` +
            `Set ALLOW_BASELINE_ON_NON_EMPTY_DB=true to baseline safely.`
        );
      }
      process.stdout.write("[guard] baselining existing non-empty DB (missing _prisma_migrations)\n");
      await ensurePrismaMigrationsTable(client);
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
    throw new Error(
      `Unable to read applied migrations from Turso.\n` +
        `- url: ${safeUrl}\n` +
        `- env: ${JSON.stringify(envHints)}\n` +
        `- cause: ${errorText}\n` +
        `Ensure TURSO_DATABASE_URL (or DATABASE_URL) and TURSO_AUTH_TOKEN are set in Vercel Production (Build & Runtime).`
    );
  }
}

async function run() {
  const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
  if (!fs.existsSync(migrationsDir)) return;
  const folders = fs.readdirSync(migrationsDir).filter((name) => fs.statSync(path.join(migrationsDir, name)).isDirectory()).sort();
  const applied = await getAppliedMigrations();
  const risky = [];
  for (const folder of folders) {
    if (applied.has(folder)) continue;
    const filePath = path.join(migrationsDir, folder, "migration.sql");
    if (!fs.existsSync(filePath)) continue;
    const sql = fs.readFileSync(filePath, "utf-8");
    for (const pattern of destructivePatterns) {
      if (pattern.test(sql)) {
        risky.push({ migration: folder, pattern: pattern.toString() });
        break;
      }
    }
  }
  if (!risky.length) {
    process.stdout.write("[guard] no destructive migration patterns detected\n");
    return;
  }
  if (process.env.ALLOW_DESTRUCTIVE_MIGRATION === "true") {
    process.stdout.write("[guard] destructive patterns present but override enabled\n");
    return;
  }
  console.error("[guard] destructive migration patterns detected:");
  for (const item of risky) {
    console.error(`- ${item.migration} (${item.pattern})`);
  }
  console.error("Set ALLOW_DESTRUCTIVE_MIGRATION=true to bypass after manual review.");
  process.exit(1);
}

run();
