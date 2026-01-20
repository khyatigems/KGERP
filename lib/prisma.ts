import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const connectionString = process.env.DATABASE_URL || "file:./dev.db"

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

export type { ActivityLog } from '@prisma/client'
