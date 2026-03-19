import { execSync } from "node:child_process";

const resolvedDbUrl = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL;
if (resolvedDbUrl) {
  process.env.DATABASE_URL = resolvedDbUrl;
}

const dbUrl = process.env.DATABASE_URL;
const safeUrl = dbUrl && dbUrl.startsWith("file:") ? dbUrl : "file:./dev.db";
const envForGenerate = {
  ...process.env,
  DATABASE_URL: safeUrl,
};

execSync("npx prisma generate", { stdio: "inherit", env: envForGenerate });
execSync("node scripts/migration/turso-safe-deploy.mjs", { stdio: "inherit", env: process.env });
execSync("next build", { stdio: "inherit", env: process.env });
