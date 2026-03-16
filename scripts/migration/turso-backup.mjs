import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createLibsqlClientFromEnv, getDatabaseUrl } from "./libsql-client.mjs";

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

async function backupLibsql(outputDir) {
  const client = createLibsqlClientFromEnv();
  if (!client) throw new Error("Expected LibSQL client for Turso backup");

  const tablesResult = await client.execute(`
    SELECT name FROM sqlite_master
    WHERE type='table'
      AND name NOT LIKE 'sqlite_%'
    ORDER BY name ASC
  `);
  const tableNames = tablesResult.rows.map((row) => String(row.name));
  const backup = {
    createdAt: new Date().toISOString(),
    databaseUrlMasked: getDatabaseUrl().split("?")[0],
    tables: [],
    checksums: {}
  };

  let current = 0;
  for (const table of tableNames) {
    current += 1;
    process.stdout.write(`[backup] ${current}/${tableNames.length} ${table}\n`);
    const countResult = await client.execute(`SELECT COUNT(*) AS count FROM "${table}"`);
    const rowCount = Number(countResult.rows[0]?.count || 0);
    const rowsResult = await client.execute(`SELECT * FROM "${table}"`);
    const rows = rowsResult.rows;
    const payload = JSON.stringify(rows);
    backup.tables.push({ table, rowCount, rows });
    backup.checksums[table] = sha256(payload);
  }

  const filePath = path.join(outputDir, `turso-backup-${timestamp()}.json`);
  fs.writeFileSync(filePath, JSON.stringify(backup, null, 2), "utf-8");
  process.stdout.write(`[backup] written ${filePath}\n`);
  return filePath;
}

async function backupSqliteFile(outputDir, fileUrl) {
  const filePath = fileUrl.replace(/^file:/, "");
  const absolute = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  if (!fs.existsSync(absolute)) {
    throw new Error(`SQLite file not found: ${absolute}`);
  }
  const dest = path.join(outputDir, `sqlite-backup-${timestamp()}.db`);
  fs.copyFileSync(absolute, dest);
  process.stdout.write(`[backup] sqlite copy ${dest}\n`);
  return dest;
}

async function run() {
  const rawUrl = getDatabaseUrl();
  const outputDir = path.join(process.cwd(), "migration-artifacts", "backups");
  fs.mkdirSync(outputDir, { recursive: true });
  if (rawUrl.startsWith("file:")) {
    await backupSqliteFile(outputDir, rawUrl);
    return;
  }
  await backupLibsql(outputDir);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
