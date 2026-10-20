import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
async function main() {
 const temp = mkdtempSync(path.join(tmpdir(), "kg-weekly-"));
 process.env.DATABASE_URL = `file:${path.join(temp, "test.db").replaceAll("\\", "/")}`; process.env.TURSO_DATABASE_URL = ""; process.env.TURSO_URL = "";
 const { prisma } = await import("@/lib/prisma");
 try {
  const sql = execFileSync(process.execPath, [path.resolve("node_modules/prisma/build/index.js"), "migrate", "diff", "--from-empty", "--to-schema-datamodel", "prisma/schema.prisma", "--script"], { encoding: "utf8" });
  for (const statement of sql.split(";").map(x => x.replace(/--[^\n]*/g, "").trim()).filter(Boolean)) if (!/CREATE (?:TABLE|UNIQUE INDEX|INDEX) "WeeklyReport/.test(statement)) await prisma.$executeRawUnsafe(statement);
  const { ensureWeeklyReportSchema, weeklyReportDdl } = await import("@/lib/weekly-report/schema");
  await Promise.all([ensureWeeklyReportSchema(), ensureWeeklyReportSchema()]);
  const migration = readFileSync("prisma/migrations/20261020020000_weekly_business_reports/migration.sql", "utf8");
  for (const statement of migration.split(";").map(x => x.replace(/--[^\n]*/g, "").trim()).filter(Boolean)) await prisma.$executeRawUnsafe(statement);
  assert.ok(weeklyReportDdl.length > 5);
  const diff = execFileSync(process.execPath, [path.resolve("node_modules/prisma/build/index.js"), "migrate", "diff", "--from-url", process.env.DATABASE_URL!, "--to-schema-datamodel", "prisma/schema.prisma", "--script"], { encoding: "utf8" }); assert.match(diff, /empty migration/);
  const { createRun, generateRun, deliverRun, readSettings, saveSettings, dispatch } = await import("@/lib/weekly-report/service");
  const { defaultSettings, settingsKey } = await import("@/lib/weekly-report/config");
  const { ZohoMailConnector } = await import("@/lib/email/connectors/zoho");
  const { handleWeeklyReports } = await import("@/lib/weekly-report/http");
  const unauthenticated = (async () => null) as never, authenticated = (async () => ({ user: { id: "admin" } })) as never;
  assert.equal((await handleWeeklyReports(new Request("https://erp.test/api/settings/weekly-reports"), { params: Promise.resolve({}) }, unauthenticated)).status, 401);
  assert.equal((await handleWeeklyReports(new Request("https://erp.test/api/settings/weekly-reports/runs/private/pdf"), { params: Promise.resolve({ path: ["runs", "private", "pdf"] }) }, authenticated, async () => false)).status, 403);
  assert.equal((await handleWeeklyReports(new Request("https://erp.test/api/settings/weekly-reports", { method: "PUT", headers: { origin: "https://evil.test" } }), { params: Promise.resolve({}) }, authenticated, async () => true)).status, 403);
  const s = { ...structuredClone(defaultSettings), deliveryEnabled: true, recipients: [{ email: "one@example.com", enabled: true }, { email: "two@example.com", enabled: true }] };
  await assert.rejects(saveSettings(s, null, "admin", true), /preview/);
  await prisma.setting.create({ data: { key: settingsKey, value: JSON.stringify(s) } }); // isolated fixture, not a production enablement
  const scheduled = new Date("2026-10-26T03:30:00Z");
  const runs = await Promise.all([createRun("LIVE", s, undefined, scheduled), createRun("LIVE", s, undefined, scheduled)]); assert.equal(runs[0].id, runs[1].id); assert.equal(await prisma.weeklyReportRun.count(), 1);
  const { buildMetrics } = await import("@/lib/weekly-report/metrics");
  const metrics = buildMetrics({ inventory: [], orders: [], listings: [], shops: [], syncs: [], sales: [], returns: [], coverage: [] }, s, scheduled);
  let renders = 0;
  const pdf = Buffer.from("%PDF-1.7\n" + " ".repeat(1100) + "\n%%EOF");
  const dependencies = { collectMetrics: async () => metrics, renderReport: async () => { renders++; await new Promise(r => setTimeout(r, 50)); return pdf; } };
  await Promise.all([generateRun(runs[0].id, dependencies), generateRun(runs[0].id, dependencies)]); assert.equal(renders, 1);
  const downloaded = await handleWeeklyReports(new Request(`https://erp.test/api/settings/weekly-reports/runs/${runs[0].id}/pdf`), { params: Promise.resolve({ path: ["runs", runs[0].id, "pdf"] }) }, authenticated, async () => true);
  assert.equal(downloaded.status, 200); assert.equal(downloaded.headers.get("Cache-Control"), "private, no-store"); assert.equal((await downloaded.arrayBuffer()).byteLength, pdf.length);
  const original = ZohoMailConnector.prototype.send;
  const calls: string[] = [];
  ZohoMailConnector.prototype.send = async message => { calls.push(message.to); assert.equal(message.attachments?.[0].mimeType, "application/pdf"); return message.to === "one@example.com" ? { status: "SENT", providerMessageId: "accepted" } : { status: "FAILED", retryable: true, error: "Synthetic rate limit", retryAfterSeconds: 60 }; };
  try {
   await Promise.all([deliverRun(runs[0].id), deliverRun(runs[0].id)]);
   assert.equal(calls.filter(x => x === "one@example.com").length, 1); assert.equal(calls.filter(x => x === "two@example.com").length, 1);
   const accepted = await prisma.weeklyReportDelivery.findFirstOrThrow({ where: { recipient: "one@example.com" } }); assert.equal(accepted.status, "ACCEPTED");
   const failed = await prisma.weeklyReportDelivery.findFirstOrThrow({ where: { recipient: "two@example.com" } }); assert.equal(failed.status, "RETRY");
   await prisma.weeklyReportDelivery.update({ where: { id: failed.id }, data: { nextAttemptAt: new Date(0) } });
   ZohoMailConnector.prototype.send = async message => { calls.push(message.to); return { status: "FAILED", outcomeUnknown: true, error: "Synthetic uncertain submission" }; };
   await deliverRun(runs[0].id); await deliverRun(runs[0].id);
   assert.equal(calls.filter(x => x === "one@example.com").length, 1); assert.equal(calls.filter(x => x === "two@example.com").length, 2);
   assert.equal((await prisma.weeklyReportDelivery.findUniqueOrThrow({ where: { id: failed.id } })).status, "UNKNOWN");
   assert.equal((await readSettings()).settings.enabled, false);
   assert.equal(await prisma.emailLog.count(), 3);
   const cron = await import("@/app/api/cron/reports/weekly/route");
   assert.equal((await cron.GET(new Request("https://erp.test/api/cron/reports/weekly"))).status, 401);
   await prisma.setting.update({ where: { key: settingsKey }, data: { value: JSON.stringify({ ...s, enabled: true }) } });
   const late = new Date("2026-10-27T03:30:00Z"); let intended: Date | undefined;
   await dispatch(late, { createRun: async (mode, config, actor, slot) => { intended = slot; return createRun(mode, config, actor, slot); }, generateRun: async id => prisma.weeklyReportRun.findUniqueOrThrow({ where: { id } }), deliverRun: async () => {} });
   assert.equal(intended?.toISOString(), scheduled.toISOString(), "A late dispatcher preserves the intended Monday slot and reporting period");
   assert.equal(await prisma.weeklyReportRun.count(), 1); assert.equal((await prisma.setting.findUniqueOrThrow({ where: { key: "weekly_report_dispatcher_heartbeat" } })).value, late.toISOString());
   const abandoned = await createRun("PREVIEW", s, "admin", scheduled);
   await prisma.weeklyReportRun.update({ where: { id: abandoned.id }, data: { status: "GENERATING", attempts: s.maxAttempts, leaseOwner: "abandoned", leaseUntil: new Date(0) } });
   const exhausted = await generateRun(abandoned.id, dependencies); assert.equal(exhausted.status, "FAILED"); assert.equal(exhausted.nextAttemptAt, null);
   const nextRun = await createRun("LIVE", s, undefined, new Date("2026-11-02T03:30:00Z")); await generateRun(nextRun.id, dependencies);
   await prisma.setting.update({ where: { key: settingsKey }, data: { value: JSON.stringify({ ...s, recipients: s.recipients.map(r => ({ ...r, enabled: r.email !== "one@example.com" })) }) } });
   ZohoMailConnector.prototype.send = async message => ({ status: "SENT", providerMessageId: `accepted-${message.to}` });
   await deliverRun(nextRun.id);
   assert.equal((await prisma.weeklyReportDelivery.findUniqueOrThrow({ where: { runId_recipient: { runId: nextRun.id, recipient: "one@example.com" } } })).status, "CANCELLED", "Disabling a recipient also stops unsent queued production delivery");
  } finally { ZohoMailConnector.prototype.send = original; }
  console.log("Weekly report integration passed: additive migrations/schema parity, authentication/authorization/origin guards, preview gate, concurrent period idempotency and render lease, attachments, partial recipient failure, rate-limit retry and accepted/unknown duplicate-send protection. Disposable database only; no emails sent.");
 } finally { await prisma.$disconnect(); rmSync(temp, { recursive: true, force: true }); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
