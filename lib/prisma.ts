import { PrismaClient } from "@prisma/client-custom-v2"
import { PrismaLibSQL } from "@prisma/adapter-libsql"
import { createClient } from "@libsql/client"
import { config } from "dotenv"

// Force reload env if it looks like local default or is missing, to fix stale env vars
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith('file:')) {
  config({ path: '.env', override: true });
}

const connectionString = process.env.DATABASE_URL || "file:./dev.db"

if (!process.env.DATABASE_URL) {
  console.warn("⚠️  WARNING: DATABASE_URL is not set in environment. Falling back to local SQLite database.");
}

if (!connectionString) {
  console.error("Prisma: DATABASE_URL is not set");
} else {
  // Log the connection string (masking auth tokens if present)
  const logUrl = connectionString.includes("authToken") 
    ? connectionString.split("?")[0] + "?authToken=***" 
    : connectionString;
  console.log("Prisma: Using connection string:", logUrl);

}

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined
}

// Determine if we are using LibSQL (Turso)
const isLibsql = connectionString?.startsWith('libsql:') || connectionString?.startsWith('https:')

// Configure adapter only when using LibSQL (Turso)
const adapter = isLibsql
  ? new PrismaLibSQL(
      createClient({
        url: connectionString!,
      })
    )
  : null

// Check for stale client in development (missing new models like 'expense')
if (process.env.NODE_ENV !== 'production' && globalForPrisma.prisma) {
  // Cast to any to avoid type errors if the type definition is ahead of the runtime object
  const client = globalForPrisma.prisma as any;
  // If the existing client doesn't have the 'expense' model, it's stale.
  if (!client.expense) {
    console.warn("Prisma: Detected stale client instance (missing 'expense'). Re-initializing...");
    // Disconnect safely if possible
    client.$disconnect?.().catch((e: any) => console.error("Error disconnecting stale client:", e));
    globalForPrisma.prisma = undefined;
  }
}

const prismaBase =
  globalForPrisma.prisma ??
  (() => {
    console.log("Initializing NEW Prisma Client with URL:", connectionString);
    return new PrismaClient({
      adapter,
      log: ['query', 'error', 'warn'],
      datasources: isLibsql ? undefined : {
        db: {
          url: connectionString
        }
      }
    });
  })();

// Debug: Log available models on initialization
  if (process.env.NODE_ENV !== 'production') {
    const models = Object.keys(prismaBase).filter(key => !key.startsWith('_') && key[0] === key[0].toLowerCase());
    console.log("Prisma Client Initialized. Available models:", models.join(", "));
  }

export const prisma = prismaBase

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export type { ActivityLog } from '@prisma/client-custom-v2'
