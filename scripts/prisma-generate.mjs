import { execSync } from "node:child_process";

const normalizeUrl = (url) => {
  if (!url) return url;
  if (url.startsWith("https://")) {
    return url.replace(/^https:\/\//, "libsql://");
  }
  return url;
};

const env = {
  ...process.env,
  DATABASE_URL: normalizeUrl(process.env.DATABASE_URL),
};

execSync("npx prisma generate", { stdio: "inherit", env });
