import { execSync } from "node:child_process";

execSync("node scripts/safe-migrate.mjs", { stdio: "inherit", env: process.env });

const dbUrl = process.env.DATABASE_URL;
const safeUrl = dbUrl && dbUrl.startsWith("file:") ? dbUrl : "file:./dev.db";
const env = {
  ...process.env,
  DATABASE_URL: safeUrl,
};

execSync("npx prisma generate", { stdio: "inherit", env });
execSync("next build", { stdio: "inherit", env: process.env });
