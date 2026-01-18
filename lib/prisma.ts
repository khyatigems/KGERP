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

// Configure adapter only when using LibSQL (Turso)
const adapter = isLibsql
  ? new PrismaLibSQL(
      createClient({
        url: connectionString!,
      })
    )
  : undefined

const prismaBase =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: ['error'],
  })

export const prisma = prismaBase

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export type { ActivityLog } from '@prisma/client'
