import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";

config({ path: ".env.local", override: true });
config({ path: ".env" });

const { createClient } = await import("@libsql/client");

function parseLibsqlCredentials(rawUrl) {
  const normalized = rawUrl.startsWith("https://") ? rawUrl.replace(/^https:\/\//, "libsql://") : rawUrl;
  const [base, query = ""] = normalized.split("?");
  const authToken =
    new URLSearchParams(query).get("authToken") ??
    process.env.TURSO_AUTH_TOKEN ??
    process.env.TURSO_TOKEN ??
    undefined;
  return { url: base, authToken };
}

const rawUrl = process.env.DATABASE_URL || "";
if (!rawUrl) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const BASELINE_FOLDERS = [
  "20260605182431_add_category_gemtype_banners",
  "20260627201547_repurpose_listing_opportunity",
  "20260628003224_listing_opportunity_composite_unique",
  "20260710_add_activitylog_idempotency",
];

const client = createClient(parseLibsqlCredentials(rawUrl));

async function main() {
  const existing = await client.execute("SELECT migration_name FROM _prisma_migrations").catch(() => {
    return { rows: [] };
  });
  const applied = new Set(existing.rows.map((r) => String(r.migration_name)));

  const now = new Date().toISOString();
  let inserted = 0;
  for (const folder of BASELINE_FOLDERS) {
    if (applied.has(folder)) continue;
    const filePath = path.join(process.cwd(), "prisma", "migrations", folder, "migration.sql");
    const sql = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8") : "";
    const checksum = crypto.createHash("sha256").update(sql).digest("hex");
    await client.execute(
      `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
       VALUES (?, ?, ?, ?, NULL, NULL, ?, 1)`,
      [crypto.randomUUID(), checksum, now, folder, now]
    );
    inserted++;
    console.log(`Baselined (recorded as applied): ${folder}`);
  }
  console.log(`Done. Inserted ${inserted} migration record(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => client.close());
