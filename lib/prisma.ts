import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error("Prisma: DATABASE_URL is not set");
} else {
  const safeLog = connectionString.split("?")[0]
  console.log("Prisma: Using DATABASE_URL", safeLog);
}

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined
}

// Determine if we are using LibSQL (Turso)
const isLibsql = connectionString?.startsWith('libsql:')

// Configure adapter if LibSQL
const adapter = isLibsql
  ? new PrismaLibSQL(
      createClient({
        url: connectionString!,
        // authToken is usually embedded in the URL for Turso if copied from dashboard,
        // but can be passed explicitly if in a separate env var. 
        // Our .env has ?authToken=... so it's handled by url.
      })
    )
  : null

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
