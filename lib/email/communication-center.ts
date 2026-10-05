import type { Prisma } from "@prisma/client";
import { ensureActivityLogSchema, prisma } from "@/lib/prisma";
import { MAX_EMAIL_ATTEMPTS, TRANSIENT_EMAIL_FAILURE_CODES } from "@/lib/email/retry-policy";
import { formatMarketplaceDateTime } from "@/lib/utils";
import { getUnifiedCommunications } from "@/lib/email/unified-communications";

export const COMMUNICATION_PAGE_SIZE = 25;

const STATUSES = ["DRAFT", "QUEUED", "PROCESSING", "SENT", "DELIVERED", "OPENED", "RECEIVED", "FAILED", "BOUNCED", "CANCELLED", "LAUNCHED", "OPEN", "COMPLETED", "RESCHEDULED"];
const DIRECTIONS = ["INBOUND", "OUTBOUND"];
const SENT_STATUSES = ["SENT", "DELIVERED", "OPENED", "BOUNCED"];
const AWAITING_REPLY_STATUSES = ["SENT", "DELIVERED", "OPENED"];

export interface CommunicationCenterFilters {
  channel?: string;
  direction?: string;
  status?: string;
  emailType?: string;
  customerId?: string;
  provider?: string;
  from?: string;
  to?: string;
  q?: string;
  read?: string;
  page?: string;
}

export interface CommunicationTimelineEntry {
  id: string;
  direction: "OUTBOUND" | "INBOUND";
  channel: "EMAIL" | "WHATSAPP" | "NOTE";
  recipient: string | null;
  subject: string | null;
  bodyRef: string | null;
  status: string | null;
  timestamp: Date;
  customerId: string | null;
  customerName: string | null;
  orderId: string | null;
  invoiceNumber: string | null;
}

export async function getCommunicationTimeline(input: {
  customerId?: string;
  orderId?: string;
  limit?: number;
}): Promise<CommunicationTimelineEntry[]> {
  const requestedLimit = typeof input.limit === "number" && Number.isFinite(input.limit)
    ? Math.trunc(input.limit)
    : 50;
  const limit = Math.min(Math.max(requestedLimit, 1), 200);
  const emails = await prisma.emailLog.findMany({
    where: {
      ...(input.customerId ? { customerId: input.customerId } : {}),
      ...(input.orderId ? { orderId: input.orderId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      direction: true,
      recipient: true,
      subject: true,
      status: true,
      createdAt: true,
      customerId: true,
      orderId: true,
    },
  });
  const invoiceIds = [...new Set(emails.map((email) => email.orderId).filter((id): id is string => Boolean(id)))];
  const customerIds = [...new Set(emails.map((email) => email.customerId).filter((id): id is string => Boolean(id)))];
  const [invoices, customers] = await Promise.all([
    invoiceIds.length
      ? prisma.invoice.findMany({
          where: { id: { in: invoiceIds } },
          select: { id: true, invoiceNumber: true },
        })
      : [],
    customerIds.length
      ? prisma.customer.findMany({
          where: { id: { in: customerIds } },
          select: { id: true, name: true },
        })
      : [],
  ]);
  const invoiceNumbers = new Map(invoices.map((invoice) => [invoice.id, invoice.invoiceNumber]));
  const customerNames = new Map(customers.map((customer) => [customer.id, customer.name]));

  return emails.map((email) => ({
    id: email.id,
    direction: email.direction === "INBOUND" ? "INBOUND" : "OUTBOUND",
    channel: "EMAIL",
    recipient: email.recipient,
    subject: email.subject,
    bodyRef: null,
    status: email.status,
    timestamp: email.createdAt,
    customerId: email.customerId,
    customerName: email.customerId ? customerNames.get(email.customerId) ?? null : null,
    orderId: email.orderId,
    invoiceNumber: email.orderId ? invoiceNumbers.get(email.orderId) ?? null : null,
  }));
}

function parseDate(value: string | undefined, endOfDay: boolean): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (
    calendarDate.getUTCFullYear() !== year ||
    calendarDate.getUTCMonth() !== month - 1 ||
    calendarDate.getUTCDate() !== day
  ) return undefined;
  return new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+05:30`);
}

export async function getCommunicationCenter(filters: CommunicationCenterFilters) {
  await ensureActivityLogSchema();
  const search = filters.q?.trim();
  const from = parseDate(filters.from, false);
  const to = parseDate(filters.to, true);
  const requestedPage = Number.parseInt(filters.page || "1", 10);
  const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;

  const indiaDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const today = new Date(`${indiaDate}T00:00:00+05:30`);
  const retryQueueWhere: Prisma.EmailLogWhereInput = {
    status: "QUEUED",
    nextRetryAt: { not: null },
    failureCode: { in: [...TRANSIENT_EMAIL_FAILURE_CODES] },
    attemptCount: { lt: MAX_EMAIL_ATTEMPTS },
  };
  const scheduledQueueWhere: Prisma.EmailLogWhereInput = {
    status: "QUEUED",
    nextRetryAt: { not: null },
    failureCode: null,
    attemptCount: 0,
  };
  const recoveryQueueWhere: Prisma.EmailLogWhereInput = {
    status: "QUEUED",
    nextRetryAt: { not: null },
    OR: [
      { failureCode: { in: [...TRANSIENT_EMAIL_FAILURE_CODES] }, attemptCount: { lt: MAX_EMAIL_ATTEMPTS } },
      { failureCode: null, attemptCount: 0 },
    ],
  };
  const [
    sentToday,
    queued,
    retryScheduled,
    scheduled,
    dueNow,
    failed,
    retryableFailed,
    unread,
    bounced,
    inbound,
    latestCustomerMessages,
    eligibleEmails,
    queuedEmails,
    lastInboxSync,
  ] =
    await Promise.all([
      prisma.emailLog.count({
        where: {
          OR: [
            { direction: "OUTBOUND", status: { in: SENT_STATUSES }, sentAt: { gte: today } },
            {
              direction: "OUTBOUND",
              sentAt: null,
              createdAt: { gte: today },
              status: { in: SENT_STATUSES },
            },
          ],
        },
      }),
      prisma.emailLog.count({ where: { status: "QUEUED" } }),
      prisma.emailLog.count({ where: retryQueueWhere }),
      prisma.emailLog.count({ where: scheduledQueueWhere }),
      prisma.emailLog.count({ where: { ...recoveryQueueWhere, nextRetryAt: { lte: new Date() } } }),
      prisma.emailLog.count({ where: { status: "FAILED" } }),
      prisma.emailLog.count({
        where: {
          status: "FAILED",
          failureCode: { in: [...TRANSIENT_EMAIL_FAILURE_CODES] },
          attemptCount: { lt: MAX_EMAIL_ATTEMPTS },
        },
      }),
      prisma.emailLog.count({ where: { isRead: false } }),
      prisma.emailLog.count({ where: { status: "BOUNCED" } }),
      prisma.emailLog.count({ where: { direction: "INBOUND" } }),
      prisma.emailLog.findMany({
        where: {
          customerId: { not: null },
          OR: [
            { direction: "INBOUND" },
            { direction: "OUTBOUND", status: { in: AWAITING_REPLY_STATUSES } },
          ],
        },
        select: { customerId: true, direction: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.emailLog.findMany({
        where: {
          status: "FAILED",
          failureCode: { in: [...TRANSIENT_EMAIL_FAILURE_CODES] },
          attemptCount: { lt: MAX_EMAIL_ATTEMPTS },
        },
        select: { id: true, recipient: true, subject: true, attemptCount: true },
        orderBy: { failedAt: "asc" },
        take: 25,
      }),
      prisma.emailLog.findMany({
        where: recoveryQueueWhere,
        select: { id: true, recipient: true, subject: true, attemptCount: true, nextRetryAt: true, failureCode: true },
        orderBy: { nextRetryAt: "asc" },
        take: 25,
      }),
      prisma.activityLog.findFirst({
        where: { module: "communication", action: "inbox.sync" },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

  const latestDirectionByCustomer = new Map<string, string>();
  for (const message of latestCustomerMessages) {
    if (message.customerId && !latestDirectionByCustomer.has(message.customerId)) {
      latestDirectionByCustomer.set(message.customerId, message.direction);
    }
  }
  const awaitingReply = [...latestDirectionByCustomer.values()].filter((direction) => direction === "OUTBOUND").length;
  const providerConfigured = Boolean(
    (process.env.RESEND_API_KEY || "").trim() ||
    (
      (process.env.ZOHO_CLIENT_ID || "").trim() &&
      (process.env.ZOHO_CLIENT_SECRET || "").trim() &&
      (process.env.ZOHO_REDIRECT_URI || "").trim()
    ),
  );
  const health = !providerConfigured
    ? { level: "CRITICAL", label: "No provider configured" }
    : failed > 0 || dueNow > 0 || queued > 0
      ? { level: "ATTENTION", label: "Attention needed" }
      : { level: "HEALTHY", label: "Healthy" };
  const unified = await getUnifiedCommunications({
    channel: filters.channel,
    direction: filters.direction,
    status: filters.status,
    emailType: filters.emailType,
    customerId: filters.customerId,
    provider: filters.provider,
    from,
    to,
    q: search,
    read: filters.read,
    page,
  });

  return {
    rows: unified.rows,
    filters: {
      channel: ["EMAIL", "WHATSAPP", "FOLLOW_UP"].includes(filters.channel || "") ? filters.channel! : "",
      direction: DIRECTIONS.includes(filters.direction || "") ? filters.direction! : "",
      status: STATUSES.includes(filters.status || "") ? filters.status! : "",
      emailType: filters.emailType || "",
      customerId: filters.customerId || "",
      provider: filters.provider || "",
      from: from ? filters.from! : "",
      to: to ? filters.to! : "",
      q: search || "",
      read: filters.read === "unread" || filters.read === "read" ? filters.read : "",
    },
    options: {
      statuses: [...new Set([...STATUSES, ...unified.options.statuses])].sort(),
      channels: unified.options.channels,
      emailTypes: unified.options.emailTypes,
      providers: unified.options.providers,
      customers: unified.options.customers,
    },
    pagination: {
      page: unified.page,
      pageSize: unified.pageSize,
      total: unified.total,
      totalPages: unified.totalPages,
    },
    eligibleEmails,
    queuedEmails: queuedEmails.map((email) => ({
      ...email,
      nextRetryAt: email.nextRetryAt ? formatMarketplaceDateTime(email.nextRetryAt) : null,
    })),
    stats: {
      total: unified.summary.total,
      sentToday,
      queued,
      failed,
      bounced,
      inbound,
      awaitingReply,
      unread,
      retryScheduled,
      scheduled,
      dueNow,
      retryableFailed,
      whatsapp: unified.summary.whatsapp,
      followUps: unified.summary.followUps,
    },
    health: {
      ...health,
      providerConfigured,
      inboxSyncAt: lastInboxSync?.createdAt ?? null,
    },
  };
}
