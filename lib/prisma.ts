import { PrismaClient } from "@prisma/client"
import { PrismaLibSQL } from "@prisma/adapter-libsql"
import { createClient } from "@libsql/client"

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

// Only load environment variables on server side
if (typeof window === "undefined" && !process.env.DATABASE_URL) {
  // This will only run on server
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { config } = require("dotenv");
    config({ path: ".env.local" });
    config({ path: ".env" });
  } catch (e) {
    // Ignore if dotenv is not available
  }
}

const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";
const tursoDatabaseUrl = process.env.TURSO_DATABASE_URL || process.env.TURSO_URL || "";

if (!process.env.DATABASE_URL && typeof window === "undefined") {
  if (!isProd) console.warn("⚠️  WARNING: DATABASE_URL is not set in environment. Falling back to local SQLite database.");
}

if (!databaseUrl) {
  if (!isProd && typeof window === "undefined") console.error("Prisma: DATABASE_URL is not set");
}

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined
}

// Determine if we are using LibSQL (Turso)
const isLibsql = !!tursoDatabaseUrl || databaseUrl.startsWith("libsql:") || databaseUrl.startsWith("https:")

// Configure adapter only when using LibSQL (Turso)
// The raw client is kept so idempotent schema work can be sent as a single
// batch (one network round trip) instead of one round trip per statement.
const libsqlClient = isLibsql
  ? (() => {
      const source = tursoDatabaseUrl || databaseUrl;
      const { url, authToken } = parseLibsqlCredentials(source);
      return createClient({ url, authToken });
    })()
  : null;

const adapter = libsqlClient ? new PrismaLibSQL(libsqlClient) : null

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
  interface StaleClientWithMetrics extends StaleClient {
    listingOpportunity?: unknown;
    listingMetricSnapshot?: unknown;
  }
  const client2 = client as StaleClientWithMetrics;
  const staleMissingModel =
    !client.expense ||
    !client.reportExportJob ||
    !client.workerLockHeartbeat ||
    !client.analyticsDailySnapshot ||
    !client.analyticsInventorySnapshot ||
    !client.analyticsVendorSnapshot ||
    !client.analyticsSalesSnapshot ||
    !client.analyticsLabelSnapshot ||
    !client2.listingOpportunity ||
    !client2.listingMetricSnapshot;
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
    // Build client options based on database type
    const clientOptions: any = {
      log: isProd ? ['error', 'warn'] : ['query', 'error', 'warn'],
    };
    
    if (isLibsql && adapter) {
      clientOptions.adapter = adapter;
    } else {
      clientOptions.datasources = {
        db: {
          url: databaseUrl
        }
      };
    }
    
    const client = new PrismaClient(clientOptions);
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



export const prisma = prismaBase;

export type DdlArg = string | number | boolean | null;
export type DdlStatement = string | { sql: string; args?: DdlArg[] };

/**
 * Executes a list of statements in a single network round trip.
 *
 * The dashboard layout and many routes call idempotent "ensure schema" helpers
 * (CREATE TABLE/INDEX IF NOT EXISTS ...). Running those one statement at a
 * time over remote Turso costs ~30-40ms per statement, which added up to
 * several seconds of blocking work before the first byte of a page. Sending
 * them as one libsql batch keeps the exact same statements but costs a single
 * round trip.
 *
 * Returns true when the batch path ran, false when the caller must fall back
 * to statement-by-statement execution. Never throws.
 */
async function runSqlBatch(statements: DdlStatement[], mode: "read" | "write"): Promise<boolean> {
  if (!statements.length) return true;
  if (!libsqlClient) return false;
  try {
    await libsqlClient.batch(
      statements.map((s) => (typeof s === "string" ? { sql: s, args: [] } : { sql: s.sql, args: s.args ?? [] })),
      mode
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Runs idempotent DDL statements as one round trip. If the batch is rejected
 * (e.g. a single statement fails), every statement is replayed individually
 * with errors swallowed — exactly the previous behaviour, so nothing that
 * worked before can start breaking.
 */
export async function executeDdlBatch(statements: DdlStatement[]): Promise<void> {
  if (!statements.length) return;
  if (await runSqlBatch(statements, "write")) return;
  for (const statement of statements) {
    try {
      if (typeof statement === "string") {
        await prismaBase.$executeRawUnsafe(statement);
      } else {
        await prismaBase.$executeRawUnsafe(statement.sql, ...(statement.args ?? []));
      }
    } catch {
      // Idempotent by design — one failing statement must not break the app.
    }
  }
}

/** Runs a set of read statements as one round trip (falls back to sequential). */
export async function executeReadBatch<T = Record<string, unknown>>(statements: string[]): Promise<T[][]> {
  if (!statements.length) return [];
  if (libsqlClient) {
    try {
      const results = await libsqlClient.batch(
        statements.map((sql) => ({ sql, args: [] })),
        "read"
      );
      return results.map((r) => r.rows as unknown as T[]);
    } catch {
      // fall through to sequential reads
    }
  }
  const out: T[][] = [];
  for (const sql of statements) {
    try {
      out.push((await prismaBase.$queryRawUnsafe<T[]>(sql)) as T[]);
    } catch {
      out.push([] as T[]);
    }
  }
  return out;
}

/**
 * Batched replacement for repeated `PRAGMA table_info` probes: one round trip
 * for every table instead of one round trip per column check.
 */
export async function getMissingColumns(checks: Array<[string, string]>): Promise<Set<string>> {
  const tables = Array.from(new Set(checks.map(([table]) => table)));
  const results = await executeReadBatch<{ name: string }>(
    tables.map((table) => `PRAGMA table_info("${table}")`)
  );
  const columnsByTable = new Map<string, Set<string>>();
  tables.forEach((table, index) => {
    columnsByTable.set(table, new Set((results[index] || []).map((column) => column.name)));
  });
  const missing = new Set<string>();
  for (const [table, column] of checks) {
    if (!columnsByTable.get(table)?.has(column)) missing.add(`${table}.${column}`);
  }
  return missing;
}

/** Builds `ALTER TABLE ... ADD COLUMN` statements for the given missing columns. */
export function buildAddColumnStatements(checks: Array<[string, string, string]>, missing: Set<string>): DdlStatement[] {
  const statements: DdlStatement[] = [];
  for (const [table, column, definition] of checks) {
    if (missing.has(`${table}.${column}`)) {
      statements.push(`ALTER TABLE "${table}" ADD COLUMN ${definition};`);
    }
  }
  return statements;
}


if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export type { ActivityLog } from '@prisma/client'

let checkedUserRoleIdColumn: boolean | null = null;
let checkUserRoleIdColumnPromise: Promise<boolean> | null = null;

let ensuringPerformanceIndexes = false;
let ensuredPerformanceIndexes = false;
let ensurePerformanceIndexesPromise: Promise<void> | null = null;

export async function ensurePerformanceIndexes(): Promise<void> {
  if (ensuredPerformanceIndexes) return;
  if (ensuringPerformanceIndexes && ensurePerformanceIndexesPromise) return ensurePerformanceIndexesPromise;
  ensuringPerformanceIndexes = true;
  ensurePerformanceIndexesPromise = (async () => {
    try {
      const indexes = [
        `CREATE INDEX IF NOT EXISTS "Quotation_status_idx" ON "Quotation"("status")`,
        `CREATE INDEX IF NOT EXISTS "Quotation_status_validUntil_idx" ON "Quotation"("status", "validUntil")`,
        `CREATE INDEX IF NOT EXISTS "Quotation_status_createdAt_idx" ON "Quotation"("status", "createdAt")`,
        `CREATE INDEX IF NOT EXISTS "Quotation_createdAt_idx" ON "Quotation"("createdAt")`,
        `CREATE INDEX IF NOT EXISTS "Invoice_status_idx" ON "Invoice"("status")`,
        `CREATE INDEX IF NOT EXISTS "Invoice_status_paymentStatus_idx" ON "Invoice"("status", "paymentStatus")`,
        `CREATE INDEX IF NOT EXISTS "Invoice_status_paymentStatus_dueDate_idx" ON "Invoice"("status", "paymentStatus", "dueDate")`,
        `CREATE INDEX IF NOT EXISTS "Invoice_createdAt_idx" ON "Invoice"("createdAt")`,
        `CREATE INDEX IF NOT EXISTS "Invoice_dueDate_idx" ON "Invoice"("dueDate")`,
        `CREATE INDEX IF NOT EXISTS "Listing_status_idx" ON "Listing"("status")`,
        `CREATE INDEX IF NOT EXISTS "Listing_status_platform_idx" ON "Listing"("status", "platform")`,
        `CREATE INDEX IF NOT EXISTS "Listing_createdAt_idx" ON "Listing"("createdAt")`,
        `CREATE INDEX IF NOT EXISTS "Sale_paymentStatus_idx" ON "Sale"("paymentStatus")`,
        `CREATE INDEX IF NOT EXISTS "Sale_saleDate_paymentStatus_idx" ON "Sale"("saleDate", "paymentStatus")`,
        `CREATE INDEX IF NOT EXISTS "Vendor_status_idx" ON "Vendor"("status")`,
        `CREATE INDEX IF NOT EXISTS "Expense_paymentStatus_idx" ON "Expense"("paymentStatus")`,
      ];
      // One round trip instead of one per index (idempotent, same statements).
      await executeDdlBatch(indexes);
    } catch {
    } finally {
      ensuredPerformanceIndexes = true;
      ensuringPerformanceIndexes = false;
      ensurePerformanceIndexesPromise = null;
    }
  })();
  return ensurePerformanceIndexesPromise;
}

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
          // The column now exists — skip the second PRAGMA probe.
          checkedUserRoleIdColumn = true;
        } catch {
          checkedUserRoleIdColumn = null;
          await hasUserRoleIdColumn();
        }
      }
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
      await executeDdlBatch([
        `CREATE TABLE IF NOT EXISTS "Role" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT NOT NULL UNIQUE,
          "isSystem" INTEGER NOT NULL DEFAULT 0,
          "isActive" INTEGER NOT NULL DEFAULT 1,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL
        );`,
        `CREATE TABLE IF NOT EXISTS "Permission" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "module" TEXT NOT NULL,
          "action" TEXT NOT NULL,
          "key" TEXT NOT NULL UNIQUE,
          "description" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL
        );`,
        `CREATE TABLE IF NOT EXISTS "RolePermission" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "roleId" TEXT NOT NULL,
          "permissionId" TEXT NOT NULL
        );`,
        `CREATE TABLE IF NOT EXISTS "UserPermission" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "permissionId" TEXT NOT NULL,
          "allow" INTEGER NOT NULL
        );`,
        `CREATE UNIQUE INDEX IF NOT EXISTS "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId","permissionId");`,
        `CREATE UNIQUE INDEX IF NOT EXISTS "UserPermission_userId_permissionId_key" ON "UserPermission"("userId","permissionId");`,
        `CREATE INDEX IF NOT EXISTS "RolePermission_roleId_idx" ON "RolePermission"("roleId");`,
        `CREATE INDEX IF NOT EXISTS "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");`,
        `CREATE INDEX IF NOT EXISTS "UserPermission_userId_idx" ON "UserPermission"("userId");`,
        `CREATE INDEX IF NOT EXISTS "UserPermission_permissionId_idx" ON "UserPermission"("permissionId");`,
      ]);
    } catch {
    } finally {
      if (checkedTables) {
        checkedTables.set("Role", true);
        checkedTables.set("Permission", true);
        checkedTables.set("RolePermission", true);
        checkedTables.set("UserPermission", true);
      }
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
      await executeDdlBatch([
        `CREATE TABLE IF NOT EXISTS "ActivityLog" (
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
        );`,
      ]);

      const columnChecks: Array<[string, string, string]> = [
        ["ActivityLog", "module", '"module" TEXT'],
        ["ActivityLog", "action", '"action" TEXT'],
        ["ActivityLog", "referenceId", '"referenceId" TEXT'],
        ["ActivityLog", "description", '"description" TEXT'],
        ["ActivityLog", "metadata", '"metadata" TEXT'],
        ["ActivityLog", "userEmail", '"userEmail" TEXT'],
        ["ActivityLog", "ipAddress", '"ipAddress" TEXT'],
        ["ActivityLog", "userAgent", '"userAgent" TEXT'],
        ["ActivityLog", "source", '"source" TEXT'],
        ["ActivityLog", "fieldChanges", '"fieldChanges" TEXT'],
        ["ActivityLog", "details", '"details" TEXT'],
        ["ActivityLog", "idempotencyKey", '"idempotencyKey" TEXT'],
      ];
      try {
        const missing = await getMissingColumns(columnChecks.map(([table, column]) => [table, column]));
        await executeDdlBatch([
          ...buildAddColumnStatements(columnChecks, missing),
          `CREATE INDEX IF NOT EXISTS "ActivityLog_userId_idx" ON "ActivityLog"("userId");`,
          `CREATE INDEX IF NOT EXISTS "ActivityLog_module_idx" ON "ActivityLog"("module");`,
          `CREATE INDEX IF NOT EXISTS "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");`,
          `CREATE INDEX IF NOT EXISTS "ActivityLog_entityId_idx" ON "ActivityLog"("entityId");`,
          `CREATE INDEX IF NOT EXISTS "ActivityLog_entityType_entityId_idx" ON "ActivityLog"("entityType", "entityId");`,
          `CREATE UNIQUE INDEX IF NOT EXISTS "ActivityLog_user_action_idempotency_key_unique" ON "ActivityLog"("userId","actionType","idempotencyKey");`,
        ]);
      } catch {}
    } catch {
    } finally {
      if (checkedTables) checkedTables.set("ActivityLog", true);
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
      await executeDdlBatch([
        `CREATE TABLE IF NOT EXISTS "FollowUp" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "invoiceId" TEXT NOT NULL,
          "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "action" TEXT,
          "note" TEXT,
          "promisedDate" DATETIME,
          "createdBy" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE INDEX IF NOT EXISTS "FollowUp_invoiceId_idx" ON "FollowUp"("invoiceId");`,
        `CREATE INDEX IF NOT EXISTS "FollowUp_createdBy_idx" ON "FollowUp"("createdBy");`,
      ]);
    } catch {
    } finally {
      if (checkedTables) checkedTables.set("FollowUp", true);
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

async function invoiceSupportColumnsMissing(): Promise<boolean> {
  const checks: Array<[string, string]> = [
    ["Invoice", "invoiceType"],
    ["Invoice", "iecCode"],
    ["Invoice", "exportType"],
    ["Invoice", "countryOfDestination"],
    ["Invoice", "portOfDispatch"],
    ["Invoice", "modeOfTransport"],
    ["Invoice", "courierPartner"],
    ["Invoice", "trackingId"],
    ["Invoice", "invoiceCurrency"],
    ["Invoice", "conversionRate"],
    ["Invoice", "totalInrValue"],
    ["CompanySettings", "invoicePrefix"],
    ["CompanySettings", "invoicingStartNumber"],
    ["CompanySettings", "invoiceLogoUrl"],
    ["CompanySettings", "quotationLogoUrl"],
    ["CompanySettings", "logoUrl"],
    ["CompanySettings", "skuViewLogoUrl"],
    ["CompanySettings", "otherDocsLogoUrl"],
    ["CompanySettings", "address"],
    ["CompanySettings", "email"],
    ["CompanySettings", "phone"],
    ["CompanySettings", "website"],
    ["CompanySettings", "gstin"],
    ["CompanySettings", "enableExportInvoice"],
    ["CompanySettings", "defaultExportType"],
    ["CompanySettings", "companyIec"],
    ["CompanySettings", "defaultCurrency"],
    ["CompanySettings", "defaultPort"],
    ["CompanySettings", "swiftCode"],
    ["CompanySettings", "termsAndConditions"],
    ["CompanySettings", "createdAt"],
    ["CompanySettings", "updatedAt"],
    ["PaymentSettings", "swiftCode"],
  ];

  const missing = await getMissingColumns(checks);
  return missing.size > 0;
}

export async function ensureInvoiceSupportSchema(force = false): Promise<void> {
  if (!force) {
    const missing = await invoiceSupportColumnsMissing();
    if (!missing && ensuredInvoiceSupport) {
      return;
    }
    force = missing;
  }
  if (ensuredInvoiceSupport && !force) return;
  if (ensuringInvoiceSupport && ensureInvoiceSupportPromise) return ensureInvoiceSupportPromise;
  ensuringInvoiceSupport = true;
  ensureInvoiceSupportPromise = (async () => {
    try {
      await ensureFollowUpSchema();

      await executeDdlBatch([
        `CREATE TABLE IF NOT EXISTS "Payment" (
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
        );`,
        `CREATE INDEX IF NOT EXISTS "Payment_invoiceId_idx" ON "Payment"("invoiceId");`,
        `CREATE TABLE IF NOT EXISTS "InvoiceVersion" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "invoiceId" TEXT NOT NULL,
          "versionNumber" INTEGER NOT NULL,
          "reason" TEXT,
          "snapshot" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE INDEX IF NOT EXISTS "InvoiceVersion_invoiceId_idx" ON "InvoiceVersion"("invoiceId");`,
        `CREATE TABLE IF NOT EXISTS "SalesReturn" (
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
        );`,
        `CREATE INDEX IF NOT EXISTS "SalesReturn_invoiceId_idx" ON "SalesReturn"("invoiceId");`,
        `CREATE TABLE IF NOT EXISTS "SalesReturnItem" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "salesReturnId" TEXT NOT NULL,
          "inventoryId" TEXT NOT NULL,
          "quantity" INTEGER NOT NULL DEFAULT 1,
          "sellingPrice" REAL NOT NULL,
          "resaleable" INTEGER NOT NULL DEFAULT 1
        );`,
        `CREATE INDEX IF NOT EXISTS "SalesReturnItem_salesReturnId_idx" ON "SalesReturnItem"("salesReturnId");`,
        `CREATE INDEX IF NOT EXISTS "SalesReturnItem_inventoryId_idx" ON "SalesReturnItem"("inventoryId");`,
        `CREATE TABLE IF NOT EXISTS "CreditNote" (
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
        );`,
        `CREATE INDEX IF NOT EXISTS "CreditNote_customerId_idx" ON "CreditNote"("customerId");`,
        `CREATE INDEX IF NOT EXISTS "CreditNote_invoiceId_idx" ON "CreditNote"("invoiceId");`,
      ]);

      const invoiceSupportColumnChecks: Array<[string, string, string]> = [
        ["Invoice", "invoiceType", '"invoiceType" TEXT DEFAULT "TAX"'],
        ["Invoice", "iecCode", '"iecCode" TEXT'],
        ["Invoice", "exportType", '"exportType" TEXT'],
        ["Invoice", "countryOfDestination", '"countryOfDestination" TEXT'],
        ["Invoice", "portOfDispatch", '"portOfDispatch" TEXT'],
        ["Invoice", "modeOfTransport", '"modeOfTransport" TEXT'],
        ["Invoice", "courierPartner", '"courierPartner" TEXT'],
        ["Invoice", "trackingId", '"trackingId" TEXT'],
        ["Invoice", "invoiceCurrency", '"invoiceCurrency" TEXT'],
        ["Invoice", "conversionRate", '"conversionRate" REAL'],
        ["Invoice", "totalInrValue", '"totalInrValue" REAL'],
        ["Invoice", "totalUsdValue", '"totalUsdValue" REAL'],
        ["CompanySettings", "invoicePrefix", '"invoicePrefix" TEXT'],
        ["CompanySettings", "invoicingStartNumber", '"invoicingStartNumber" INTEGER'],
        ["CompanySettings", "invoiceLogoUrl", '"invoiceLogoUrl" TEXT'],
        ["CompanySettings", "quotationLogoUrl", '"quotationLogoUrl" TEXT'],
        ["CompanySettings", "logoUrl", '"logoUrl" TEXT'],
        ["CompanySettings", "skuViewLogoUrl", '"skuViewLogoUrl" TEXT'],
        ["CompanySettings", "otherDocsLogoUrl", '"otherDocsLogoUrl" TEXT'],
        ["CompanySettings", "address", '"address" TEXT'],
        ["CompanySettings", "email", '"email" TEXT'],
        ["CompanySettings", "phone", '"phone" TEXT'],
        ["CompanySettings", "website", '"website" TEXT'],
        ["CompanySettings", "gstin", '"gstin" TEXT'],
        ["CompanySettings", "enableExportInvoice", '"enableExportInvoice" INTEGER NOT NULL DEFAULT 0'],
        ["CompanySettings", "defaultExportType", '"defaultExportType" TEXT'],
        ["CompanySettings", "companyIec", '"companyIec" TEXT'],
        ["CompanySettings", "defaultCurrency", '"defaultCurrency" TEXT'],
        ["CompanySettings", "defaultPort", '"defaultPort" TEXT'],
        ["CompanySettings", "swiftCode", '"swiftCode" TEXT'],
        ["CompanySettings", "termsAndConditions", '"termsAndConditions" TEXT'],
        ["CompanySettings", "createdAt", '"createdAt" DATETIME'],
        ["CompanySettings", "updatedAt", '"updatedAt" DATETIME'],
        ["PaymentSettings", "swiftCode", '"swiftCode" TEXT'],
        ["InvoiceSettings", "exportTerms", '"exportTerms" TEXT'],
        ["Sale", "usdPrice", '"usdPrice" REAL'],
      ];
      const missingInvoiceSupportColumns = await getMissingColumns(
        invoiceSupportColumnChecks.map(([table, column]): [string, string] => [table, column])
      );
      await executeDdlBatch([
        ...buildAddColumnStatements(invoiceSupportColumnChecks, missingInvoiceSupportColumns),
        'UPDATE "CompanySettings" SET "createdAt" = COALESCE("createdAt", CURRENT_TIMESTAMP)',
        'UPDATE "CompanySettings" SET "updatedAt" = COALESCE("updatedAt", CURRENT_TIMESTAMP)',

        // Ensure CustomerAdvance and CustomerAdvanceAdjustment tables exist
        `CREATE TABLE IF NOT EXISTS "CustomerAdvance" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "customerId" TEXT NOT NULL,
          "amount" REAL NOT NULL,
          "paymentMode" TEXT NOT NULL DEFAULT 'CASH',
          "reference" TEXT,
          "notes" TEXT,
          "isAdjusted" INTEGER NOT NULL DEFAULT 0,
          "adjustedAmount" REAL NOT NULL DEFAULT 0,
          "remainingAmount" REAL NOT NULL DEFAULT 0,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE INDEX IF NOT EXISTS "CustomerAdvance_customerId_idx" ON "CustomerAdvance"("customerId");`,
        `CREATE TABLE IF NOT EXISTS "CustomerAdvanceAdjustment" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "advanceId" TEXT NOT NULL,
          "saleId" TEXT NOT NULL,
          "amountUsed" REAL NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE INDEX IF NOT EXISTS "CustomerAdvanceAdjustment_advanceId_idx" ON "CustomerAdvanceAdjustment"("advanceId");`,
        `CREATE INDEX IF NOT EXISTS "CustomerAdvanceAdjustment_saleId_idx" ON "CustomerAdvanceAdjustment"("saleId");`,

        // Ensure ExportInvoice table exists (used by export invoice flow)
        `CREATE TABLE IF NOT EXISTS "ExportInvoice" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "invoiceId" TEXT NOT NULL UNIQUE,
          "customsDeclarationNumber" TEXT,
          "fobValue" REAL,
          "freightCharges" REAL,
          "insuranceCharges" REAL,
          "shippingBillNumber" TEXT,
          "portCode" TEXT,
          "hsnCodes" TEXT,
          "buyerReference" TEXT,
          "contractNumber" TEXT,
          "preCarriageBy" TEXT,
          "preCarriagePort" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE INDEX IF NOT EXISTS "ExportInvoice_invoiceId_idx" ON "ExportInvoice"("invoiceId");`,
        `CREATE INDEX IF NOT EXISTS "ExportInvoice_customsDeclarationNumber_idx" ON "ExportInvoice"("customsDeclarationNumber");`,
      ]);
    } catch {
    } finally {
      if (checkedTables) {
        ["Payment", "InvoiceVersion", "SalesReturn", "SalesReturnItem", "CreditNote", "CustomerAdvance", "CustomerAdvanceAdjustment", "ExportInvoice"].forEach(t => checkedTables!.set(t, true));
      }
      ensuredInvoiceSupport = true;
      ensuringInvoiceSupport = false;
      ensureInvoiceSupportPromise = null;
    }
  })();
  return ensureInvoiceSupportPromise;
}

let ensuringSalesReturnReplacement = false;
let ensuredSalesReturnReplacement = false;
let ensureSalesReturnReplacementPromise: Promise<void> | null = null;

export async function ensureSalesReturnReplacementSchema(): Promise<void> {
  if (ensuredSalesReturnReplacement) return;
  if (ensuringSalesReturnReplacement && ensureSalesReturnReplacementPromise) return ensureSalesReturnReplacementPromise;
  ensuringSalesReturnReplacement = true;
  ensureSalesReturnReplacementPromise = (async () => {
    try {
      await executeDdlBatch([
        `CREATE TABLE IF NOT EXISTS "SalesReturnReplacement" (
          "salesReturnId" TEXT NOT NULL PRIMARY KEY,
          "invoiceId" TEXT NOT NULL,
          "memoId" TEXT,
          "createdBy" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE INDEX IF NOT EXISTS "SalesReturnReplacement_invoiceId_idx" ON "SalesReturnReplacement"("invoiceId");`,
      ]);
    } catch {
    } finally {
      if (checkedTables) checkedTables.set("SalesReturnReplacement", true);
      ensuredSalesReturnReplacement = true;
      ensuringSalesReturnReplacement = false;
      ensureSalesReturnReplacementPromise = null;
    }
  })();
  return ensureSalesReturnReplacementPromise;
}

let ensuringBillfreePhase1 = false;
let ensuredBillfreePhase1 = false;
let ensureBillfreePhase1Promise: Promise<void> | null = null;

async function ensureColumnIfMissing(
  tableName: string,
  columnName: string,
  columnDefinition: string
) {
  try {
    const columns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
      `PRAGMA table_info("${tableName}")`
    );
    const hasColumn = Array.isArray(columns) && columns.some((col) => col.name === columnName);
    if (!hasColumn) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "${tableName}" ADD COLUMN ${columnDefinition};`);
    }
  } catch {
    // Swallow to preserve idempotent behaviour during safe deploys.
  }
}

export async function ensureBillfreePhase1Schema(): Promise<void> {
  if (ensuredBillfreePhase1) return;
  if (ensuringBillfreePhase1 && ensureBillfreePhase1Promise) return ensureBillfreePhase1Promise;
  ensuringBillfreePhase1 = true;
  ensureBillfreePhase1Promise = (async () => {
    try {
      await executeDdlBatch([
        `CREATE TABLE IF NOT EXISTS "OfferBanner" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "title" TEXT NOT NULL,
          "subtitle" TEXT,
          "imageUrl" TEXT,
          "ctaText" TEXT,
          "ctaLink" TEXT,
          "displayOn" TEXT NOT NULL DEFAULT 'invoice',
          "audienceFilter" TEXT NOT NULL DEFAULT 'all',
          "priority" INTEGER NOT NULL DEFAULT 0,
          "isActive" INTEGER NOT NULL DEFAULT 1,
          "startDate" DATETIME,
          "endDate" DATETIME,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE INDEX IF NOT EXISTS "OfferBanner_displayOn_idx" ON "OfferBanner"("displayOn");`,
        `CREATE INDEX IF NOT EXISTS "OfferBanner_isActive_idx" ON "OfferBanner"("isActive");`,
        `CREATE TABLE IF NOT EXISTS "Coupon" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "code" TEXT NOT NULL UNIQUE,
          "type" TEXT NOT NULL,
          "value" REAL NOT NULL,
          "maxDiscount" REAL,
          "minInvoiceAmount" REAL,
          "validFrom" DATETIME,
          "validTo" DATETIME,
          "usageLimitTotal" INTEGER,
          "usageLimitPerCustomer" INTEGER,
          "applicableScope" TEXT NOT NULL DEFAULT 'all',
          "isActive" INTEGER NOT NULL DEFAULT 1,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE INDEX IF NOT EXISTS "Coupon_code_idx" ON "Coupon"("code");`,
        `CREATE INDEX IF NOT EXISTS "Coupon_isActive_idx" ON "Coupon"("isActive");`,
        `CREATE TABLE IF NOT EXISTS "CouponRedemption" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "couponId" TEXT NOT NULL,
          "invoiceId" TEXT,
          "customerId" TEXT,
          "discountAmount" REAL NOT NULL DEFAULT 0,
          "redeemedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE INDEX IF NOT EXISTS "CouponRedemption_couponId_idx" ON "CouponRedemption"("couponId");`,
        `CREATE INDEX IF NOT EXISTS "CouponRedemption_invoiceId_idx" ON "CouponRedemption"("invoiceId");`,
        `CREATE INDEX IF NOT EXISTS "CouponRedemption_customerId_idx" ON "CouponRedemption"("customerId");`,
        `CREATE TABLE IF NOT EXISTS "LoyaltyLedger" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "customerId" TEXT NOT NULL,
          "invoiceId" TEXT,
          "type" TEXT NOT NULL,
          "points" REAL NOT NULL DEFAULT 0,
          "rupeeValue" REAL NOT NULL DEFAULT 0,
          "remarks" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE INDEX IF NOT EXISTS "LoyaltyLedger_customerId_idx" ON "LoyaltyLedger"("customerId");`,
        `CREATE INDEX IF NOT EXISTS "LoyaltyLedger_invoiceId_idx" ON "LoyaltyLedger"("invoiceId");`,
        `CREATE TABLE IF NOT EXISTS "MessageTemplate" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "key" TEXT NOT NULL UNIQUE,
          "title" TEXT NOT NULL,
          "body" TEXT NOT NULL,
          "channel" TEXT NOT NULL DEFAULT 'WHATSAPP_WEB',
          "isActive" INTEGER NOT NULL DEFAULT 1,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE TABLE IF NOT EXISTS "CustomerCampaignLog" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "customerId" TEXT NOT NULL,
          "eventType" TEXT NOT NULL,
          "channel" TEXT NOT NULL,
          "templateKey" TEXT,
          "payload" TEXT,
          "status" TEXT NOT NULL,
          "openedAt" DATETIME,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE INDEX IF NOT EXISTS "CustomerCampaignLog_customerId_idx" ON "CustomerCampaignLog"("customerId");`,
        `CREATE INDEX IF NOT EXISTS "CustomerCampaignLog_eventType_idx" ON "CustomerCampaignLog"("eventType");`,
        `CREATE TABLE IF NOT EXISTS "CustomerProfileExtra" (
          "customerId" TEXT NOT NULL PRIMARY KEY,
          "dateOfBirth" DATETIME,
          "anniversaryDate" DATETIME,
          "communicationOptIn" INTEGER NOT NULL DEFAULT 1,
          "preferredLanguage" TEXT,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE TABLE IF NOT EXISTS "InvoicePromotionSettings" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "dobRewardAmount" REAL NOT NULL DEFAULT 0,
          "anniversaryRewardAmount" REAL NOT NULL DEFAULT 0,
          "enableReviewCta" INTEGER NOT NULL DEFAULT 1,
          "enableReferralCta" INTEGER NOT NULL DEFAULT 0,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE TABLE IF NOT EXISTS "LoyaltySettings" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "pointsPerRupee" REAL NOT NULL DEFAULT 0.01,
          "redeemRupeePerPoint" REAL NOT NULL DEFAULT 1,
          "minRedeemPoints" REAL NOT NULL DEFAULT 0,
          "maxRedeemPercent" REAL NOT NULL DEFAULT 30,
          "dobProfilePoints" REAL NOT NULL DEFAULT 0,
          "anniversaryProfilePoints" REAL NOT NULL DEFAULT 0,
          "expiryDays" INTEGER,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,
      ]);

      const columnChecks: Array<[string, string, string]> = [
        ["Customer", "stateCode", '"stateCode" TEXT'],
        ["Customer", "countryCode", '"countryCode" TEXT'],
        ["Customer", "isInternational", '"isInternational" INTEGER NOT NULL DEFAULT 0'],
        ["Invoice", "invoiceType", '"invoiceType" TEXT DEFAULT "TAX"'],
        ["Invoice", "iecCode", '"iecCode" TEXT'],
        ["Invoice", "exportType", '"exportType" TEXT'],
        ["Invoice", "countryOfDestination", '"countryOfDestination" TEXT'],
        ["Invoice", "portOfDispatch", '"portOfDispatch" TEXT'],
        ["Invoice", "modeOfTransport", '"modeOfTransport" TEXT'],
        ["Invoice", "courierPartner", '"courierPartner" TEXT'],
        ["Invoice", "trackingId", '"trackingId" TEXT'],
        ["Invoice", "invoiceCurrency", '"invoiceCurrency" TEXT'],
        ["Invoice", "conversionRate", '"conversionRate" REAL'],
        ["Invoice", "totalInrValue", '"totalInrValue" REAL'],
        ["Customer", "dateOfBirth", '"dateOfBirth" DATETIME'],
        ["Customer", "anniversaryDate", '"anniversaryDate" DATETIME'],
        ["Customer", "communicationOptIn", '"communicationOptIn" INTEGER NOT NULL DEFAULT 1'],
        ["Customer", "preferredLanguage", '"preferredLanguage" TEXT'],
        ["LoyaltySettings", "dobProfilePoints", '"dobProfilePoints" REAL NOT NULL DEFAULT 0'],
        ["LoyaltySettings", "anniversaryProfilePoints", '"anniversaryProfilePoints" REAL NOT NULL DEFAULT 0'],
        ["CouponRedemption", "discountAmount", '"discountAmount" REAL NOT NULL DEFAULT 0'],
        ["CouponRedemption", "redeemedAt", '"redeemedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP'],
      ];
      const missing = await getMissingColumns(columnChecks.map(([table, column]) => [table, column]));
      await executeDdlBatch(buildAddColumnStatements(columnChecks, missing));
    } catch {
    } finally {
      if (checkedTables) {
        ["OfferBanner", "Coupon", "CouponRedemption", "LoyaltyLedger", "MessageTemplate", "CustomerCampaignLog", "CustomerProfileExtra", "InvoicePromotionSettings", "LoyaltySettings"].forEach(t => checkedTables!.set(t, true));
      }
      ensuredBillfreePhase1 = true;
      ensuringBillfreePhase1 = false;
      ensureBillfreePhase1Promise = null;
    }
  })();
  return ensureBillfreePhase1Promise;
}

let ensuringAvatarWhatsNew = false;
let ensuredAvatarWhatsNew = false;
let ensureAvatarWhatsNewPromise: Promise<void> | null = null;

export async function ensureAvatarWhatsNewSchema(): Promise<void> {
  if (ensuredAvatarWhatsNew) return;
  if (ensuringAvatarWhatsNew && ensureAvatarWhatsNewPromise) return ensureAvatarWhatsNewPromise;
  ensuringAvatarWhatsNew = true;
  ensureAvatarWhatsNewPromise = (async () => {
    try {
      const avatarColumnChecks: Array<[string, string, string]> = [
        ["User", "avatarUrl", '"avatarUrl" TEXT'],
        ["User", "avatarHistory", '"avatarHistory" TEXT DEFAULT \'[]\''],
      ];
      const missingAvatarColumns = await getMissingColumns(
        avatarColumnChecks.map(([table, column]): [string, string] => [table, column])
      );
      await executeDdlBatch([
        ...buildAddColumnStatements(avatarColumnChecks, missingAvatarColumns),
        `CREATE TABLE IF NOT EXISTS "WhatsNewEntry" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "message" TEXT NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,
      ]);
    } catch {
    } finally {
      ensuredAvatarWhatsNew = true;
      ensuringAvatarWhatsNew = false;
      ensureAvatarWhatsNewPromise = null;
    }
  })();
  return ensureAvatarWhatsNewPromise;
}

let ensuringUserTheme = false;
let ensuredUserTheme = false;
let ensureUserThemePromise: Promise<void> | null = null;

export async function ensureUserThemeSchema(): Promise<void> {
  if (ensuredUserTheme) return;
  if (ensuringUserTheme && ensureUserThemePromise) return ensureUserThemePromise;
  ensuringUserTheme = true;
  ensureUserThemePromise = (async () => {
    try {
      await ensureColumnIfMissing("User", "themePreference", '"themePreference" TEXT DEFAULT \'default\'');
    } catch {
      // Keep theme preferences non-blocking for existing deployments.
    } finally {
      ensuredUserTheme = true;
      ensuringUserTheme = false;
      ensureUserThemePromise = null;
    }
  })();
  return ensureUserThemePromise;
}

let ensuringPremiumMode = false;
let ensuredPremiumMode = false;
let ensurePremiumModePromise: Promise<void> | null = null;

export async function ensurePremiumModeSchema(): Promise<void> {
  if (ensuredPremiumMode) return;
  if (ensuringPremiumMode && ensurePremiumModePromise) return ensurePremiumModePromise;
  ensuringPremiumMode = true;
  ensurePremiumModePromise = (async () => {
    try {
      await ensureColumnIfMissing("User", "premiumMode", '"premiumMode" INTEGER DEFAULT 0');
    } catch {
      // Keep premium mode non-blocking for existing deployments.
    } finally {
      ensuredPremiumMode = true;
      ensuringPremiumMode = false;
      ensurePremiumModePromise = null;
    }
  })();
  return ensurePremiumModePromise;
}

let ensuringPasswordReset = false;
let ensuredPasswordReset = false;
let ensurePasswordResetPromise: Promise<void> | null = null;

export async function ensurePasswordResetSchema(): Promise<void> {
  if (ensuredPasswordReset) return;
  if (ensuringPasswordReset && ensurePasswordResetPromise) return ensurePasswordResetPromise;
  ensuringPasswordReset = true;
  ensurePasswordResetPromise = (async () => {
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "token" TEXT NOT NULL UNIQUE,
          "expiresAt" DATETIME NOT NULL,
          "used" INTEGER NOT NULL DEFAULT 0,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `).catch(() => null);
    } catch {
    } finally {
      ensuredPasswordReset = true;
      ensuringPasswordReset = false;
      ensurePasswordResetPromise = null;
    }
  })();
  return ensurePasswordResetPromise;
}

let ensuringMarketplaceMetrics = false;
let ensuredMarketplaceMetrics = false;
let ensureMarketplaceMetricsPromise: Promise<void> | null = null;

export async function ensureMarketplaceMetricsSchema(): Promise<void> {
  if (ensuredMarketplaceMetrics) return;
  if (ensuringMarketplaceMetrics && ensureMarketplaceMetricsPromise) return ensureMarketplaceMetricsPromise;
  ensuringMarketplaceMetrics = true;
  ensureMarketplaceMetricsPromise = (async () => {
    try {
      await executeDdlBatch([
        `CREATE TABLE IF NOT EXISTS "ListingMetricSnapshot" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "inventoryId" TEXT NOT NULL,
          "marketplace" TEXT NOT NULL,
          "externalId" TEXT NOT NULL,
          "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "views" INTEGER NOT NULL DEFAULT 0,
          "watches" INTEGER NOT NULL DEFAULT 0,
          "favourites" INTEGER NOT NULL DEFAULT 0,
          "orders" INTEGER NOT NULL DEFAULT 0,
          "revenue" REAL NOT NULL DEFAULT 0,
          "currency" TEXT NOT NULL DEFAULT 'USD',
          "rawPayload" TEXT,
          "source" TEXT NOT NULL,
          CONSTRAINT "ListingMetricSnapshot_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        );`,
        `CREATE TABLE IF NOT EXISTS "ListingOpportunity" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "inventoryId" TEXT NOT NULL,
          "marketplace" TEXT NOT NULL,
          "externalId" TEXT,
          "currentViews" INTEGER NOT NULL DEFAULT 0,
          "currentWatches" INTEGER NOT NULL DEFAULT 0,
          "currentFavourites" INTEGER NOT NULL DEFAULT 0,
          "currentOrders" INTEGER NOT NULL DEFAULT 0,
          "currentRevenue" REAL NOT NULL DEFAULT 0,
          "currency" TEXT NOT NULL DEFAULT 'USD',
          "lastSyncedAt" DATETIME,
          "updatedAt" DATETIME NOT NULL
        );`,
        `DROP INDEX IF EXISTS "ListingOpportunity_inventoryId_key";`,
        `CREATE UNIQUE INDEX IF NOT EXISTS "ListingOpportunity_inventoryId_marketplace_key" ON "ListingOpportunity"("inventoryId", "marketplace");`,
        `CREATE INDEX IF NOT EXISTS "ListingMetricSnapshot_inventoryId_capturedAt_idx" ON "ListingMetricSnapshot"("inventoryId", "capturedAt");`,
        `CREATE INDEX IF NOT EXISTS "ListingMetricSnapshot_marketplace_capturedAt_idx" ON "ListingMetricSnapshot"("marketplace", "capturedAt");`,
        `CREATE UNIQUE INDEX IF NOT EXISTS "ListingMetricSnapshot_inventoryId_marketplace_externalId_capt_key" ON "ListingMetricSnapshot"("inventoryId", "marketplace", "externalId", "capturedAt");`,
        `CREATE INDEX IF NOT EXISTS "ListingOpportunity_marketplace_externalId_idx" ON "ListingOpportunity"("marketplace", "externalId");`,
        `CREATE INDEX IF NOT EXISTS "ListingOpportunity_lastSyncedAt_idx" ON "ListingOpportunity"("lastSyncedAt");`,
      ]);
    } catch {
    } finally {
      if (checkedTables) {
        checkedTables.set("ListingMetricSnapshot", true);
        checkedTables.set("ListingOpportunity", true);
      }
      ensuredMarketplaceMetrics = true;
      ensuringMarketplaceMetrics = false;
      ensureMarketplaceMetricsPromise = null;
    }
  })();
  return ensureMarketplaceMetricsPromise;
}

let ensuringPricingEngine = false;
let ensuredPricingEngine = false;
let ensurePricingEnginePromise: Promise<void> | null = null;

export async function ensurePricingEngineSchema(): Promise<void> {
  if (ensuredPricingEngine) return;
  if (ensuringPricingEngine && ensurePricingEnginePromise) return ensurePricingEnginePromise;
  ensuringPricingEngine = true;
  ensurePricingEnginePromise = (async () => {
    try {
      // Invoice/Sale internal cost columns (checked in one round trip below)
      const pricingColumnChecks: Array<[string, string, string]> = [];
      for (const col of [
        "internalShippingCost",
        "internalPackagingCost",
        "internalInsuranceCost",
        "internalHandlingCost",
        "internalOtherCharges",
        "internalCostTotal",
      ]) {
        pricingColumnChecks.push(["Invoice", col, `"${col}" REAL NOT NULL DEFAULT 0`]);
        pricingColumnChecks.push(["Sale", col, `"${col}" REAL NOT NULL DEFAULT 0`]);
      }
      pricingColumnChecks.push(["Sale", "actualProfit", '"actualProfit" REAL']);
      const missingPricingColumns = await getMissingColumns(
        pricingColumnChecks.map(([table, column]): [string, string] => [table, column])
      );

      // Seed marketplace profiles
      const profiles: Array<[string, string, string, number, number]> = [
        ["SHOPIFY", "Shopify", "USD", 0, 0],
        ["ETSY", "Etsy", "USD", 1, 0],
        ["EBAY", "eBay", "USD", 0, 0],
        ["AMAZON", "Amazon", "USD", 0, 0],
        ["WEBSITE", "Website", "INR", 0, 0],
        ["WHOLESALE", "Wholesale", "INR", 0, 0],
        ["OFFLINE", "Offline Sales", "INR", 0, 0],
      ];
      const profileInserts: DdlStatement[] = profiles.map(([name, displayName, currency, isDefault, marginValue]) => ({
        sql: `INSERT OR IGNORE INTO "MarketplaceProfile" ("id", "name", "displayName", "currency", "isActive", "isDefault", "marginType", "marginValue", "createdAt", "updatedAt")
           VALUES (?, ?, ?, ?, 1, ?, 'PERCENT', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        args: [crypto.randomUUID(), name, displayName, currency, isDefault, marginValue],
      }));

      // Seed currency rates (INR base)
      const currencies: Array<[string, number, number]> = [
        ["INR", 1, 1],
        ["USD", 0, 0],
        ["EUR", 0, 0],
        ["GBP", 0, 0],
        ["AUD", 0, 0],
        ["CAD", 0, 0],
        ["SGD", 0, 0],
        ["AED", 0, 0],
        ["JPY", 0, 0],
        ["CHF", 0, 0],
        ["CNY", 0, 0],
        ["HKD", 0, 0],
        ["NZD", 0, 0],
        ["SAR", 0, 0],
        ["QAR", 0, 0],
        ["KWD", 0, 0],
        ["ZAR", 0, 0],
        ["THB", 0, 0],
        ["MYR", 0, 0],
      ];
      const currencyInserts: DdlStatement[] = currencies.map(([code, rateToInr, isBase]) => ({
        sql: `INSERT OR IGNORE INTO "CurrencyRate" ("id", "code", "rateToInr", "isBase", "updatedAt")
           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        args: [crypto.randomUUID(), code, rateToInr, isBase],
      }));

      await executeDdlBatch([
        // MarketplaceProfile
        `CREATE TABLE IF NOT EXISTS "MarketplaceProfile" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "displayName" TEXT NOT NULL,
          "currency" TEXT NOT NULL DEFAULT 'INR',
          "isActive" INTEGER NOT NULL DEFAULT 1,
          "isDefault" INTEGER NOT NULL DEFAULT 0,
          "marginType" TEXT NOT NULL DEFAULT 'PERCENT',
          "marginValue" REAL NOT NULL DEFAULT 0,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE UNIQUE INDEX IF NOT EXISTS "MarketplaceProfile_name_key" ON "MarketplaceProfile"("name");`,
        // MarketplaceCharge
        `CREATE TABLE IF NOT EXISTS "MarketplaceCharge" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "profileId" TEXT NOT NULL,
          "chargeKey" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "enabled" INTEGER NOT NULL DEFAULT 1,
          "amountType" TEXT NOT NULL DEFAULT 'PERCENT',
          "amount" REAL NOT NULL DEFAULT 0,
          "countryCode" TEXT,
          "sortOrder" INTEGER NOT NULL DEFAULT 0,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "MarketplaceCharge_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "MarketplaceProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        );`,
        `CREATE INDEX IF NOT EXISTS "MarketplaceCharge_profileId_idx" ON "MarketplaceCharge"("profileId");`,
        // CurrencyRate
        `CREATE TABLE IF NOT EXISTS "CurrencyRate" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "code" TEXT NOT NULL,
          "rateToInr" REAL NOT NULL DEFAULT 0,
          "isBase" INTEGER NOT NULL DEFAULT 0,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE UNIQUE INDEX IF NOT EXISTS "CurrencyRate_code_key" ON "CurrencyRate"("code");`,
        // Invoice / Sale internal cost columns
        ...buildAddColumnStatements(pricingColumnChecks, missingPricingColumns),
        // Performance indexes
        `CREATE INDEX IF NOT EXISTS "Inventory_origin_idx" ON "Inventory"("origin");`,
        `CREATE INDEX IF NOT EXISTS "Inventory_hsnCode_idx" ON "Inventory"("hsn_code");`,
        `CREATE INDEX IF NOT EXISTS "Inventory_hideFromAttention_idx" ON "Inventory"("hideFromAttention");`,
        `CREATE INDEX IF NOT EXISTS "Inventory_status_sellingPrice_idx" ON "Inventory"("status", "sellingPrice");`,
        // Seed marketplace profiles
        ...profileInserts,
        // Seed currency rates (INR base)
        ...currencyInserts,
        // Feature flags / defaults
        {
          sql: `INSERT OR IGNORE INTO "Setting" ("id", "key", "value", "description", "updatedAt")
         VALUES (?, 'default_marketplace', 'ETSY', 'Marketplace profile used for single-row MSP/MRP planning in the Opportunity Report', CURRENT_TIMESTAMP)`,
          args: [crypto.randomUUID()],
        },
        {
          sql: `INSERT OR IGNORE INTO "Setting" ("id", "key", "value", "description", "updatedAt")
         VALUES (?, 'pricing_engine_enabled', 'false', 'Enables the pricing analysis view in the Opportunity Report', CURRENT_TIMESTAMP)`,
          args: [crypto.randomUUID()],
        },
      ]);
    } catch (e) {
      console.error("ensurePricingEngineSchema failed:", e);
    } finally {
      ensuredPricingEngine = true;
      ensuringPricingEngine = false;
      ensurePricingEnginePromise = null;
    }
  })();
  return ensurePricingEnginePromise;
}
