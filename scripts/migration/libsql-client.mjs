import "dotenv/config";
import { createClient } from "@libsql/client";

export function getDatabaseUrl() {
  const url = process.env.TURSO_DATABASE_URL || process.env.TURSO_URL || process.env.DATABASE_URL || "";
  if (!url) {
    throw new Error("DATABASE_URL (or TURSO_DATABASE_URL) is required");
  }
  return url;
}

export function parseLibsqlCredentials(rawUrl) {
  const normalized = rawUrl.startsWith("https://") ? rawUrl.replace(/^https:\/\//, "libsql://") : rawUrl;
  const [base, query = ""] = normalized.split("?");
  const authToken =
    new URLSearchParams(query).get("authToken") ||
    process.env.TURSO_AUTH_TOKEN ||
    process.env.TURSO_TOKEN ||
    undefined;
  return { url: base, authToken };
}

export function createLibsqlClientFromEnv() {
  const rawUrl = getDatabaseUrl();
  const isFile = rawUrl.startsWith("file:");
  if (isFile) return null;
  const { url, authToken } = parseLibsqlCredentials(rawUrl);
  return createClient({ url, authToken });
}
