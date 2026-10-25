import { execSync } from "node:child_process";

// Keep the ERP's free extension download in step with its connection protocol.
execSync("node extensions/work-tracker/build.mjs", { stdio: "inherit" });

const dbUrl = process.env.DATABASE_URL;
const safeUrl = dbUrl && dbUrl.startsWith("file:") ? dbUrl : "file:./dev.db";
const envForGenerate = {
  ...process.env,
  DATABASE_URL: safeUrl,
};

execSync("npx prisma generate", { stdio: "inherit", env: envForGenerate });
// Skip migrations for build since they're already applied
// execSync("node scripts/migration/turso-safe-deploy.mjs", { stdio: "inherit", env: { ...process.env, ALLOW_BASELINE_ON_NON_EMPTY_DB: "true", RUN_SAFE_MIGRATIONS: "true" } });
execSync("next build", { stdio: "inherit", env: process.env });
