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
    const client = new PrismaClient({
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
    // Attach slow query logger in development
    if (!isProd) {
      try {
        (client as unknown as { $on: (ev: string, cb: (e: { query: string; duration: number }) => void) => void }).$on('query', async (e: { query: string; duration: number }) => {
          const dur = Number(e.duration || 0);
          if (dur > 500) {
            console.warn(`[slow-query] ${dur}ms ${String(e.query || "").slice(0, 120)}...`);
          }
        });
      } catch {}
    }
    return client;
  })();

// Debug: Log available models on initialization
if (process.env.NODE_ENV !== 'production') {
  const models = Object.keys(prismaBase).filter(key => !key.startsWith('_') && key[0] === key[0].toLowerCase());
  console.log("Prisma Client Initialized. Available models:", models.join(", "));
}

export const prisma = prismaBase;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export type { ActivityLog } from '@prisma/client'

let checkedUserRoleIdColumn: boolean | null = null;
let checkUserRoleIdColumnPromise: Promise<boolean> | null = null;

let checkedTables: Map<string, boolean> | null = null;
let checkTablesPromise: Promise<Map<string, boolean>> | null = null;

export async function hasTable(table: string): Promise<boolean> {
  if (checkedTables?.has(table)) return Boolean(checkedTables.get(table));
  if (!checkTablesPromise) {
    checkTablesPromise = (async () => {
      try {
        const rows = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
          `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
        );
        const set = new Map<string, boolean>();
        for (const r of rows || []) {
          if (!r?.name) continue;
          set.set(String(r.name), true);
        }
        checkedTables = set;
        return set;
      } catch {
        checkedTables = new Map();
        return checkedTables;
      } finally {
        checkTablesPromise = null;
      }
    })();
  }
  const tables = await checkTablesPromise;
  return Boolean(tables.get(table));
}

export async function hasTables(tables: string[]): Promise<boolean> {
  for (const t of tables) {
    const ok = await hasTable(t);
    if (!ok) return false;
  }
  return true;
}

export async function hasUserRoleIdColumn(): Promise<boolean> {
  if (checkedUserRoleIdColumn !== null) return checkedUserRoleIdColumn;
  if (checkUserRoleIdColumnPromise) return checkUserRoleIdColumnPromise;
  checkUserRoleIdColumnPromise = (async () => {
    try {
      const cols = await prisma.$queryRawUnsafe<Array<{ name: string }>>(`PRAGMA table_info("User")`);
      const set = new Set((cols || []).map((c) => c.name));
      checkedUserRoleIdColumn = set.has("roleId");
      return checkedUserRoleIdColumn;
    } catch {
      checkedUserRoleIdColumn = false;
      return false;
    } finally {
      checkUserRoleIdColumnPromise = null;
    }
  })();
  return checkUserRoleIdColumnPromise;
}

let ensuringUserRoleId = false;
let ensuredUserRoleId = false;
let ensureUserRoleIdPromise: Promise<void> | null = null;

export async function ensureUserRoleIdColumn(): Promise<void> {
  if (ensuredUserRoleId) return;
  if (ensuringUserRoleId && ensureUserRoleIdPromise) return ensureUserRoleIdPromise;
  ensuringUserRoleId = true;
  ensureUserRoleIdPromise = (async () => {
    try {
      const has = await hasUserRoleIdColumn();
      if (!has) {
        try {
          await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "roleId" TEXT;`);
        } catch {}
      }
      checkedUserRoleIdColumn = null;
      await hasUserRoleIdColumn();
    } catch {
    } finally {
      ensuredUserRoleId = true;
      ensuringUserRoleId = false;
      ensureUserRoleIdPromise = null;
    }
  })();
  return ensureUserRoleIdPromise;
}

let ensuringRbac = false;
let ensuredRbac = false;
let ensureRbacPromise: Promise<void> | null = null;

export async function ensureRbacSchema(): Promise<void> {
  if (ensuredRbac) return;
  if (ensuringRbac && ensureRbacPromise) return ensureRbacPromise;
  ensuringRbac = true;
  ensureRbacPromise = (async () => {
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Role" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT NOT NULL UNIQUE,
          "isSystem" INTEGER NOT NULL DEFAULT 0,
          "isActive" INTEGER NOT NULL DEFAULT 1,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Permission" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "module" TEXT NOT NULL,
          "action" TEXT NOT NULL,
          "key" TEXT NOT NULL UNIQUE,
          "description" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "RolePermission" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "roleId" TEXT NOT NULL,
          "permissionId" TEXT NOT NULL
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "UserPermission" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "permissionId" TEXT NOT NULL,
          "allow" INTEGER NOT NULL
        );
      `);

      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId","permissionId");`);
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "UserPermission_userId_permissionId_key" ON "UserPermission"("userId","permissionId");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "RolePermission_roleId_idx" ON "RolePermission"("roleId");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "UserPermission_userId_idx" ON "UserPermission"("userId");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "UserPermission_permissionId_idx" ON "UserPermission"("permissionId");`);
    } catch {
    } finally {
      checkedTables = null;
      ensuredRbac = true;
      ensuringRbac = false;
      ensureRbacPromise = null;
    }
  })();
  return ensureRbacPromise;
}

let ensuringActivityLog = false;
let ensuredActivityLog = false;
let ensureActivityLogPromise: Promise<void> | null = null;

export async function ensureActivityLogSchema(): Promise<void> {
  if (ensuredActivityLog) return;
  if (ensuringActivityLog && ensureActivityLogPromise) return ensureActivityLogPromise;
  ensuringActivityLog = true;
  ensureActivityLogPromise = (async () => {
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "ActivityLog" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "entityType" TEXT,
          "entityId" TEXT,
          "entityIdentifier" TEXT,
          "actionType" TEXT,
          "userId" TEXT,
          "userName" TEXT,
          "userEmail" TEXT,
          "ipAddress" TEXT,
          "userAgent" TEXT,
          "source" TEXT,
          "fieldChanges" TEXT,
          "details" TEXT,
          "module" TEXT,
          "action" TEXT,
          "referenceId" TEXT,
          "description" TEXT,
          "metadata" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      try {
        const cols = await prisma.$queryRawUnsafe<Array<{ name: string }>>(`PRAGMA table_info("ActivityLog")`);
        const set = new Set((cols || []).map((c) => c.name));
        const add = async (name: string, type: string) => {
          if (set.has(name)) return;
          try {
            await prisma.$executeRawUnsafe(`ALTER TABLE "ActivityLog" ADD COLUMN "${name}" ${type};`);
          } catch {}
        };
        await add("module", "TEXT");
        await add("action", "TEXT");
        await add("referenceId", "TEXT");
        await add("description", "TEXT");
        await add("metadata", "TEXT");
        await add("userEmail", "TEXT");
        await add("ipAddress", "TEXT");
        await add("userAgent", "TEXT");
        await add("source", "TEXT");
        await add("fieldChanges", "TEXT");
        await add("details", "TEXT");
      } catch {}

      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ActivityLog_userId_idx" ON "ActivityLog"("userId");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ActivityLog_module_idx" ON "ActivityLog"("module");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");`);
    } catch {
    } finally {
      checkedTables = null;
      ensuredActivityLog = true;
      ensuringActivityLog = false;
      ensureActivityLogPromise = null;
    }
  })();
  return ensureActivityLogPromise;
}

let ensuringFollowUp = false;
let ensuredFollowUp = false;
let ensureFollowUpPromise: Promise<void> | null = null;

export async function ensureFollowUpSchema(): Promise<void> {
  if (ensuredFollowUp) return;
  if (ensuringFollowUp && ensureFollowUpPromise) return ensureFollowUpPromise;
  ensuringFollowUp = true;
  ensureFollowUpPromise = (async () => {
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "FollowUp" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "invoiceId" TEXT NOT NULL,
          "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "action" TEXT,
          "note" TEXT,
          "promisedDate" DATETIME,
          "createdBy" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "FollowUp_invoiceId_idx" ON "FollowUp"("invoiceId");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "FollowUp_createdBy_idx" ON "FollowUp"("createdBy");`);
    } catch {
    } finally {
      checkedTables = null;
      ensuredFollowUp = true;
      ensuringFollowUp = false;
      ensureFollowUpPromise = null;
    }
  })();
  return ensureFollowUpPromise;
}

let ensuringInvoiceSupport = false;
let ensuredInvoiceSupport = false;
let ensureInvoiceSupportPromise: Promise<void> | null = null;

export async function ensureInvoiceSupportSchema(): Promise<void> {
  if (ensuredInvoiceSupport) return;
  if (ensuringInvoiceSupport && ensureInvoiceSupportPromise) return ensureInvoiceSupportPromise;
  ensuringInvoiceSupport = true;
  ensureInvoiceSupportPromise = (async () => {
    try {
      await ensureFollowUpSchema();

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Payment" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "invoiceId" TEXT NOT NULL,
          "amount" REAL NOT NULL,
          "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "method" TEXT NOT NULL,
          "reference" TEXT,
          "notes" TEXT,
          "recordedBy" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Payment_invoiceId_idx" ON "Payment"("invoiceId");`);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "InvoiceVersion" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "invoiceId" TEXT NOT NULL,
          "versionNumber" INTEGER NOT NULL,
          "reason" TEXT,
          "snapshot" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "InvoiceVersion_invoiceId_idx" ON "InvoiceVersion"("invoiceId");`);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "SalesReturn" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "invoiceId" TEXT NOT NULL,
          "returnNumber" TEXT NOT NULL UNIQUE,
          "returnDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "disposition" TEXT NOT NULL,
          "taxableAmount" REAL NOT NULL DEFAULT 0,
          "igst" REAL NOT NULL DEFAULT 0,
          "cgst" REAL NOT NULL DEFAULT 0,
          "sgst" REAL NOT NULL DEFAULT 0,
          "totalTax" REAL NOT NULL DEFAULT 0,
          "totalAmount" REAL NOT NULL DEFAULT 0,
          "remarks" TEXT,
          "createdById" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SalesReturn_invoiceId_idx" ON "SalesReturn"("invoiceId");`);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "SalesReturnItem" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "salesReturnId" TEXT NOT NULL,
          "inventoryId" TEXT NOT NULL,
          "quantity" INTEGER NOT NULL DEFAULT 1,
          "sellingPrice" REAL NOT NULL,
          "resaleable" INTEGER NOT NULL DEFAULT 1
        );
      `);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SalesReturnItem_salesReturnId_idx" ON "SalesReturnItem"("salesReturnId");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SalesReturnItem_inventoryId_idx" ON "SalesReturnItem"("inventoryId");`);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "CreditNote" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "customerId" TEXT,
          "invoiceId" TEXT,
          "creditNoteNumber" TEXT NOT NULL UNIQUE,
          "issueDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "totalAmount" REAL NOT NULL,
          "taxableAmount" REAL NOT NULL DEFAULT 0,
          "igst" REAL NOT NULL DEFAULT 0,
          "cgst" REAL NOT NULL DEFAULT 0,
          "sgst" REAL NOT NULL DEFAULT 0,
          "totalTax" REAL NOT NULL DEFAULT 0,
          "balanceAmount" REAL NOT NULL,
          "isActive" INTEGER NOT NULL DEFAULT 1,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CreditNote_customerId_idx" ON "CreditNote"("customerId");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CreditNote_invoiceId_idx" ON "CreditNote"("invoiceId");`);
    } catch {
    } finally {
      checkedTables = null;
      ensuredInvoiceSupport = true;
      ensuringInvoiceSupport = false;
      ensureInvoiceSupportPromise = null;
    }
  })();
  return ensureInvoiceSupportPromise;
}
