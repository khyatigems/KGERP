import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { activities, platforms, dayKey, weekKey, splitDays, subtract, occupy, TrackerError, type Span } from "./core";

export function reportQuery(url: URL) {
  const end = new Date(url.searchParams.get("to") || new Date().toISOString());
  const start = new Date(url.searchParams.get("from") || new Date(+end - 7 * 86400000).toISOString());
  const timeZone = url.searchParams.get("timeZone") || "Asia/Kolkata";
  try { dayKey(Date.now(), timeZone); } catch { throw new TrackerError("Invalid IANA timezone"); }
  if (!Number.isFinite(+start) || !Number.isFinite(+end) || +end <= +start || +end - +start > 93 * 86400000) throw new TrackerError("Choose a report range of at most 93 days");
  const platform = url.searchParams.get("platform") || undefined, activityType = url.searchParams.get("activityType") || undefined;
  if (platform && !(platforms as readonly string[]).includes(platform)) throw new TrackerError("Invalid platform");
  if (activityType && !(activities as readonly string[]).includes(activityType)) throw new TrackerError("Invalid activity type");
  return { start, end, timeZone, platform, activityType };
}
export type ReportQuery = ReturnType<typeof reportQuery>;
export async function report(userId: string, q: ReportQuery, db: PrismaClient = prisma) {
  // Load all platforms before filters so overlaps cannot reappear through a filter.
  const sessions = await db.workSession.findMany({ where: { userId, startedAt: { lt: q.end }, OR: [{ endedAt: null }, { endedAt: { gt: q.start } }] }, include: { intervals: true }, orderBy: [{ trackingSource: "asc" }, { startedAt: "asc" }, { id: "asc" }] });
  const priority = (source: string) => source === "MANUAL" ? 0 : source === "AUTOMATIC" ? 1 : 2;
  sessions.sort((a, b) => priority(a.trackingSource) - priority(b.trackingSource) || +a.startedAt - +b.startedAt || a.id.localeCompare(b.id));
  const occupied: Span[] = [], rows: { sessionId: string; platform: string; activityType: string; day: string; week: string; seconds: number }[] = [];
  const now = Date.now();
  for (const s of sessions) for (const i of s.intervals) {
    const span = { start: Math.max(+q.start, +i.startedAt), end: Math.min(+q.end, +(i.endedAt || new Date(now)), now) };
    if (span.end <= span.start) continue;
    const available = subtract(span, occupied); occupy(occupied, span);
    if ((q.platform && s.platform !== q.platform) || (q.activityType && s.activityType !== q.activityType)) continue;
    for (const part of available.flatMap(p => splitDays(p, q.timeZone))) rows.push({ sessionId: s.id, platform: s.platform, activityType: s.activityType, day: part.day, week: weekKey(part.day), seconds: (part.end - part.start) / 1000 });
  }
  const daily: Record<string, Record<string, number>> = {}, weekly: Record<string, Record<string, number>> = {};
  const byPlatform = Object.fromEntries(platforms.map(p => [p, 0]));
  for (const r of rows) {
    byPlatform[r.platform] += r.seconds;
    daily[r.day] ||= {}; daily[r.day][r.platform] = (daily[r.day][r.platform] || 0) + r.seconds;
    weekly[r.week] ||= {}; weekly[r.week][r.platform] = (weekly[r.week][r.platform] || 0) + r.seconds;
  }
  const today = dayKey(now, q.timeZone), week = weekKey(today);
  const targets = await db.workTarget.findMany({ where: { userId } });
  return { from: q.start, to: q.end, timeZone: q.timeZone, totalSeconds: rows.reduce((n, r) => n + r.seconds, 0), byPlatform, daily, weekly,
    today: daily[today] || {}, targets: targets.map(t => { const actualMinutes = ((t.period === "DAILY" ? daily[today] : weekly[week])?.[t.platform] || 0) / 60; return { ...t, actualMinutes, percentage: actualMinutes / t.targetMinutes * 100 }; }), rows, sessions };
}

// Only server-confirmed publications carry both an actor and an actual publication timestamp.
export function publicationEvidence(raw: string | null, userId: string): { publishedAt: Date; listingId: string } | null {
  try {
    const m = JSON.parse(raw || "{}"); const p = m.workPublication;
    if (m.completeEbay?.state !== "PUBLISHED" || p?.userId !== userId || typeof p.listingId !== "string" || !Number.isFinite(+new Date(p.publishedAt))) return null;
    return { listingId: p.listingId, publishedAt: new Date(p.publishedAt) };
  } catch { return null; }
}
export async function productivity(userId: string, q: ReportQuery, db: PrismaClient = prisma) {
  const data = await report(userId, q, db);
  const listings = await db.listing.findMany({ where: { platform: "EBAY", externalId: { not: null }, rawMetadata: { contains: '"workPublication"' } }, select: { id: true, inventoryId: true, platform: true, externalId: true, marketplaceShopId: true, rawMetadata: true } });
  const confirmed = listings.flatMap(l => { const evidence = publicationEvidence(l.rawMetadata, userId); return evidence && evidence.listingId === l.externalId && +evidence.publishedAt >= +q.start && +evidence.publishedAt < +q.end ? [{ ...l, evidence }] : []; });
  const summarize = (rows: typeof data.rows, publicationsInPeriod: typeof confirmed) => platforms.map(platform => {
    const matching = publicationsInPeriod.filter(l => l.platform === platform && (!q.platform || platform === q.platform));
    // Imported duplicates for the same shop/listing are one publication. The
    // same external ID across different shops is still ambiguous for a session.
    const publications = [...new Map(matching.map(l => [`${l.marketplaceShopId || ""}:${l.externalId}`, l])).values()];
    const ids = new Set(publications.map(l => `${l.marketplaceShopId || ""}:${l.externalId}`));
    const match = (s: typeof data.sessions[number]) => publications.filter(l => s.listingRecordId ? l.id === s.listingRecordId : s.inventoryId && s.marketplaceShopId ? l.inventoryId === s.inventoryId && l.marketplaceShopId === s.marketplaceShopId : Boolean(s.marketplaceListingId) && l.externalId === s.marketplaceListingId);
    const linked = new Set(data.sessions.filter(s => s.platform === platform && match(s).length === 1).map(s => s.id));
    const work = rows.filter(r => r.platform === platform);
    const preparationMinutes = work.filter(r => r.activityType === "LISTING_PREPARATION").reduce((n, r) => n + r.seconds / 60, 0);
    const publishingMinutes = work.filter(r => r.activityType === "LISTING_CREATION").reduce((n, r) => n + r.seconds / 60, 0);
    const eligibleMinutes = work.filter(r => linked.has(r.sessionId) && ["LISTING_PREPARATION", "LISTING_CREATION"].includes(r.activityType)).reduce((n, r) => n + r.seconds / 60, 0);
    const attributable = new Set(data.sessions.filter(s => linked.has(s.id) && rows.some(r => r.sessionId === s.id && ["LISTING_PREPARATION", "LISTING_CREATION"].includes(r.activityType))).flatMap(s => match(s).map(l => `${l.marketplaceShopId || ""}:${l.externalId}`)));
    // Incomplete attribution must not divide partial time by all published listings.
    const complete = ids.size > 0 && publications.every(l => attributable.has(`${l.marketplaceShopId || ""}:${l.externalId}`)) && eligibleMinutes > 0;
    return { platform, publishedListings: platform === "EBAY" ? ids.size : null, eligibleMinutes, preparationMinutes, publishingMinutes,
      synchronizationMinutes: work.filter(r => ["SYNCHRONIZATION", "TROUBLESHOOTING"].includes(r.activityType)).reduce((n, r) => n + r.seconds / 60, 0),
      synchronizationFailureMinutes: null,
      averageMinutesPerListing: complete ? eligibleMinutes / ids.size : null, listingsPerHour: complete ? ids.size / (eligibleMinutes / 60) : null,
      coverage: platform === "EBAY" ? "Confirmed ERP publications since tracker deployment only; imported and reconciled historical listings excluded" : "No reliable publication timestamp and user attribution in the current connector",
    };
  });
  const comparisons = (group: "day" | "week") => {
    const key = (time: number) => group === "day" ? dayKey(time, q.timeZone) : weekKey(dayKey(time, q.timeZone));
    const periods = [...new Set([...data.rows.map(r => r[group]), ...confirmed.map(l => key(+l.evidence.publishedAt))])].sort();
    return Object.fromEntries(periods.map(period => [period, summarize(data.rows.filter(r => r[group] === period), confirmed.filter(l => key(+l.evidence.publishedAt) === period))]));
  };
  return { from: q.start, to: q.end, platforms: summarize(data.rows, confirmed), daily: comparisons("day"), weekly: comparisons("week"), definition: "Half-open [from,to) window. Publication denominator: distinct shop + external listing ID confirmed published by this user in the window. Numerator: deduplicated active LISTING_PREPARATION + LISTING_CREATION minutes linked by an unambiguous external listing ID to those publications. Rates unavailable unless every counted publication has linked eligible time. Preparation, publishing and synchronization minutes also shown independently. Failed-sync attribution is unavailable without a linked operation. Browser classification is an estimate." };
}
