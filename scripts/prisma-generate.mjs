import { execSync } from "node:child_process";

const dbUrl = process.env.DATABASE_URL;
const safeUrl = dbUrl && dbUrl.startsWith("file:") ? dbUrl : "file:./dev.db";
const env = {
  ...process.env,
  DATABASE_URL: safeUrl,
};

execSync("npx prisma generate", { stdio: "inherit", env });
