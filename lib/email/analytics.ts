import { ensureMarketplaceFoundationSchema } from "@/lib/marketplace-foundation";
import { ensureFollowUpSchema, prisma } from "@/lib/prisma";

const LOOKBACK_DAYS = 30;

function configuredProviderNames(): string[] {
  const configured: string[] = [];
  if (
    (process.env.ZOHO_CLIENT_ID || "").trim() &&
    (process.env.ZOHO_CLIENT_SECRET || "").trim() &&
    (process.env.ZOHO_REDIRECT_URI || "").trim()
  ) configured.push("zoho");
  if ((process.env.RESEND_API_KEY || "").trim()) configured.push("resend");
  return configured;
}

export async function getCommunicationAnalytics() {
  await Promise.all([ensureMarketplaceFoundationSchema(), ensureFollowUpSchema()]);
  const now = new Date();
  const since = new Date(now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const [
    statusCounts,
    emailTypeCounts,
    attemptedMessages,
    threadedMessages,
    customerCounts,
    queueCount,
    dueCount,
    failedNow,
    lastInboxSync,
    overdueFollowUps,
    upcomingFollowUps,
  ] = await Promise.all([
    prisma.emailLog.groupBy({
      by: ["status"],
      where: { direction: "OUTBOUND", createdAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.emailLog.groupBy({
      by: ["emailType", "status"],
      where: { direction: "OUTBOUND", createdAt: { gte: since } },
      _count: { _all: true },
      orderBy: [{ emailType: "asc" }, { status: "asc" }],
    }),
    prisma.emailLog.findMany({
      where: { direction: "OUTBOUND", sentAt: { not: null }, createdAt: { gte: since } },
      select: { status: true, attemptCount: true, sentAt: true, deliveredAt: true },
      take: 5000,
      orderBy: { createdAt: "desc" },
    }),
    prisma.emailLog.findMany({
      where: {
        threadId: { not: null },
        customerId: { not: null },
        direction: { in: ["INBOUND", "OUTBOUND"] },
        createdAt: { gte: since },
      },
      select: { threadId: true, customerId: true, direction: true, createdAt: true },
      take: 10000,
      orderBy: { createdAt: "asc" },
    }),
    prisma.emailLog.findMany({
      where: {
        customerId: { not: null },
        direction: "OUTBOUND",
        status: { in: ["SENT", "DELIVERED", "OPENED", "BOUNCED"] },
        createdAt: { gte: since },
      },
      select: { customerId: true, direction: true },
    }),
    prisma.emailLog.count({ where: { status: "QUEUED" } }),
    prisma.emailLog.count({
      where: { status: "QUEUED", nextRetryAt: { lte: new Date() } },
    }),
    prisma.emailLog.count({ where: { status: "FAILED" } }),
    prisma.activityLog.findFirst({
      where: { module: "communication", action: "inbox.sync" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, userName: true, details: true },
    }),
    prisma.followUp.count({ where: { status: "OPEN", date: { lt: now } } }),
    prisma.followUp.count({
      where: {
        status: "OPEN",
        date: { gte: now, lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  const countByStatus = new Map(statusCounts.map((entry) => [entry.status, entry._count._all]));
  const sent = ["SENT", "DELIVERED", "OPENED", "BOUNCED"].reduce(
    (total, status) => total + (countByStatus.get(status) || 0),
    0,
  );
  const delivered = (countByStatus.get("DELIVERED") || 0) +
    (countByStatus.get("OPENED") || 0);
  const failed = countByStatus.get("FAILED") || 0;
  const bounced = countByStatus.get("BOUNCED") || 0;
  const opened = countByStatus.get("OPENED") || 0;
  const retries = attemptedMessages.filter((message) => message.attemptCount > 1).length;
  const deliveryDurations = attemptedMessages
    .filter((message) => message.sentAt && message.deliveredAt)
    .map((message) => message.deliveredAt!.getTime() - message.sentAt!.getTime())
    .filter((duration) => duration >= 0);
  const averageDeliverySeconds = deliveryDurations.length
    ? Math.round(deliveryDurations.reduce((sum, duration) => sum + duration, 0) / deliveryDurations.length / 1000)
    : null;
  const chronologicalThreads = new Map<string, typeof threadedMessages>();
  for (const message of threadedMessages) {
    const threadId = message.threadId;
    if (!threadId) continue;
    const thread = chronologicalThreads.get(threadId) || [];
    thread.push(message);
    chronologicalThreads.set(threadId, thread);
  }
  const responseDurations: number[] = [];
  for (const thread of chronologicalThreads.values()) {
    let previousOutbound: Date | null = null;
    for (const message of thread) {
      if (message.direction === "OUTBOUND") {
        previousOutbound = message.createdAt;
      } else if (message.direction === "INBOUND" && previousOutbound) {
        const duration = message.createdAt.getTime() - previousOutbound.getTime();
        if (duration >= 0) responseDurations.push(duration);
        previousOutbound = null;
      }
    }
  }
  const contactedCustomerIds = new Set(customerCounts.map((item) => item.customerId).filter(Boolean));
  const respondedCustomerIds = new Set(
    threadedMessages
      .filter((item) => item.direction === "INBOUND" && item.customerId)
      .map((item) => item.customerId),
  );
  const latestDirection = new Map<string, string>();
  const latestCustomerMessages = await prisma.emailLog.findMany({
    where: { customerId: { not: null }, direction: { in: ["INBOUND", "OUTBOUND"] } },
    select: { customerId: true, direction: true },
    orderBy: { createdAt: "desc" },
  });
  for (const message of latestCustomerMessages) {
    if (message.customerId && !latestDirection.has(message.customerId)) {
      latestDirection.set(message.customerId, message.direction);
    }
  }

  const configuredProviders = configuredProviderNames();
  const activeProvider = (process.env.EMAIL_PROVIDER || "").trim().toLowerCase();
  const providers = ["zoho", "resend"].map((name) => ({
    name,
    configured: configuredProviders.includes(name),
    active: activeProvider ? activeProvider === name : configuredProviders[0] === name,
    webhookConfigured: name === "resend" && Boolean((process.env.RESEND_WEBHOOK_SECRET || "").trim()),
  }));
  const hasProvider = configuredProviders.length > 0;
  const health = !hasProvider
    ? { level: "CRITICAL" as const, label: "No provider configured" }
    : failedNow > 0 || dueCount > 0 || queueCount > 0
      ? { level: failedNow > 0 && dueCount > 0 ? "CRITICAL" as const : "ATTENTION" as const, label: "Attention needed" }
      : { level: "HEALTHY" as const, label: "Healthy" };

  return {
    since,
    metrics: {
      sent,
      delivered,
      opened,
      bounced,
      failed,
      queued: countByStatus.get("QUEUED") || 0,
      queueSize: queueCount,
      dueNow: dueCount,
      failedNow,
      overdueFollowUps,
      upcomingFollowUps,
      averageDeliverySeconds,
      failureRate: sent + failed ? Math.round((failed / (sent + failed)) * 1000) / 10 : null,
      retryRate: attemptedMessages.length ? Math.round((retries / attemptedMessages.length) * 1000) / 10 : null,
      averageResponseHours: responseDurations.length
        ? Math.round(responseDurations.reduce((sum, duration) => sum + duration, 0) / responseDurations.length / 3_600_000 * 10) / 10
        : null,
      customersContacted: contactedCustomerIds.size,
      customersResponded: respondedCustomerIds.size,
      awaitingResponse: [...latestDirection.values()].filter((direction) => direction === "OUTBOUND").length,
    },
    byEmailType: emailTypeCounts.map((entry) => ({
      emailType: entry.emailType || "Other",
      status: entry.status,
      count: entry._count._all,
    })),
    providers,
    health,
    lastInboxSync,
  };
}
