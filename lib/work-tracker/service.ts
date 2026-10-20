import type { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fields, startSchema, correctionSchema, eventsSchema, eventSchema, classifyDomain, seconds, validRange, TrackerError } from "./core";

type DB = Prisma.TransactionClient;
// All transitions use an optimistic revision as well as a database timer lock.
export async function startTimer(userId: string, input: unknown, db: PrismaClient = prisma) {
  const data = startSchema.parse(input);
  const prior = await db.workSession.findUnique({ where: { userId_requestId: { userId, requestId: data.requestId } }, include: { intervals: true } });
  if (prior) return prior;
  try {
    return await db.workSession.create({ data: { ...data, userId, activeUserId: userId, startedAt: new Date(), intervals: { create: { startedAt: new Date() } } }, include: { intervals: true } });
  } catch (error) {
    const replay = await db.workSession.findUnique({ where: { userId_requestId: { userId, requestId: data.requestId } }, include: { intervals: true } });
    if (replay) return replay;
    if (await db.workSession.findFirst({ where: { activeUserId: userId } })) throw new TrackerError("Stop the existing running or paused timer first", 409);
    throw error;
  }
}
async function owned(tx: DB, userId: string, id: string) {
  const session = await tx.workSession.findFirst({ where: { id, userId }, include: { intervals: true } });
  if (!session) throw new TrackerError("Session not found", 404);
  return session;
}
export async function transition(userId: string, id: string, action: "pause" | "resume" | "stop", revision: number, db: PrismaClient = prisma) {
  return db.$transaction(async tx => {
    const session = await owned(tx, userId, id);
    const desired = action === "pause" ? "PAUSED" : action === "resume" ? "RUNNING" : "COMPLETED";
    // A retry returns the already-applied state. Stale requests cannot reverse a later transition.
    if (session.status === desired) return session;
    if (session.revision !== revision || session.status === "COMPLETED") throw new TrackerError("Session changed; reload before continuing", 409);
    const now = new Date();
    const claim = await tx.workSession.updateMany({ where: { id, userId, revision }, data: { revision: { increment: 1 }, status: desired, activeUserId: action === "stop" ? null : userId, endedAt: action === "stop" ? now : null } });
    if (!claim.count) throw new TrackerError("Session changed", 409);
    if (action === "resume") await tx.workInterval.create({ data: { sessionId: id, startedAt: now } });
    else await tx.workInterval.updateMany({ where: { sessionId: id, endedAt: null }, data: { endedAt: now } });
    const intervals = await tx.workInterval.findMany({ where: { sessionId: id } });
    return tx.workSession.update({ where: { id }, data: { durationSeconds: seconds(intervals.map(i => ({ start: +i.startedAt, end: +(i.endedAt || now) }))) }, include: { intervals: true } });
  });
}
export async function correctSession(userId: string, id: string, input: unknown, db: PrismaClient = prisma) {
  const { revision, startedAt, endedAt, ...changes } = correctionSchema.parse(input);
  return db.$transaction(async tx => {
    const current = await owned(tx, userId, id);
    if (current.status !== "COMPLETED") throw new TrackerError("Stop the timer before correcting it", 409);
    const timestamps = startedAt !== undefined || endedAt !== undefined;
    const start = new Date(startedAt || current.startedAt), end = new Date(endedAt || current.endedAt!);
    validRange(start, end);
    const update = await tx.workSession.updateMany({ where: { id, userId, revision }, data: { ...changes, revision: { increment: 1 }, ...(timestamps ? { startedAt: start, endedAt: end, durationSeconds: seconds([{ start: +start, end: +end }]) } : {}) } });
    if (!update.count) throw new TrackerError("Session changed; reload before correcting", 409);
    if (timestamps) {
      await tx.workInterval.deleteMany({ where: { sessionId: id } });
      await tx.workInterval.create({ data: { sessionId: id, startedAt: start, endedAt: end } });
    }
    return tx.workSession.findUnique({ where: { id }, include: { intervals: true } });
  });
}
export async function deleteSession(userId: string, id: string, revision: number, db: PrismaClient = prisma) {
  return db.$transaction(async tx => {
    const current = await owned(tx, userId, id);
    if (current.status !== "COMPLETED" || current.revision !== revision) throw new TrackerError("Only an unchanged completed entry can be deleted", 409);
    // Retain event IDs as tombstones so a delayed retry cannot recreate deleted time.
    await tx.workActivityEvent.updateMany({ where: { sessionId: id }, data: { sessionId: null } });
    await tx.workInterval.deleteMany({ where: { sessionId: id } });
    await tx.workSession.delete({ where: { id } });
    return { deleted: true };
  });
}
type ErpContext = { inventoryId: string | null; marketplaceShopId: string | null; listingRecordId: string | null; sku: string | null; marketplaceListingId: string | null; description: string };
export async function ingestEvents(userId: string, input: unknown, erpHost: string, db: PrismaClient = prisma, erpContext?: ErpContext) {
  const { events } = eventsSchema.parse(input);
  const now = new Date();
  for (const event of events) {
    const detected = classifyDomain(event.domain, erpHost);
    if (!detected || (!event.classificationOverride && detected !== event.platform)) throw new TrackerError("Unsupported domain or inconsistent platform");
    const end = new Date(event.occurredAt);
    if (+end > +now || +end < +now - 7 * 86400000) throw new TrackerError("Events must be within the past seven days");
    if (event.eventType === "ACTIVE") {
      if (!event.startedAt) throw new TrackerError("Active events require interval start");
      validRange(new Date(event.startedAt), end, now);
      if (+end - +new Date(event.startedAt) > 90000) throw new TrackerError("Active intervals cannot exceed 90 seconds");
    } else if (event.startedAt) throw new TrackerError("Only active events may contain an interval");
  }
  const accepted: string[] = [];
  // Sequential commits permit partial retry; UUIDs make each interval idempotent.
  for (const event of events) {
    try {
      await db.$transaction(async tx => {
        const existing = await tx.workActivityEvent.findUnique({ where: { id: event.id } });
        if (existing) { if (existing.userId !== userId) throw new TrackerError("Event ID conflict", 409); return; }
        const start = event.startedAt ? new Date(event.startedAt) : null, end = new Date(event.occurredAt);
        const durationSeconds = start ? seconds([{ start: +start, end: +end }]) : 0;
        const session = start ? await tx.workSession.create({ data: {
          userId, requestId: event.id, platform: event.platform, activityType: event.activityType,
          description: event.classificationOverride ? "Browser activity (classification corrected)" : "Browser activity estimate",
          ...erpContext,
          trackingSource: erpContext ? "AUTOMATIC" : "EXTENSION", status: "COMPLETED", startedAt: start, endedAt: end, durationSeconds,
          intervals: { create: { startedAt: start, endedAt: end } },
        } }) : null;
        await tx.workActivityEvent.create({ data: { id: event.id, userId, platform: event.platform, domain: event.domain, eventType: event.eventType, occurredAt: end, durationSeconds, sessionId: session?.id, source: erpContext ? "AUTOMATIC" : "EXTENSION" } });
      });
    } catch (error) {
      // A concurrent retry may have won the unique event claim.
      const prior = await db.workActivityEvent.findUnique({ where: { id: event.id } });
      if (!prior || prior.userId !== userId) throw error;
    }
    accepted.push(event.id);
  }
  return { accepted };
}
const erpEvent = eventSchema.extend({ inventoryId: z.string().max(100).nullable().optional(), marketplaceShopId: z.string().max(100).nullable().optional(), listingRecordId: z.string().max(100).nullable().optional() });
export async function ingestErpEvents(userId: string, input: unknown, erpHost: string, db: PrismaClient = prisma) {
  const { events } = z.object({ events: z.array(erpEvent).min(1).max(50) }).strict().parse(input);
  const accepted: string[] = [];
  for (const entry of events) {
    const { inventoryId, marketplaceShopId, listingRecordId, ...event } = entry;
    if (event.domain !== erpHost || event.eventType !== "ACTIVE") throw new TrackerError("Invalid ERP interval");
    const inventory = inventoryId ? await db.inventory.findUnique({ where: { id: inventoryId }, select: { id: true, sku: true } }) : null;
    const shop = marketplaceShopId ? await db.marketplaceShop.findUnique({ where: { id: marketplaceShopId }, select: { id: true, marketplace: true } }) : null;
    const listing = listingRecordId ? await db.listing.findUnique({ where: { id: listingRecordId }, select: { id: true, platform: true, inventoryId: true, marketplaceShopId: true, externalId: true, status: true } }) : null;
    if ((inventoryId && !inventory) || (marketplaceShopId && (!shop || shop.marketplace !== event.platform)) || (listingRecordId && (!listing || listing.platform !== event.platform || (inventoryId && listing.inventoryId !== inventoryId) || (marketplaceShopId && listing.marketplaceShopId !== marketplaceShopId)))) throw new TrackerError("Task context no longer matches the product or shop", 409);
    const result = await ingestEvents(userId, { events: [{ ...event, classificationOverride: event.platform !== "ERP" }] }, erpHost, db, {
      inventoryId: inventory?.id || listing?.inventoryId || null, marketplaceShopId: shop?.id || listing?.marketplaceShopId || null,
      listingRecordId: listing?.id || null, sku: inventory?.sku || null,
      marketplaceListingId: listing && listing.status !== "DRAFT" ? listing.externalId : null,
      description: `${event.platform === "ERP" ? "ERP" : event.platform} · ${event.activityType.replaceAll("_", " ").toLowerCase()}`,
    });
    accepted.push(...result.accepted);
  }
  return { accepted };
}
export const revisionSchema = z.object({ revision: z.number().int().nonnegative() }).strict();
export { fields };
