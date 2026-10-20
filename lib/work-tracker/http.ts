import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { trackerIdentity, newToken, hashToken } from "@/lib/work-tracker/auth";
import { TrackerError, targetSchema } from "@/lib/work-tracker/core";
import { startTimer, transition, correctSession, deleteSession, ingestEvents, ingestErpEvents, revisionSchema } from "@/lib/work-tracker/service";
import { report, reportQuery, productivity } from "@/lib/work-tracker/reports";
import { ensureWorkTrackerSchema } from "@/lib/work-tracker/schema";
import { revenue } from "@/lib/work-tracker/analytics";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";

type Context = { params: Promise<{ path: string[] }> };
export async function handleTracker(request: Request, context: Context, db = prisma, identify = trackerIdentity, authorize = checkUserPermission) {
  try {
    const { path } = await context.params; const route = path.join("/"); const method = request.method;
    const identity = await identify(request, path[0] === "credentials");
    const { userId } = identity;
    if (identity.extension && route !== "activity-events") throw new TrackerError("Credential scope does not permit this action", 403);
    await ensureWorkTrackerSchema(db);
    const url = new URL(request.url);
    let body: unknown;
    if (["POST", "PATCH", "PUT", "DELETE"].includes(method)) {
      const text = await request.text(); if (text.length > 100000) throw new TrackerError("Payload too large", 413);
      try { body = JSON.parse(text); } catch { throw new TrackerError("Invalid JSON"); }
    }
    let result: unknown;
    if (route === "sessions" && method === "GET") {
      const q = reportQuery(url);
      const page = z.coerce.number().int().min(0).max(10000).parse(url.searchParams.get("page") || "0");
      const where = { userId, ...(q.platform ? { platform: q.platform } : {}), ...(q.activityType ? { activityType: q.activityType } : {}), startedAt: { lt: q.end }, OR: [{ endedAt: null }, { endedAt: { gt: q.start } }] };
      const [entries, total, current] = await Promise.all([
        db.workSession.findMany({ where, include: { intervals: true }, orderBy: [{ startedAt: "desc" }, { id: "asc" }], take: 100, skip: page * 100 }),
        db.workSession.count({ where }),
        db.workSession.findFirst({ where: { userId, activeUserId: userId }, include: { intervals: true } }),
      ]);
      result = { entries, total, page, pageSize: 100, current };
    } else if (route === "dashboard" && method === "GET") {
      const q = reportQuery(url);
      const [selected, currentWeek, metrics, credentialList, canViewRevenue] = await Promise.all([
        report(userId, q, db), report(userId, { ...q, start: new Date(Date.now() - 8 * 86400000), end: new Date(), platform: undefined, activityType: undefined }, db),
        productivity(userId, q, db), db.workTrackerCredential.findMany({ where: { userId }, select: { id: true, name: true, createdAt: true, expiresAt: true, revokedAt: true } }), authorize(userId, PERMISSIONS.SALES_VIEW),
      ]);
      const { rows, sessions, ...summary } = selected;
      const { rows: liveRows, sessions: liveSessions, ...live } = currentWeek;
      void liveRows; void liveSessions;
      const byActivity: Record<string, number> = {}, bySource: Record<string, number> = {};
      const sessionMap = new Map(sessions.map(s => [s.id, s]));
      for (const row of rows) { byActivity[row.activityType] = (byActivity[row.activityType] || 0) + row.seconds; const source = sessionMap.get(row.sessionId)!.trackingSource; bySource[source] = (bySource[source] || 0) + row.seconds; }
      const matchingSessions = sessions.filter(s => (!q.platform || s.platform === q.platform) && (!q.activityType || s.activityType === q.activityType));
      const recent = [...matchingSessions].sort((a, b) => +b.startedAt - +a.startedAt).slice(0, 60).map(s => ({ ...s, effectiveSeconds: rows.filter(r => r.sessionId === s.id).reduce((n, r) => n + r.seconds, 0) }));
      const orderValue = canViewRevenue ? await revenue(q, db).catch(() => ({ available: false, reason: "Order data could not be loaded. Time tracking is unaffected." })) : { available: false, reason: "Sales-view permission is required to view shop revenue." };
      const lastExtensionEvent = await db.workActivityEvent.findFirst({ where: { userId, source: "EXTENSION" }, orderBy: { createdAt: "desc" }, select: { createdAt: true } });
      const currentManual = await db.workSession.findFirst({ where: { userId, activeUserId: userId }, orderBy: { startedAt: "desc" } });
      result = { summary, live, metrics, byActivity, bySource, entries: recent, totalEntries: matchingSessions.length, credentials: credentialList, revenue: orderValue, extensionLastSync: lastExtensionEvent?.createdAt || null, currentManual };
    } else if (route === "erp-events" && method === "POST") result = await ingestErpEvents(userId, body, url.hostname, db);
    else if (route === "sessions/start" && method === "POST") result = await startTimer(userId, body, db);
    else if (path[0] === "sessions" && path.length === 3 && ["pause", "resume", "stop"].includes(path[2]) && method === "POST") {
      result = await transition(userId, path[1], path[2] as "pause" | "resume" | "stop", revisionSchema.parse(body).revision, db);
    } else if (path[0] === "sessions" && path.length === 2 && method === "PATCH") result = await correctSession(userId, path[1], body, db);
    else if (path[0] === "sessions" && path.length === 2 && method === "DELETE") result = await deleteSession(userId, path[1], revisionSchema.parse(body).revision, db);
    else if (route === "activity-events" && method === "POST") result = await ingestEvents(userId, body, url.hostname, db);
    else if (route === "reports/summary" && method === "GET") {
      const { rows: _rows, sessions: _sessions, ...summary } = await report(userId, reportQuery(url), db);
      void _rows; void _sessions;
      result = summary;
    } else if (route === "reports/productivity" && method === "GET") result = await productivity(userId, reportQuery(url), db);
    else if (route === "targets" && method === "GET") result = await db.workTarget.findMany({ where: { userId } });
    else if (route === "targets" && method === "PUT") {
      const data = targetSchema.parse(body);
      result = await db.workTarget.upsert({ where: { userId_platform_period: { userId, platform: data.platform, period: data.period } }, create: { userId, ...data }, update: { targetMinutes: data.targetMinutes } });
    } else if (route === "credentials" && method === "GET") result = await db.workTrackerCredential.findMany({ where: { userId }, select: { id: true, name: true, createdAt: true, expiresAt: true, revokedAt: true }, orderBy: { createdAt: "desc" } });
    else if (route === "credentials" && method === "POST") {
      const { name } = z.object({ name: z.string().trim().min(1).max(80) }).strict().parse(body);
      const count = await db.workTrackerCredential.count({ where: { userId, revokedAt: null, expiresAt: { gt: new Date() } } });
      if (count >= 10) throw new TrackerError("Revoke an existing credential before creating another", 409);
      const token = newToken();
      const credential = await db.workTrackerCredential.create({ data: { userId, name, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 90 * 86400000) }, select: { id: true, expiresAt: true } });
      result = { ...credential, token };
    } else if (path[0] === "credentials" && path.length === 2 && method === "DELETE") {
      const changed = await db.workTrackerCredential.updateMany({ where: { id: path[1], userId }, data: { revokedAt: new Date() } });
      if (!changed.count) throw new TrackerError("Credential not found", 404);
      result = { revoked: true };
    } else throw new TrackerError("Route not found", 404);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid payload", details: error.issues }, { status: 400 });
    if (error instanceof TrackerError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Work tracker request failed", error);
    return NextResponse.json({ error: "Work tracker request failed" }, { status: 500 });
  }
}

