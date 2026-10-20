import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { ZohoMailConnector } from "@/lib/email/connectors/zoho";
import { createRun, deliverRun, generateRun, readSettings, retryFailedGeneration, saveSettings } from "@/lib/weekly-report/service";
import { scheduledSlot, settingsSchema } from "@/lib/weekly-report/config";
import { ensureWeeklyReportSchema } from "@/lib/weekly-report/schema";
import { verifyPdf } from "@/lib/weekly-report/pdf";
import { createHash } from "node:crypto";
import { z } from "zod";
type Context = { params: Promise<{ path?: string[] }> };
export async function handleWeeklyReports(request: Request, context: Context, identify = auth, authorize = checkUserPermission) {
 try {
  const session = await identify();
  if (!session?.user?.id) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const actor = session.user.id;
  if (!await authorize(actor, PERMISSIONS.SETTINGS_MANAGE)) return NextResponse.json({ error: "Administrator permission required" }, { status: 403 });
  const paths = (await context.params).path || [], action = paths[0] || "settings", url = new URL(request.url);
  if (request.method !== "GET" && request.headers.get("origin") !== url.origin) return NextResponse.json({ error: "Same-origin request required" }, { status: 403 });
  await ensureWeeklyReportSchema();
  if (request.method === "GET") {
   if (action === "settings") {
    const config = await readSettings();
    const [sender, shops, heartbeat, latestAccepted] = await Promise.all([new ZohoMailConnector().getSenderIdentity().catch(() => null), prisma.marketplaceShop.findMany({ select: { id: true, name: true, marketplace: true, status: true } }), prisma.setting.findUnique({ where: { key: "weekly_report_dispatcher_heartbeat" } }), prisma.weeklyReportRun.findFirst({ where: { status: "ACCEPTED", mode: "LIVE" }, orderBy: { updatedAt: "desc" }, select: { id: true, updatedAt: true } })]);
    return NextResponse.json({ ...config, sender, shops, nextScheduled: scheduledSlot(config.settings), dispatcherLastSeen: heartbeat?.value || null, latestAccepted });
   }
   if (action === "history") {
    const page = z.coerce.number().int().min(0).max(10000).parse(url.searchParams.get("page") || 0);
    const status = url.searchParams.get("status") || undefined;
    const date = (key: string) => { const value = url.searchParams.get(key); return value ? new Date(z.iso.datetime().parse(value)) : undefined; };
    const from = date("from"), to = date("to"), periodFrom = date("periodFrom"), periodTo = date("periodTo");
    const rows = await prisma.weeklyReportRun.findMany({ where: { ...(status ? { status } : {}), ...(from || to ? { createdAt: { gte: from, lt: to } } : {}), ...(periodFrom || periodTo ? { periodStart: { gte: periodFrom, lt: periodTo } } : {}) }, orderBy: { createdAt: "desc" }, take: 30, skip: page * 30, select: { id: true, mode: true, status: true, periodStart: true, periodEnd: true, createdAt: true, completedAt: true, dataQuality: true, pdfBytes: true, errorSummary: true, nextAttemptAt: true, deliveries: true } }); return NextResponse.json(rows);
   }
   if (action === "runs" && paths[1]) {
    const run = await prisma.weeklyReportRun.findUnique({ where: { id: paths[1] }, include: { deliveries: true } });
    if (!run) return NextResponse.json({ error: "Report not found" }, { status: 404 });
    if (paths[2] === "pdf") {
     if (!run.pdfBase64) return NextResponse.json({ error: "PDF unavailable or retention expired" }, { status: 404 });
     const bytes = Buffer.from(run.pdfBase64, "base64"); verifyPdf(bytes);
     if (createHash("sha256").update(bytes).digest("hex") !== run.pdfChecksum) throw new Error("PDF integrity check failed");
     return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="KhyatiGems-weekly-${run.id}.pdf"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
    }
    const { pdfBase64, settingsJson, ...detail } = run; void pdfBase64; void settingsJson; return NextResponse.json(detail);
   }
  }
  const text = await request.text(); if (text.length > 50000) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  const body = JSON.parse(text || "{}");
  if (request.method === "PUT" && action === "settings") return NextResponse.json(await saveSettings(body.settings, body.version ?? null, actor, body.confirmRecipients === true));
  if (request.method === "POST" && ["preview", "generate", "test"].includes(action)) {
   const saved = await readSettings(), settings = action === "preview" ? settingsSchema.parse(body.settings || saved.settings) : saved.settings;
   if (action !== "preview" && body.confirmSend !== true) return NextResponse.json({ error: "Confirm sending this report first" }, { status: 400 });
   const run = await createRun(action === "preview" ? "PREVIEW" : action === "test" ? "TEST" : "LIVE", settings, actor);
   await generateRun(run.id); if (action !== "preview") await deliverRun(run.id);
   return NextResponse.json({ id: run.id });
  }
  if (request.method === "POST" && action === "retry" && typeof body.id === "string") {
   if (body.confirmSend !== true) throw new Error("Confirm retrying the failed recipient.");
   const delivery = await prisma.weeklyReportDelivery.findUniqueOrThrow({ where: { id: body.id } });
   if (!["FAILED", "RETRY"].includes(delivery.status)) throw new Error("Only known failed deliveries can be retried. Accepted and unknown submissions are protected.");
   const run = await prisma.weeklyReportRun.findUniqueOrThrow({ where: { id: delivery.runId } });
   const settings = settingsSchema.parse(JSON.parse(run.settingsJson));
   if (delivery.attempts >= settings.maxAttempts) throw new Error("Configured attempt limit reached. Review provider configuration before generating a new reporting period.");
   await prisma.weeklyReportDelivery.updateMany({ where: { id: delivery.id, status: delivery.status }, data: { status: "RETRY", nextAttemptAt: new Date() } });
   await prisma.activityLog.create({ data: { entityType: "WeeklyReportDelivery", actionType: "RETRY_DELIVERY", userId: actor, module: "SETTINGS", action: "WEEKLY_REPORT_RETRY", referenceId: delivery.id } });
   await deliverRun(delivery.runId); return NextResponse.json({ ok: true });
  }
  if (request.method === "POST" && action === "retry-generation" && typeof body.id === "string") {
   if (body.confirmSend !== true) throw new Error("Confirm retrying this report; its queued recipients may be emailed.");
   const run = await retryFailedGeneration(body.id, actor); return NextResponse.json({ id: run.id, status: run.status });
  }
  return NextResponse.json({ error: "Route not found" }, { status: 404 });
 } catch (error) {
  if (error instanceof Error && error.name === "ZodError") return NextResponse.json({ error: "Invalid report settings", details: JSON.parse(error.message) }, { status: 400 });
  const message = error instanceof Error ? error.message : "Report request failed";
  const safe = /Confirm|preview|disabled|Settings changed|wait a minute|Only known|attempt limit|Connect Zoho|logo|PDF exceeds|failed while the retry/.test(message);
  if (!safe) console.error("[weekly-report] request failed", { name: error instanceof Error ? error.name : "Error", message: message.slice(0, 250), code: typeof error === "object" && error && "code" in error ? String(error.code) : undefined });
  return NextResponse.json({ error: safe ? message : "Report request failed. Check server database and report configuration." }, { status: safe ? 409 : 500 });
 }
}

