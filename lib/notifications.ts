import { prisma } from "@/lib/prisma";
import { routeNotification } from "@/lib/notification-routing";

let notificationSchemaReady = false;
let notificationSchemaPromise: Promise<void> | null = null;

export type NotificationSeverity = "info" | "success" | "warning" | "error";

export interface NotificationEvent {
  userId: string;
  eventKey: string;
  delivery?: "important_activity" | "operational_failure";
  severity: NotificationSeverity;
  title: string;
  message: string;
  href?: string;
  createdAt?: Date;
}

/** Create the additive notification table on older ERP databases, then verify it exists. */
export async function ensureNotificationSchema() {
  if (notificationSchemaReady) return;
  if (notificationSchemaPromise) return notificationSchemaPromise;
  notificationSchemaPromise = (async () => {
    try {
      await prisma.notification.count();
      await ensureNotificationLifecycleColumns();
      notificationSchemaReady = true;
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      const databaseError = error as { code?: string; meta?: { modelName?: string } };
      const missingNotificationTable = message.includes("no such table") && message.includes("notification")
        || databaseError.code === "P2021" && databaseError.meta?.modelName === "Notification";
      if (!missingNotificationTable) throw error;
    }

    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Notification" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "eventKey" TEXT NOT NULL,
      "type" TEXT NOT NULL DEFAULT 'info',
      "title" TEXT NOT NULL,
      "message" TEXT NOT NULL,
      "href" TEXT,
      "readAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Notification_userId_eventKey_key" ON "Notification"("userId", "eventKey")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt")`);
    await ensureNotificationLifecycleColumns();
    await prisma.notification.count();
    notificationSchemaReady = true;
  })().finally(() => { notificationSchemaPromise = null; });
  return notificationSchemaPromise;
}

/** Persist an event once per user and event key; repeated job polling is safe. */
export async function persistNotification(event: NotificationEvent) {
  if (routeNotification(event.delivery ?? "operational_failure") !== "persistent" || !event.userId || !event.eventKey) return null;
  await ensureNotificationSchema();
  return prisma.notification.upsert({
    where: { userId_eventKey: { userId: event.userId, eventKey: event.eventKey } },
    create: {
      userId: event.userId,
      eventKey: event.eventKey,
      type: event.severity,
      title: event.title.slice(0, 120),
      message: event.message.slice(0, 500),
      href: event.href?.slice(0, 500) ?? null,
      ...(event.createdAt ? { createdAt: event.createdAt } : {}),
    },
    // Keep the first event timestamp and read state stable on duplicate delivery.
    update: {},
  });
}

/** Populate an empty bell from recent, successful audit records written before bell events were wired in. */
export async function backfillRecentActivityNotifications(userId: string) {
  try {
    await ensureNotificationSchema();
    if (await prisma.notification.count({ where: { userId } })) return;
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activity = await prisma.activityLog.findMany({
      where: {
        userId,
        source: "WEB",
        actionType: "CREATE",
        entityType: { in: ["Inventory", "Purchase", "Quotation"] },
        createdAt: { gte: since },
      },
      select: { id: true, entityType: true, entityId: true, entityIdentifier: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    for (const item of activity) {
      const kind = item.entityType;
      if (!kind || !item.entityId) continue;
      const type = kind === "Inventory" ? "inventory" : kind === "Purchase" ? "purchase" : "quotation";
      const label = item.entityIdentifier?.trim();
      const title = kind === "Inventory" ? "Inventory item added" : kind === "Purchase" ? "Purchase recorded" : "Quotation created";
      await persistNotificationSafely({
        userId,
        eventKey: `${type}-created:${item.entityId}`,
        delivery: "important_activity",
        severity: "success",
        title,
        message: `${kind}${label ? ` ${label}` : " record"} was created successfully.`,
        href: `/${type === "quotation" ? "quotes" : type === "purchase" ? "purchases" : "inventory"}/${item.entityId}`,
        createdAt: item.createdAt,
      });
    }
  } catch (error) {
    // Bell reads should still work when audit history is unavailable.
    console.error("Could not backfill recent activity notifications", { userId, error });
  }
}

/** Notifications are secondary to the business transaction: log delivery failures without changing its result. */
export async function persistNotificationSafely(event: NotificationEvent) {
  try {
    return await persistNotification(event);
  } catch (error) {
    console.error("Could not persist ERP notification", { eventKey: event.eventKey, error });
    return null;
  }
}

// Additive compatibility for installations using the existing runtime schema bootstrap.
async function ensureNotificationLifecycleColumns() {
  const columns = await prisma.$queryRawUnsafe<Array<{ name: string }>>('PRAGMA table_info("Notification")');
  for (const name of ["acknowledgedAt", "resolvedAt", "snoozedUntil"]) {
    if (columns.some(column => column.name === name)) continue;
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "Notification" ADD COLUMN "${name}" DATETIME`); }
    catch (error) {
      const current = await prisma.$queryRawUnsafe<Array<{ name: string }>>('PRAGMA table_info("Notification")');
      if (!current.some(column => column.name === name)) throw error;
    }
  }
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_id_idx" ON "Notification"("userId", "createdAt", "id")`);
}

/** Recovery proof comes from the stored terminal job, never a client acknowledgement. */
export async function resolveMarketplaceNotificationSafely(jobId: string) {
  try {
    const job = await prisma.marketplaceSyncJob.findUnique({ where: { id: jobId }, select: { status: true, recordsFailed: true, requestedById: true } });
    if (!job || job.status !== "SUCCESS" || job.recordsFailed !== 0 || !job.requestedById) return;
    await ensureNotificationSchema();
    await prisma.notification.updateMany({ where: { userId: job.requestedById, eventKey: `marketplace-sync:${jobId}`, resolvedAt: null }, data: { resolvedAt: new Date() } });
    const recovered = await prisma.marketplaceSyncJob.findUnique({ where: { id: jobId } });
    if (!recovered) return;
    const pending = [jobId];
    const visited = new Set<string>();
    // Retries may themselves fail. Follow the server-written chain without cycles.
    while (pending.length && visited.size < 100) {
      const current = pending.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      const mapping = await prisma.setting.findUnique({ where: { key: `notification-recovery:${current}` } });
      if (!mapping) continue;
      const sourceIds: unknown = JSON.parse(mapping.value || "[]");
      if (!Array.isArray(sourceIds) || sourceIds.length > 100 || sourceIds.some(id => typeof id !== "string")) continue;
      const sources = await prisma.marketplaceSyncJob.findMany({ where: { id: { in: sourceIds }, marketplaceShopId: recovered.marketplaceShopId, syncType: recovered.syncType, status: { in: ["FAILED", "PARTIAL"] } }, select: { id: true, requestedById: true } });
      for (const source of sources) {
        if (source.requestedById) await prisma.notification.updateMany({ where: { userId: source.requestedById, eventKey: `marketplace-sync:${source.id}`, resolvedAt: null }, data: { resolvedAt: new Date() } });
        if (!visited.has(source.id)) pending.push(source.id);
      }
    }
  } catch { console.error("Could not save verified notification recovery", { jobId }); }
}
