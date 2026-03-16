import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createLibsqlClientFromEnv, getDatabaseUrl } from "./libsql-client.mjs";

function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

async function collectSnapshot() {
  const rawUrl = getDatabaseUrl();
  if (rawUrl.startsWith("file:")) {
    const dbPath = rawUrl.replace(/^file:/, "");
    const absolute = path.isAbsolute(dbPath) ? dbPath : path.join(process.cwd(), dbPath);
    const bytes = fs.existsSync(absolute) ? fs.statSync(absolute).size : 0;
    return { mode: "sqlite", file: absolute, bytes };
  }

  const client = createLibsqlClientFromEnv();
  if (!client) throw new Error("LibSQL client initialization failed");
  const tablesResult = await client.execute(`
    SELECT name FROM sqlite_master
    WHERE type='table'
      AND name NOT LIKE 'sqlite_%'
    ORDER BY name ASC
  `);
  const tableNames = tablesResult.rows.map((row) => String(row.name));
  const tables = [];
  for (const table of tableNames) {
    const countResult = await client.execute(`SELECT COUNT(*) AS count FROM "${table}"`);
    const rowCount = Number(countResult.rows[0]?.count || 0);
    const sampleResult = await client.execute(`SELECT * FROM "${table}" LIMIT 100`);
    const checksum = sha256(JSON.stringify(sampleResult.rows));
    tables.push({ table, rowCount, sampleChecksum: checksum });
  }
  return { mode: "libsql", tables };
}

async function run() {
  const snapshot = await collectSnapshot();
  const outputDir = path.join(process.cwd(), "migration-artifacts", "validation");
  fs.mkdirSync(outputDir, { recursive: true });
  const filePath = path.join(outputDir, `validation-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), "utf-8");
  process.stdout.write(`[validate] wrote ${filePath}\n`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
