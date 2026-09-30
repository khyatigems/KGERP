import { createClient } from "@libsql/client";
import crypto from "node:crypto";
import fs from "node:fs";

const client = createClient({ url: process.env.DATABASE_URL });
const sha256 = (c) => crypto.createHash("sha256").update(c).digest("hex");
const split = (sql) => String(sql).split(";").map((s) => s.trim()).filter(Boolean);
const ignorable = (t) => t.includes("already exists") || t.includes("duplicate column name") || t.includes("UNIQUE constraint failed") || (t.includes("index") && t.includes("already exists"));

const step = async (label, fn) => {
  process.stdout.write(`[apply] ${label}\n`);
  try { return await fn(); }
  catch (e) {
    console.error(`[apply] FAILED at ${label}:`, e?.message);
    if (e?.cause) console.error("  cause:", e.cause.message || e.cause, e.cause.code || "");
    if (e?.stack) console.error(e.stack.split("\n").slice(0, 6).join("\n"));
    process.exit(1);
  }
};

const applied = await step("read _prisma_migrations", async () => {
  const r = await client.execute("SELECT migration_name FROM _prisma_migrations");
  return new Set(r.rows.map((x) => String(x.migration_name)));
});
console.log("[apply] applied:", applied.size);

const folders = fs.readdirSync("prisma/migrations").filter((n) => fs.statSync(`prisma/migrations/${n}`).isDirectory()).sort();
const pending = folders.filter((f) => !applied.has(f));
console.log("[apply] pending:", JSON.stringify(pending));

const now = new Date().toISOString();
for (const folder of pending) {
  const sql = fs.readFileSync(`prisma/migrations/${folder}/migration.sql`, "utf-8");
  for (const stmt of split(sql)) {
    try {
      await client.execute(stmt);
      console.log(`[apply] ok: ${stmt.slice(0, 70).replace(/\s+/g, " ")}...`);
    } catch (e) {
      const t = e?.message || String(e);
      if (ignorable(t)) { console.log(`[apply] skip (${t.slice(0, 60)}): ${stmt.slice(0, 50).replace(/\s+/g, " ")}...`); continue; }
      console.error(`[apply] ERROR in ${folder}:`, t);
      if (e?.cause) console.error("  cause:", e.cause.message || e.cause);
      process.exit(1);
    }
  }
  await client.execute(
    `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
     VALUES (?, ?, ?, ?, NULL, NULL, ?, 1)`,
    [crypto.randomUUID(), sha256(sql), now, folder, now]
  );
  console.log(`[apply] recorded: ${folder}`);
}
console.log("[apply] done");
