import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";

const rawUrl = process.env.DATABASE_URL || "";
const isFile = rawUrl.startsWith("file:");
const isLibsql = rawUrl.startsWith("libsql:") || rawUrl.startsWith("https:");

if (isFile) {
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
  execSync("npx prisma generate", { stdio: "inherit" });
  process.exit(0);
}

if (!isLibsql) {
  console.error("DATABASE_URL must be file:, libsql:, or https://");
  process.exit(1);
}

const normalizedUrl = rawUrl.startsWith("https://") ? rawUrl.replace(/^https:\/\//, "libsql://") : rawUrl;
const clientUrl = normalizedUrl.split("?")[0];
const authToken = new URLSearchParams(normalizedUrl.split("?")[1] || "").get("authToken") || undefined;

const client = createClient({
  url: clientUrl,
  authToken,
});

const run = async () => {
  const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
  const folders = fs.existsSync(migrationsDir)
    ? fs.readdirSync(migrationsDir).filter((name) => fs.statSync(path.join(migrationsDir, name)).isDirectory())
    : [];

  const sorted = folders.sort();

  for (const folder of sorted) {
    const filePath = path.join(migrationsDir, folder, "migration.sql");
    if (!fs.existsSync(filePath)) continue;
    const sql = fs.readFileSync(filePath, "utf-8");
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      try {
        await client.execute(statement);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        const allowed =
          message.includes("duplicate column name") ||
          message.includes("already exists") ||
          message.includes("no such table") ||
          message.includes("duplicate index name") ||
          message.includes("table") && message.includes("already exists");
        if (!allowed) {
          console.error("Migration failed:", statement);
          console.error(message);
          process.exit(1);
        }
      }
    }
  }

  execSync("npx prisma generate", {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: "file:./dev.db",
    },
  });
};

run().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
