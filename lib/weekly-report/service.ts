import { createHash, randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { ZohoMailConnector } from "@/lib/email/connectors/zoho";
import { defaultSettings, reportingPeriod, retryAt, scheduledSlot, settingsKey, settingsSchema, template, type ReportSettings } from "./config";
import { collectMetrics, type Metrics } from "./metrics";
import { money, renderReport, verifyPdf } from "./pdf";
import { ensureWeeklyReportSchema } from "./schema";
export const configHash = (settings: ReportSettings) => { const { enabled, deliveryEnabled, ...rest } = settings; void enabled; void deliveryEnabled; return createHash("sha256").update(JSON.stringify(rest)).digest("hex"); };

export async function readSettings() {
 const row = await prisma.setting.findUnique({ where: { key: settingsKey } });
 return { settings: row ? settingsSchema.parse(JSON.parse(row.value)) : structuredClone(defaultSettings), version: row?.updatedAt.toISOString() || null };
}
export async function saveSettings(input: unknown, version: string | null, actor: string, confirmed: boolean) {
 const settings = settingsSchema.parse(input), previous = await readSettings();
 if (previous.version !== version) throw new Error("Settings changed in another window. Reload first.");
 if (JSON.stringify(settings.recipients) !== JSON.stringify(previous.settings.recipients) && !confirmed) throw new Error("Confirm the recipient changes before saving.");
 if (settings.enabled || settings.deliveryEnabled) {
  const preview = await prisma.weeklyReportRun.findFirst({ where: { mode: "PREVIEW", status: "READY", configHash: configHash(settings), pdfBase64: { not: null } } });
  if (!preview) throw new Error("Generate and review a preview with these settings before enabling automation or live delivery.");
  if (settings.deliveryEnabled && !await new ZohoMailConnector().getConnectedAccount()) throw new Error("Connect Zoho Mail in Email settings first.");
 }
 await prisma.$transaction(async tx => {
  if (version) {
   const changed = await tx.setting.updateMany({ where: { key: settingsKey, updatedAt: new Date(version) }, data: { value: JSON.stringify(settings) } });
   if (!changed.count) throw new Error("Settings changed in another window.");
  } else await tx.setting.create({ data: { key: settingsKey, value: JSON.stringify(settings), description: "Weekly BI report configuration; no credentials" } });
  await tx.activityLog.create({ data: { module: "SETTINGS", action: "WEEKLY_REPORT_SETTINGS", userId: actor, entityType: "WeeklyReportSettings", details: JSON.stringify({ before: previous.settings, after: settings }) } });
 });
 return readSettings();
}
export async function createRun(mode: "PREVIEW" | "TEST" | "LIVE", settings: ReportSettings, actor?: string, scheduled = new Date()) {
 await ensureWeeklyReportSchema();
 const period = reportingPeriod(settings, scheduled);
 const executionKey = mode === "LIVE" ? `weekly:${period.start.toISOString()}:${period.end.toISOString()}` : !actor ? `scheduled-preview:${period.start.toISOString()}:${period.end.toISOString()}` : `${mode}:${randomUUID()}`;
 if (mode === "LIVE" && !settings.deliveryEnabled) throw new Error("Live delivery is disabled in Settings.");
 const existing = await prisma.weeklyReportRun.findUnique({ where: { executionKey } }); if (existing) return existing;
 if (actor && await prisma.weeklyReportRun.count({ where: { requestedById: actor, createdAt: { gt: new Date(Date.now() - 60000) } } }) >= 3) throw new Error("Please wait a minute before generating another report.");
 try { return await prisma.weeklyReportRun.create({ data: { executionKey, mode, periodStart: period.start, periodEnd: period.end, timezone: settings.timezone, scheduledFor: scheduled, configHash: configHash(settings), settingsJson: JSON.stringify(settings), requestedById: actor, deliveries: mode === "PREVIEW" ? undefined : { create: (mode === "TEST" ? [settings.testRecipient] : settings.recipients.filter(r => r.enabled).map(r => r.email)).map(recipient => ({ recipient })) } } }); }
 catch (error) { const raced = await prisma.weeklyReportRun.findUnique({ where: { executionKey } }); if (raced) return raced; throw error; }
}
export async function generateRun(id: string, dependencies = { collectMetrics, renderReport }) {
 const owner = randomUUID(), now = new Date();
 const run = await prisma.weeklyReportRun.findUniqueOrThrow({ where: { id } });
 if (run.pdfBase64) return run;
 const settings = settingsSchema.parse(JSON.parse(run.settingsJson));
 if (run.attempts >= settings.maxAttempts && (run.status === "FAILED" || (run.status === "GENERATING" && run.leaseUntil && +run.leaseUntil < +now))) {
  await prisma.weeklyReportRun.updateMany({ where: { id, attempts: run.attempts, status: run.status, ...(run.status === "GENERATING" ? { leaseUntil: { lt: now } } : {}) }, data: { status: "FAILED", nextAttemptAt: null, leaseOwner: null, leaseUntil: null, errorSummary: "Generation attempt limit reached. Administrator investigation is required." } });
  return prisma.weeklyReportRun.findUniqueOrThrow({ where: { id } });
 }
 const claimed = await prisma.weeklyReportRun.updateMany({ where: { id, attempts: { lt: settings.maxAttempts }, OR: [{ status: "QUEUED" }, { status: "FAILED", nextAttemptAt: { lte: now } }, { status: "GENERATING", leaseUntil: { lt: now } }] }, data: { status: "GENERATING", leaseOwner: owner, leaseUntil: new Date(+now + 10 * 60000), startedAt: now, attempts: { increment: 1 }, errorSummary: null } });
 if (!claimed.count) return run;
 try {
  const metrics = await dependencies.collectMetrics(settings, run.scheduledFor || run.createdAt), pdf = await dependencies.renderReport(metrics, settings, run.mode);
  if (pdf.length > settings.maxAttachmentMb * 1024 * 1024) throw new Error("PDF exceeds the configured attachment limit. Reduce optional sections or increase the limit in Settings.");
  await prisma.weeklyReportRun.updateMany({ where: { id, leaseOwner: owner }, data: { status: run.mode === "PREVIEW" ? "READY" : "DELIVERY_PENDING", metricsJson: JSON.stringify(metrics), dataQuality: metrics.dataQuality, pdfBase64: pdf.toString("base64"), pdfChecksum: createHash("sha256").update(pdf).digest("hex"), pdfBytes: pdf.length, completedAt: new Date(), nextAttemptAt: null, leaseOwner: null, leaseUntil: null } });
 } catch (error) {
  const safe = error instanceof Error && /logo|PDF exceeds|Company logo/.test(error.message) ? error.message.slice(0, 250) : "Report generation failed. Check database availability and the configured server Chromium installation.";
  await prisma.weeklyReportRun.updateMany({ where: { id, leaseOwner: owner }, data: { status: "FAILED", errorCode: "GENERATION_FAILED", errorSummary: safe, nextAttemptAt: run.attempts + 1 < settings.maxAttempts ? retryAt(run.attempts + 1, settings) : null, leaseOwner: null, leaseUntil: null } });
 }
 return prisma.weeklyReportRun.findUniqueOrThrow({ where: { id } });
}
export async function deliverRun(id: string) {
 const run = await prisma.weeklyReportRun.findUniqueOrThrow({ where: { id } });
 if (!run.pdfBase64 || run.mode === "PREVIEW") return;
 const settings = settingsSchema.parse(JSON.parse(run.settingsJson));
 // Respect the current emergency delivery switch for queued production reports.
 const currentSettings = run.mode === "LIVE" ? (await readSettings()).settings : null;
 if (currentSettings && !currentSettings.deliveryEnabled) return;
 if (currentSettings) await prisma.weeklyReportDelivery.updateMany({ where: { runId: id, status: { in: ["PENDING", "RETRY"] }, recipient: { notIn: currentSettings.recipients.filter(r => r.enabled).map(r => r.email) } }, data: { status: "CANCELLED", nextAttemptAt: null, errorSummary: "Recipient disabled or removed from the current delivery configuration." } });
 const pdf = Buffer.from(run.pdfBase64, "base64"); verifyPdf(pdf);
 if (createHash("sha256").update(pdf).digest("hex") !== run.pdfChecksum) throw new Error("Stored PDF checksum mismatch");
 const m = JSON.parse(run.metricsJson!) as Metrics;
 const values = { period_start: m.period.startDay, period_end: m.period.endDay, company_name: "Khyati Precious Gems Private Limited", report_name: settings.name, orders: String(m.current.count), revenue: money(m.current.totals), new_listings: String(m.newListings.length), critical_issues: String(m.alerts.filter(a => a.severity === "CRITICAL").length), run_id: id };
 // A process interrupted after submission cannot safely retry without a provider idempotency API.
 await prisma.weeklyReportDelivery.updateMany({ where: { runId: id, status: "SENDING", attemptedAt: { lt: new Date(Date.now() - 10 * 60000) } }, data: { status: "UNKNOWN", errorSummary: "Interrupted submission. Verify Zoho Sent; automatic retry blocked to prevent duplicates." } });
 const deliveries = await prisma.weeklyReportDelivery.findMany({ where: { runId: id, attempts: { lt: settings.maxAttempts }, OR: [{ status: "PENDING" }, { status: "RETRY", nextAttemptAt: { lte: new Date() } }] }, take: 3, orderBy: { createdAt: "asc" } });
 for (const delivery of deliveries) {
  const now = new Date();
  if (!(await prisma.weeklyReportDelivery.updateMany({ where: { id: delivery.id, status: delivery.status, attempts: delivery.attempts }, data: { status: "SENDING", attemptedAt: now, attempts: { increment: 1 } } })).count) continue;
  const subject = `${run.mode === "TEST" ? "[TEST REPORT] " : ""}${template(settings.subject, values)}`, text = `${run.mode === "TEST" ? "TEST EMAIL — no production delivery implied.\n\n" : ""}${template(settings.body, values)}`;
  let logId: string | undefined;
  try {
   const log = await prisma.emailLog.create({ data: { recipient: delivery.recipient, subject, bodyText: text, status: "PROCESSING", provider: "zoho", emailType: "WEEKLY_BI", templateKey: "weekly-business-intelligence", idempotencyKey: `weekly:${delivery.id}:${delivery.attempts + 1}`, attemptCount: 1, lastAttemptAt: now } }); logId = log.id;
   await prisma.weeklyReportDelivery.update({ where: { id: delivery.id }, data: { emailLogId: log.id } });
   const result = await new ZohoMailConnector().send({ to: delivery.recipient, subject, text, attachments: settings.attachPdf ? [{ fileName: `KhyatiGems-${m.period.startDay}-${m.period.endDay}${run.mode === "TEST" ? "-TEST" : ""}.pdf`, mimeType: "application/pdf", content: pdf }] : [] });
   const accepted = result.status === "SENT" && !!result.providerMessageId;
   const status = accepted ? "ACCEPTED" : result.outcomeUnknown ? "UNKNOWN" : result.retryable && delivery.attempts + 1 < settings.maxAttempts ? "RETRY" : "FAILED";
   const next = status === "RETRY" ? new Date(Math.max(+retryAt(delivery.attempts + 1, settings), Date.now() + Math.max(0, result.retryAfterSeconds || 0) * 1000)) : null;
   await prisma.weeklyReportDelivery.update({ where: { id: delivery.id }, data: { status, providerMessageId: result.providerMessageId, acceptedAt: accepted ? new Date() : null, nextAttemptAt: next, errorSummary: result.error || null } });
   await prisma.emailLog.update({ where: { id: log.id }, data: { status: accepted ? "SENT" : "FAILED", providerMessageId: result.providerMessageId, sentAt: accepted ? new Date() : null, errorMessage: result.error || null, failureCode: status } }).catch(() => { /* Delivery row is authoritative; an audit-log failure must not undo confirmed provider acceptance. */ });
  } catch {
   await prisma.weeklyReportDelivery.updateMany({ where: { id: delivery.id, status: "SENDING" }, data: { status: "UNKNOWN", errorSummary: "Delivery interrupted. Verify Zoho Sent before an administrator reconciles this attempt.", emailLogId: logId } });
  }
 }
 const all = await prisma.weeklyReportDelivery.findMany({ where: { runId: id } });
 await prisma.weeklyReportRun.update({ where: { id }, data: { status: all.length && all.every(d => d.status === "CANCELLED") ? "CANCELLED" : all.length && all.every(d => ["ACCEPTED", "CANCELLED"].includes(d.status)) ? "ACCEPTED" : all.some(d => ["UNKNOWN", "FAILED"].includes(d.status)) ? "DELIVERY_ISSUES" : "DELIVERY_PENDING" } });
}
export async function dispatch(now = new Date(), dependencies = { createRun, generateRun, deliverRun }) {
 await ensureWeeklyReportSchema(); const { settings } = await readSettings();
 await prisma.setting.upsert({ where: { key: "weekly_report_dispatcher_heartbeat" }, create: { key: "weekly_report_dispatcher_heartbeat", value: now.toISOString() }, update: { value: now.toISOString() } });
 if (settings.enabled) { const slot = scheduledSlot(settings, now, "last"); const row = await dependencies.createRun(settings.deliveryEnabled ? "LIVE" : "PREVIEW", settings, undefined, slot); await dependencies.generateRun(row.id); }
 const pending = await prisma.weeklyReportRun.findMany({ where: { OR: [{ status: "QUEUED" }, { status: "GENERATING", leaseUntil: { lt: now } }, { status: "FAILED", nextAttemptAt: { lte: now } }, { status: { in: ["DELIVERY_PENDING", "DELIVERY_ISSUES"] } }] }, orderBy: { createdAt: "asc" }, take: 3, select: { id: true } });
 for (const row of pending) { await dependencies.generateRun(row.id); await dependencies.deliverRun(row.id); }
 await prisma.weeklyReportRun.updateMany({ where: { createdAt: { lt: new Date(+now - settings.retentionDays * 86400000) }, status: { in: ["READY", "ACCEPTED"] } }, data: { pdfBase64: null, pdfBytes: null } });
 return { processed: pending.length, nextScheduled: scheduledSlot(settings, now).toISOString() };
}
