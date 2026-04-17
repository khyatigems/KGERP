import { createClient } from "@libsql/client";

const databaseUrl = process.env.DATABASE_URL || "";

if (!databaseUrl || !databaseUrl.startsWith("libsql://")) {
  console.error("Please set DATABASE_URL to a Turso libsql:// URL");
  process.exit(1);
}

const url = databaseUrl.split("?")[0];
const authToken = new URLSearchParams(databaseUrl.split("?")[1] || "").get("authToken") || undefined;

const client = createClient({ url, authToken });

async function createTable() {
  try {
    // Create ExportInvoice table
    await client.execute(`
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
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes
    await client.execute(`
      CREATE INDEX IF NOT EXISTS "ExportInvoice_invoiceId_idx" ON "ExportInvoice"("invoiceId")
    `);
    
    await client.execute(`
      CREATE INDEX IF NOT EXISTS "ExportInvoice_customsDeclarationNumber_idx" ON "ExportInvoice"("customsDeclarationNumber")
    `);

    console.log("✅ ExportInvoice table created successfully!");
  } catch (error) {
    console.error("Error creating table:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

createTable();
