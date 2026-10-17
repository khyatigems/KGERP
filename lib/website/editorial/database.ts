import { createClient, type Client } from "@libsql/client";

let client: Client | undefined;
export function websiteEnabled() {
  return process.env.WEBSITE_MANAGEMENT_ENABLED === "true";
}
export function websiteDb() {
  if (!websiteEnabled()) throw new Error("Website management is disabled");
  const url = process.env.WEBSITE_DATABASE_URL;
  if (!url) throw new Error("Configure the separate website database");
  const identity = (value: string) =>
    value.split("?")[0].replace(/\/$/, "").toLowerCase();
  if (
    [
      process.env.DATABASE_URL,
      process.env.TURSO_DATABASE_URL,
      process.env.TURSO_URL,
    ].some((value) => value && identity(value) === identity(url))
  )
    throw new Error("Website content must use its own database");
  return (client ??= createClient({
    url,
    authToken: process.env.WEBSITE_DATABASE_AUTH_TOKEN,
  }));
}
