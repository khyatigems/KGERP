import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { getDatabaseUrl, parseLibsqlCredentials } from "./libsql-client.mjs";

const destructivePatterns = [
  /\bDROP\s+TABLE\b/i,
  /\bDROP\s+COLUMN\b/i,
  /\bTRUNCATE\b/i,
  /\bDELETE\s+FROM\b/i
];

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
  try {
    const result = await client.execute("SELECT migration_name FROM _prisma_migrations");
    return new Set(result.rows.map((row) => String(row.migration_name)));
  } catch (error) {
    if (isFile) return new Set();
    const base = rawUrl.split("?")[0];
    const safeUrl = base.replace(/^libsql:\/\//, "libsql://").replace(/^https:\/\//, "https://");
    const errorText = error instanceof Error ? error.message : String(error);
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
