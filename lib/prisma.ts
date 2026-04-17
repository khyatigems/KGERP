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
    // Build client options based on database type
    const clientOptions: any = {
      log: isProd ? ['error', 'warn'] : ['query', 'error', 'warn'],
    };
    
    // Only configure adapter for LibSQL/Turso (not for local SQLite)
    if (isLibsql && adapter) {
      clientOptions.adapter = adapter;
    } else {
      // For local SQLite, configure datasource
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

async function tableHasColumn(tableName: string, columnName: string): Promise<boolean> {
  const columns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    `PRAGMA table_info("${tableName}")`
  );
  return Array.isArray(columns) && columns.some((col) => col.name === columnName);
}

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

  for (const [table, column] of checks) {
    if (!(await tableHasColumn(table, column))) {
      return true;
    }
  }
  return false;
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

      await ensureColumnIfMissing("Invoice", "invoiceType", '"invoiceType" TEXT DEFAULT "TAX"');
      await ensureColumnIfMissing("Invoice", "iecCode", '"iecCode" TEXT');
      await ensureColumnIfMissing("Invoice", "exportType", '"exportType" TEXT');
      await ensureColumnIfMissing(
        "Invoice",
        "countryOfDestination",
        '"countryOfDestination" TEXT'
      );
      await ensureColumnIfMissing("Invoice", "portOfDispatch", '"portOfDispatch" TEXT');
      await ensureColumnIfMissing(
        "Invoice",
        "modeOfTransport",
        '"modeOfTransport" TEXT'
      );
      await ensureColumnIfMissing("Invoice", "courierPartner", '"courierPartner" TEXT');
      await ensureColumnIfMissing("Invoice", "trackingId", '"trackingId" TEXT');
      await ensureColumnIfMissing("Invoice", "invoiceCurrency", '"invoiceCurrency" TEXT');
      await ensureColumnIfMissing("Invoice", "conversionRate", '"conversionRate" REAL');
      await ensureColumnIfMissing("Invoice", "totalInrValue", '"totalInrValue" REAL');
      await ensureColumnIfMissing("CompanySettings", "invoicePrefix", '"invoicePrefix" TEXT');
      await ensureColumnIfMissing(
        "CompanySettings",
        "invoicingStartNumber",
        '"invoicingStartNumber" INTEGER'
      );
      await ensureColumnIfMissing("CompanySettings", "invoiceLogoUrl", '"invoiceLogoUrl" TEXT');
      await ensureColumnIfMissing("CompanySettings", "quotationLogoUrl", '"quotationLogoUrl" TEXT');
      await ensureColumnIfMissing("CompanySettings", "logoUrl", '"logoUrl" TEXT');
      await ensureColumnIfMissing("CompanySettings", "skuViewLogoUrl", '"skuViewLogoUrl" TEXT');
      await ensureColumnIfMissing("CompanySettings", "otherDocsLogoUrl", '"otherDocsLogoUrl" TEXT');
      await ensureColumnIfMissing("CompanySettings", "address", '"address" TEXT');
      await ensureColumnIfMissing("CompanySettings", "email", '"email" TEXT');
      await ensureColumnIfMissing("CompanySettings", "phone", '"phone" TEXT');
      await ensureColumnIfMissing("CompanySettings", "website", '"website" TEXT');
      await ensureColumnIfMissing("CompanySettings", "gstin", '"gstin" TEXT');
      await ensureColumnIfMissing(
        "CompanySettings",
        "enableExportInvoice",
        '"enableExportInvoice" INTEGER NOT NULL DEFAULT 0'
      );
      await ensureColumnIfMissing("CompanySettings", "defaultExportType", '"defaultExportType" TEXT');
      await ensureColumnIfMissing("CompanySettings", "companyIec", '"companyIec" TEXT');
      await ensureColumnIfMissing("CompanySettings", "defaultCurrency", '"defaultCurrency" TEXT');
      await ensureColumnIfMissing(
        "CompanySettings",
        "defaultPort",
        '"defaultPort" TEXT'
      );
      await ensureColumnIfMissing(
        "CompanySettings",
        "swiftCode",
        '"swiftCode" TEXT'
      );
      await ensureColumnIfMissing(
        "CompanySettings",
        "termsAndConditions",
        '"termsAndConditions" TEXT'
      );
      await ensureColumnIfMissing(
        "CompanySettings",
        "createdAt",
        '"createdAt" DATETIME'
      );
      await ensureColumnIfMissing(
        "CompanySettings",
        "updatedAt",
        '"updatedAt" DATETIME'
      );
      await prisma.$executeRawUnsafe(
        'UPDATE "CompanySettings" SET "createdAt" = COALESCE("createdAt", CURRENT_TIMESTAMP)'
      );
      await prisma.$executeRawUnsafe(
        'UPDATE "CompanySettings" SET "updatedAt" = COALESCE("updatedAt", CURRENT_TIMESTAMP)'
      );
      await ensureColumnIfMissing(
        "PaymentSettings",
        "swiftCode",
        '"swiftCode" TEXT'
      );
      // Add exportTerms to InvoiceSettings for export invoice specific terms
      await ensureColumnIfMissing("InvoiceSettings", "exportTerms", '"exportTerms" TEXT');

      // Ensure CustomerAdvance and CustomerAdvanceAdjustment tables exist
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "CustomerAdvance" (
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
        );
      `).catch(() => null);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CustomerAdvance_customerId_idx" ON "CustomerAdvance"("customerId");`).catch(() => null);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "CustomerAdvanceAdjustment" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "advanceId" TEXT NOT NULL,
          "saleId" TEXT NOT NULL,
          "amountUsed" REAL NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `).catch(() => null);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CustomerAdvanceAdjustment_advanceId_idx" ON "CustomerAdvanceAdjustment"("advanceId");`).catch(() => null);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CustomerAdvanceAdjustment_saleId_idx" ON "CustomerAdvanceAdjustment"("saleId");`).catch(() => null);

      // Ensure Sale.usdPrice column exists
      await ensureColumnIfMissing("Sale", "usdPrice", '"usdPrice" REAL');

      // Ensure Invoice.totalUsdValue column exists
      await ensureColumnIfMissing("Invoice", "totalUsdValue", '"totalUsdValue" REAL');

      // Ensure ExportInvoice table exists (used by export invoice flow)
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "ExportInvoice" (
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
        );
      `).catch(() => null);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ExportInvoice_invoiceId_idx" ON "ExportInvoice"("invoiceId");`).catch(() => null);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ExportInvoice_customsDeclarationNumber_idx" ON "ExportInvoice"("customsDeclarationNumber");`).catch(() => null);
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

let ensuringSalesReturnReplacement = false;
let ensuredSalesReturnReplacement = false;
let ensureSalesReturnReplacementPromise: Promise<void> | null = null;

export async function ensureSalesReturnReplacementSchema(): Promise<void> {
  if (ensuredSalesReturnReplacement) return;
  if (ensuringSalesReturnReplacement && ensureSalesReturnReplacementPromise) return ensureSalesReturnReplacementPromise;
  ensuringSalesReturnReplacement = true;
  ensureSalesReturnReplacementPromise = (async () => {
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "SalesReturnReplacement" (
          "salesReturnId" TEXT NOT NULL PRIMARY KEY,
          "invoiceId" TEXT NOT NULL,
          "memoId" TEXT,
          "createdBy" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SalesReturnReplacement_invoiceId_idx" ON "SalesReturnReplacement"("invoiceId");`);
    } catch {
    } finally {
      checkedTables = null;
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
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "OfferBanner" (
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
        );
      `);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "OfferBanner_displayOn_idx" ON "OfferBanner"("displayOn");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "OfferBanner_isActive_idx" ON "OfferBanner"("isActive");`);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Coupon" (
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
        );
      `);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Coupon_code_idx" ON "Coupon"("code");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Coupon_isActive_idx" ON "Coupon"("isActive");`);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "CouponRedemption" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "couponId" TEXT NOT NULL,
          "invoiceId" TEXT,
          "customerId" TEXT,
          "discountAmount" REAL NOT NULL DEFAULT 0,
          "redeemedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CouponRedemption_couponId_idx" ON "CouponRedemption"("couponId");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CouponRedemption_invoiceId_idx" ON "CouponRedemption"("invoiceId");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CouponRedemption_customerId_idx" ON "CouponRedemption"("customerId");`);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "LoyaltyLedger" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "customerId" TEXT NOT NULL,
          "invoiceId" TEXT,
          "type" TEXT NOT NULL,
          "points" REAL NOT NULL DEFAULT 0,
          "rupeeValue" REAL NOT NULL DEFAULT 0,
          "remarks" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "LoyaltyLedger_customerId_idx" ON "LoyaltyLedger"("customerId");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "LoyaltyLedger_invoiceId_idx" ON "LoyaltyLedger"("invoiceId");`);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "MessageTemplate" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "key" TEXT NOT NULL UNIQUE,
          "title" TEXT NOT NULL,
          "body" TEXT NOT NULL,
          "channel" TEXT NOT NULL DEFAULT 'WHATSAPP_WEB',
          "isActive" INTEGER NOT NULL DEFAULT 1,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "CustomerCampaignLog" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "customerId" TEXT NOT NULL,
          "eventType" TEXT NOT NULL,
          "channel" TEXT NOT NULL,
          "templateKey" TEXT,
          "payload" TEXT,
          "status" TEXT NOT NULL,
          "openedAt" DATETIME,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CustomerCampaignLog_customerId_idx" ON "CustomerCampaignLog"("customerId");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CustomerCampaignLog_eventType_idx" ON "CustomerCampaignLog"("eventType");`);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "CustomerProfileExtra" (
          "customerId" TEXT NOT NULL PRIMARY KEY,
          "dateOfBirth" DATETIME,
          "anniversaryDate" DATETIME,
          "communicationOptIn" INTEGER NOT NULL DEFAULT 1,
          "preferredLanguage" TEXT,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "InvoicePromotionSettings" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "dobRewardAmount" REAL NOT NULL DEFAULT 0,
          "anniversaryRewardAmount" REAL NOT NULL DEFAULT 0,
          "enableReviewCta" INTEGER NOT NULL DEFAULT 1,
          "enableReferralCta" INTEGER NOT NULL DEFAULT 0,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "LoyaltySettings" (
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
        );
      `);

      await ensureColumnIfMissing("Customer", "stateCode", '"stateCode" TEXT');
      await ensureColumnIfMissing("Customer", "countryCode", '"countryCode" TEXT');
      await ensureColumnIfMissing(
        "Customer",
        "isInternational",
        '"isInternational" INTEGER NOT NULL DEFAULT 0'
      );
      await ensureColumnIfMissing("Invoice", "invoiceType", '"invoiceType" TEXT DEFAULT "TAX"');
      await ensureColumnIfMissing("Invoice", "iecCode", '"iecCode" TEXT');
      await ensureColumnIfMissing("Invoice", "exportType", '"exportType" TEXT');
      await ensureColumnIfMissing(
        "Invoice",
        "countryOfDestination",
        '"countryOfDestination" TEXT'
      );
      await ensureColumnIfMissing("Invoice", "portOfDispatch", '"portOfDispatch" TEXT');
      await ensureColumnIfMissing(
        "Invoice",
        "modeOfTransport",
        '"modeOfTransport" TEXT'
      );
      await ensureColumnIfMissing("Invoice", "courierPartner", '"courierPartner" TEXT');
      await ensureColumnIfMissing("Invoice", "trackingId", '"trackingId" TEXT');
      await ensureColumnIfMissing("Invoice", "invoiceCurrency", '"invoiceCurrency" TEXT');
      await ensureColumnIfMissing(
        "Invoice",
        "conversionRate",
        '"conversionRate" REAL'
      );
      await ensureColumnIfMissing("Invoice", "totalInrValue", '"totalInrValue" REAL');
      await ensureColumnIfMissing("Customer", "dateOfBirth", '"dateOfBirth" DATETIME');
      await ensureColumnIfMissing("Customer", "anniversaryDate", '"anniversaryDate" DATETIME');
      await ensureColumnIfMissing(
        "Customer",
        "communicationOptIn",
        '"communicationOptIn" INTEGER NOT NULL DEFAULT 1'
      );
      await ensureColumnIfMissing("Customer", "preferredLanguage", '"preferredLanguage" TEXT');
      await ensureColumnIfMissing(
        "LoyaltySettings",
        "dobProfilePoints",
        '"dobProfilePoints" REAL NOT NULL DEFAULT 0'
      );
      await ensureColumnIfMissing(
        "LoyaltySettings",
        "anniversaryProfilePoints",
        '"anniversaryProfilePoints" REAL NOT NULL DEFAULT 0'
      );
      await ensureColumnIfMissing(
        "CouponRedemption",
        "discountAmount",
        '"discountAmount" REAL NOT NULL DEFAULT 0'
      );
      await ensureColumnIfMissing(
        "CouponRedemption",
        "redeemedAt",
        '"redeemedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP'
      );
    } catch {
    } finally {
      checkedTables = null;
      ensuredBillfreePhase1 = true;
      ensuringBillfreePhase1 = false;
      ensureBillfreePhase1Promise = null;
    }
  })();
  return ensureBillfreePhase1Promise;
}
