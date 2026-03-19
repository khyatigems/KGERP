import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

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

function run() {
  runStep("guard destructive migrations", "node scripts/migration/guard-destructive-migrations.mjs");
  if (process.env.RUN_SAFE_MIGRATIONS !== "true") {
    process.stdout.write("[safe-deploy] skipped (RUN_SAFE_MIGRATIONS is not true)\n");
    runStep("prisma migrate deploy", "npx prisma migrate deploy");
    return;
  }

  runStep("pre-migration backup", "node scripts/migration/turso-backup.mjs");
  runStep("pre-migration validation snapshot", "node scripts/migration/turso-validate.mjs");
  try {
    runStep("apply prisma migrations", "npx prisma migrate deploy");
  } catch (error) {
    maybeBaselineOnP3005(error);
    runStep("apply prisma migrations after baseline", "npx prisma migrate deploy");
  }
  runStep("post-migration validation snapshot", "node scripts/migration/turso-validate.mjs");
}

run();
