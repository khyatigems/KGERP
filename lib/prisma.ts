import { PrismaClient } from "@prisma/client"
import { PrismaLibSQL } from "@prisma/adapter-libsql"
import { createClient } from "@libsql/client"
import { config } from "dotenv"

const isProd = process.env.NODE_ENV === "production";

function parseLibsqlCredentials(rawUrl: string) {
  const normalized = rawUrl.startsWith("https://") ? rawUrl.replace(/^https:\/\//, "libsql://") : rawUrl;
  const [base, query = ""] = normalized.split("?");
  const authToken =
    new URLSearchParams(query).get("authToken") ??
    process.env.TURSO_AUTH_TOKEN ??
    process.env.TURSO_TOKEN ??
    undefined;
  return { url: base, authToken };
}

if (!process.env.DATABASE_URL) {
  config({ path: ".env.local" });
  config({ path: ".env" });
}

const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";
const tursoDatabaseUrl = process.env.TURSO_DATABASE_URL || process.env.TURSO_URL || "";

if (!process.env.DATABASE_URL) {
  if (!isProd) console.warn("⚠️  WARNING: DATABASE_URL is not set in environment. Falling back to local SQLite database.");
}

if (!databaseUrl) {
  if (!isProd) console.error("Prisma: DATABASE_URL is not set");
} else {
  if (!isProd) {
    const logUrl = databaseUrl.includes("authToken")
      ? databaseUrl.split("?")[0] + "?authToken=***"
      : databaseUrl;
    console.log("Prisma: Using connection string:", logUrl);
  }

}

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined
}

// Determine if we are using LibSQL (Turso)
const isLibsql = !!tursoDatabaseUrl || databaseUrl.startsWith("libsql:") || databaseUrl.startsWith("https:")

// Configure adapter only when using LibSQL (Turso)
const adapter = isLibsql
  ? new PrismaLibSQL(
      (() => {
        const source = tursoDatabaseUrl || databaseUrl;
        const { url, authToken } = parseLibsqlCredentials(source);
        return createClient({ url, authToken });
      })()
    )
  : null

// Check for stale client in development (missing new models like 'expense')
if (process.env.NODE_ENV !== 'production' && globalForPrisma.prisma) {
  // Define a minimal interface for the potentially stale client
  interface StaleClient {
    expense?: unknown;
    reportExportJob?: unknown;
    workerLockHeartbeat?: unknown;
    analyticsDailySnapshot?: unknown;
    analyticsInventorySnapshot?: unknown;
    analyticsVendorSnapshot?: unknown;
    analyticsSalesSnapshot?: unknown;
    analyticsLabelSnapshot?: unknown;
    $disconnect?: () => Promise<void>;
  }
  
  const client = globalForPrisma.prisma as unknown as StaleClient;
  const staleMissingModel =
    !client.expense ||
    !client.reportExportJob ||
    !client.workerLockHeartbeat ||
    !client.analyticsDailySnapshot ||
    !client.analyticsInventorySnapshot ||
    !client.analyticsVendorSnapshot ||
    !client.analyticsSalesSnapshot ||
    !client.analyticsLabelSnapshot;
  if (staleMissingModel) {
    console.warn("Prisma: Detected stale client instance (missing required models). Re-initializing...");
    // Disconnect safely if possible
    client.$disconnect?.().catch((e: unknown) => console.error("Error disconnecting stale client:", e));
    globalForPrisma.prisma = undefined;
  }
}

const prismaBase =
  globalForPrisma.prisma ??
  (() => {
    return new PrismaClient({
      adapter,
      log: isProd ? ['error', 'warn'] : ['query', 'error', 'warn'],
      datasources: isLibsql
        ? undefined
        : {
            db: {
              url: databaseUrl
            }
          }
    });
  })();

// Debug: Log available models on initialization
if (process.env.NODE_ENV !== 'production') {
  const models = Object.keys(prismaBase).filter(key => !key.startsWith('_') && key[0] === key[0].toLowerCase());
  console.log("Prisma Client Initialized. Available models:", models.join(", "));
}

export const prisma = prismaBase;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export type { ActivityLog } from '@prisma/client'
