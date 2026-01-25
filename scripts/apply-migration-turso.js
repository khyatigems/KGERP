/* eslint-disable @typescript-eslint/no-var-requires */
const { createClient } = require("@libsql/client");
const fs = require("fs");
const path = require("path");

const url = "libsql://kgerpv3-kgadmin.aws-ap-south-1.turso.io?authToken=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Njg3MjUyNjcsImlkIjoiMjYzNDYwMjMtZTE0MC00ZGY3LWI1NDUtY2NkNjg5ZTg2MzE2IiwicmlkIjoiYWFmMjRkMmYtZThkMy00OTQ5LWE1N2QtMmE2YjM4ZmZlYmQ0In0.0idoOalryMWXJl73MhGd2xrSh2l2Ru824i3iww7dH98Fch9L6heP7W4mC9KmyfDbVBr26BhnPyVCRX0-1ApjBA";

if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const client = createClient({
  url: url,
});

const MIGRATIONS = [
  "20260118091343_init",
  "20260122092303_v3_quotations_overhaul",
  "20260123091741_sync_schema_db",
  "20260124175916_fix_invoice_schema"
];

async function applyMigration(migrationName) {
  const migrationPath = path.join(__dirname, `../prisma/migrations/${migrationName}/migration.sql`);
  console.log(`\n--- Processing ${migrationName} ---`);
  
  if (!fs.existsSync(migrationPath)) {
      console.error(`Migration file not found: ${migrationPath}`);
      return;
  }

  let sqlContent = fs.readFileSync(migrationPath, "utf-8");
  
  // Patch SQL: DROP INDEX resiliency
  sqlContent = sqlContent.replace(/DROP INDEX "([^"]+)"/g, 'DROP INDEX IF EXISTS "$1"');

  // Split into statements
  // Naive split by semicolon at end of line or followed by newline
  // We remove empty statements
  const statements = sqlContent
    .split(/;\s*[\r\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`Found ${statements.length} statements.`);

  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (const statement of statements) {
      // Skip comments
      if (statement.startsWith("--") || statement.startsWith("/*")) {
          // Check if it's purely a comment block
          // But usually statements might start with comment.
          // Let's just run it, Turso/SQLite ignores comments.
      }

      try {
          await client.execute(statement);
          successCount++;
      } catch (e) {
          const msg = e.message || String(e);
          // Permissive error handling for "catch up"
          if (
              msg.includes("already exists") || 
              msg.includes("duplicate column name") ||
              msg.includes("no such index") ||
              msg.includes("no such table") && statement.toUpperCase().includes("DROP") // DROP TABLE if not exists
          ) {
              skipCount++;
              // console.log(`  - Skipped (already applied): ${statement.substring(0, 50)}...`);
          } else {
              console.error(`  X Failed: ${statement.substring(0, 100)}...`);
              console.error(`    Error: ${msg}`);
              failCount++;
              // We continue even on failure to try to apply the rest (e.g. creating missing tables)
          }
      }
  }
  
  console.log(`Result: ${successCount} ok, ${skipCount} skipped, ${failCount} failed.`);
}

async function main() {
  try {
    for (const migration of MIGRATIONS) {
        await applyMigration(migration);
    }
    console.log("\nAll migrations processed.");
  } catch (e) {
    console.error("\nMigration process stopped due to error:", e);
    process.exit(1);
  }
}

main();
