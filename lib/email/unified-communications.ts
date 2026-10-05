import { Prisma } from "@prisma/client";
import { ensureFollowUpSchema, ensureBillfreePhase1Schema, prisma } from "@/lib/prisma";
import { ensureMarketplaceFoundationSchema } from "@/lib/marketplace-foundation";

export type CommunicationChannel = "EMAIL" | "WHATSAPP" | "CALL" | "SMS" | "SYSTEM" | "FOLLOW_UP";
export type CommunicationSource = "EMAIL" | "WHATSAPP" | "FOLLOW_UP";

export interface UnifiedCommunicationRow {
  id: string;
  sourceId: string;
  sourceType: CommunicationSource;
  channel: CommunicationChannel;
  direction: "INBOUND" | "OUTBOUND";
  recipient: string | null;
  subject: string | null;
  status: string | null;
  emailType: string | null;
  provider: string | null;
  customerId: string | null;
  customerName: string | null;
  orderId: string | null;
  invoiceNumber: string | null;
  bodyRef: string | null;
  createdAt: Date;
  attemptCount: number;
  nextRetryAt: Date | null;
  failureCode: string | null;
  lastError: string | null;
  isRead: boolean;
  threadId: string | null;
  followUpAction: string | null;
  followUpNote: string | null;
  threadCount: number;
}

export interface UnifiedCommunicationFilters {
  channel?: string;
  direction?: string;
  status?: string;
  emailType?: string;
  customerId?: string;
  orderId?: string;
  provider?: string;
  from?: Date;
  to?: Date;
  q?: string;
  read?: string;
  page?: number;
  limit?: number;
}

function parseWhatsAppRecipient(payload: string | null): string | null {
  if (!payload) return null;
  try {
    const parsed: unknown = JSON.parse(payload);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const phone = (parsed as { phone?: unknown }).phone;
    return typeof phone === "string" ? phone : null;
  } catch (error) {
    console.error("[communication-center] Invalid WhatsApp campaign payload:", error);
    return null;
  }
}

function normalizedRow(row: UnifiedCommunicationRow & { payload?: string | null }): UnifiedCommunicationRow {
  let whatsappMessage: string | null = null;
  if (row.sourceType === "WHATSAPP" && row.payload) {
    try {
      const payload: unknown = JSON.parse(row.payload);
      if (payload && typeof payload === "object" && !Array.isArray(payload)) {
        const message = (payload as Record<string, unknown>).message;
        whatsappMessage = typeof message === "string" ? message : null;
      }
    } catch (error) {
      console.error("[communication-center] Invalid WhatsApp message payload:", error);
    }
  }
  return {
    ...row,
    recipient: row.sourceType === "WHATSAPP" ? parseWhatsAppRecipient(row.payload ?? null) : row.recipient,
    bodyRef: row.sourceType === "WHATSAPP" ? whatsappMessage : row.bodyRef,
    isRead: Boolean(row.isRead),
  };
}

const UNION = Prisma.sql`
  SELECT
    e."id" AS "id",
    e."id" AS "sourceId",
    'EMAIL' AS "sourceType",
    'EMAIL' AS "channel",
    e."direction" AS "direction",
    e."recipient" AS "recipient",
    e."subject" AS "subject",
    e."status" AS "status",
    e."emailType" AS "emailType",
    e."provider" AS "provider",
    e."customerId" AS "customerId",
    c."name" AS "customerName",
    e."orderId" AS "orderId",
    i."invoiceNumber" AS "invoiceNumber",
    e."bodyRef" AS "bodyRef",
    COALESCE(e."receivedAt", e."createdAt") AS "createdAt",
    e."attemptCount" AS "attemptCount",
    e."nextRetryAt" AS "nextRetryAt",
    e."failureCode" AS "failureCode",
    e."lastError" AS "lastError",
    e."isRead" AS "isRead",
    e."threadId" AS "threadId",
    NULL AS "followUpAction",
    NULL AS "followUpNote",
    CASE WHEN e."threadId" IS NULL THEN 1 ELSE
      (SELECT COUNT(*) FROM "EmailLog" e2 WHERE e2."threadId" = e."threadId")
    END AS "threadCount",
    NULL AS "payload"
  FROM "EmailLog" e
  LEFT JOIN "Customer" c ON c."id" = e."customerId"
  LEFT JOIN "Invoice" i ON i."id" = e."orderId"

  UNION ALL

  SELECT
    'whatsapp:' || w."id" AS "id",
    w."id" AS "sourceId",
    'WHATSAPP' AS "sourceType",
    'WHATSAPP' AS "channel",
    'OUTBOUND' AS "direction",
    NULL AS "recipient",
    w."eventType" AS "subject",
    w."status" AS "status",
    w."templateKey" AS "emailType",
    w."channel" AS "provider",
    w."customerId" AS "customerId",
    c."name" AS "customerName",
    w."invoiceId" AS "orderId",
    wi."invoiceNumber" AS "invoiceNumber",
    NULL AS "bodyRef",
    w."createdAt" AS "createdAt",
    0 AS "attemptCount",
    NULL AS "nextRetryAt",
    NULL AS "failureCode",
    NULL AS "lastError",
    1 AS "isRead",
    NULL AS "threadId",
    NULL AS "followUpAction",
    NULL AS "followUpNote",
    1 AS "threadCount",
    w."payload" AS "payload"
  FROM "CustomerCampaignLog" w
  LEFT JOIN "Customer" c ON c."id" = w."customerId"
  LEFT JOIN "Invoice" wi ON wi."id" = w."invoiceId"
  WHERE w."channel" LIKE 'WHATSAPP%'

  UNION ALL

  SELECT
    'followup:' || f."id" AS "id",
    f."id" AS "sourceId",
    'FOLLOW_UP' AS "sourceType",
    'FOLLOW_UP' AS "channel",
    'OUTBOUND' AS "direction",
    NULL AS "recipient",
    COALESCE(f."action", f."channel") AS "subject",
    f."status" AS "status",
    f."channel" AS "emailType",
    NULL AS "provider",
    COALESCE(s."customerId", q."customerId") AS "customerId",
    fc."name" AS "customerName",
    f."invoiceId" AS "orderId",
    i."invoiceNumber" AS "invoiceNumber",
    f."note" AS "bodyRef",
    f."date" AS "createdAt",
    0 AS "attemptCount",
    f."promisedDate" AS "nextRetryAt",
    NULL AS "failureCode",
    NULL AS "lastError",
    1 AS "isRead",
    NULL AS "threadId",
    f."channel" AS "followUpAction",
    f."note" AS "followUpNote",
    1 AS "threadCount",
    NULL AS "payload"
  FROM "FollowUp" f
  LEFT JOIN "Sale" s ON s."id" = (
    SELECT s2."id" FROM "Sale" s2
    WHERE s2."invoiceId" = f."invoiceId"
    ORDER BY s2."saleDate" ASC LIMIT 1
  )
  LEFT JOIN "Invoice" i ON i."id" = f."invoiceId"
  LEFT JOIN "Quotation" q ON q."id" = i."quotationId"
  LEFT JOIN "Customer" fc ON fc."id" = COALESCE(s."customerId", q."customerId")
`;

export async function getUnifiedCommunications(filters: UnifiedCommunicationFilters) {
  await Promise.all([
    ensureMarketplaceFoundationSchema(),
    ensureBillfreePhase1Schema(),
    ensureFollowUpSchema(),
  ]);

  const where: Prisma.Sql[] = [];
  if (filters.channel && ["EMAIL", "WHATSAPP", "FOLLOW_UP"].includes(filters.channel)) {
    where.push(Prisma.sql`"channel" = ${filters.channel}`);
  }
  if (filters.direction && ["INBOUND", "OUTBOUND"].includes(filters.direction)) {
    where.push(Prisma.sql`"direction" = ${filters.direction}`);
  }
  if (filters.status) where.push(Prisma.sql`"status" = ${filters.status}`);
  if (filters.emailType) where.push(Prisma.sql`"emailType" = ${filters.emailType}`);
  if (filters.customerId) where.push(Prisma.sql`"customerId" = ${filters.customerId}`);
  if (filters.orderId) where.push(Prisma.sql`"orderId" = ${filters.orderId}`);
  if (filters.provider) where.push(Prisma.sql`"provider" = ${filters.provider}`);
  if (filters.from) where.push(Prisma.sql`"createdAt" >= ${filters.from}`);
  if (filters.to) where.push(Prisma.sql`"createdAt" <= ${filters.to}`);
  if (filters.read === "unread") where.push(Prisma.sql`"sourceType" = 'EMAIL' AND "isRead" = 0`);
  if (filters.read === "read") where.push(Prisma.sql`("sourceType" != 'EMAIL' OR "isRead" = 1)`);
  if (filters.q?.trim()) {
    const search = `%${filters.q.trim()}%`;
    where.push(Prisma.sql`(
      "subject" LIKE ${search} OR
      COALESCE("recipient", '') LIKE ${search} OR
      COALESCE("customerName", '') LIKE ${search} OR
      COALESCE("invoiceNumber", '') LIKE ${search} OR
      COALESCE("bodyRef", '') LIKE ${search}
    )`);
  }
  const whereSql = where.length ? Prisma.sql`WHERE ${Prisma.join(where, " AND ")}` : Prisma.empty;
  const pageSize = Math.min(Math.max(
    typeof filters.limit === "number" && Number.isFinite(filters.limit)
      ? Math.trunc(filters.limit)
      : 25,
    1,
  ), 200);
  const requestedPage = Number.isFinite(filters.page) ? Math.max(1, Math.trunc(filters.page!)) : 1;
  const [counts, rawRows, channels, statuses, channelTotals, types, providers, customerIds] = await Promise.all([
    prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`
      SELECT COUNT(*) AS "total" FROM (${UNION}) communications ${whereSql}
    `),
    prisma.$queryRaw<Array<UnifiedCommunicationRow & { payload?: string | null }>>(Prisma.sql`
      SELECT * FROM (${UNION}) communications ${whereSql}
      ORDER BY "createdAt" DESC, "id" DESC
      LIMIT ${pageSize} OFFSET ${(requestedPage - 1) * pageSize}
    `),
    prisma.$queryRaw<Array<{ channel: string }>>(Prisma.sql`
      SELECT DISTINCT "channel" AS "channel" FROM (${UNION}) communications
      ORDER BY "channel"
    `),
    prisma.$queryRaw<Array<{ status: string }>>(Prisma.sql`
      SELECT DISTINCT "status" AS "status" FROM (${UNION}) communications
      WHERE "status" IS NOT NULL ORDER BY "status"
    `),
    prisma.$queryRaw<Array<{ channel: string; count: number }>>(Prisma.sql`
      SELECT "channel", COUNT(*) AS "count" FROM (${UNION}) communications
      GROUP BY "channel"
    `),
    prisma.$queryRaw<Array<{ emailType: string }>>(Prisma.sql`
      SELECT DISTINCT "emailType" FROM (${UNION}) communications
      WHERE "emailType" IS NOT NULL ORDER BY "emailType"
    `),
    prisma.$queryRaw<Array<{ provider: string }>>(Prisma.sql`
      SELECT DISTINCT "provider" FROM (${UNION}) communications
      WHERE "provider" IS NOT NULL ORDER BY "provider"
    `),
    prisma.$queryRaw<Array<{ customerId: string }>>(Prisma.sql`
      SELECT DISTINCT "customerId" FROM (${UNION}) communications
      WHERE "customerId" IS NOT NULL ORDER BY "customerId"
    `),
  ]);
  const customers = customerIds.length
    ? await prisma.customer.findMany({
        where: { id: { in: customerIds.map(({ customerId }) => customerId) } },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];

  const total = Number(counts[0]?.total || 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const rows = page === requestedPage
    ? rawRows.map(normalizedRow)
    : await prisma.$queryRaw<Array<UnifiedCommunicationRow & { payload?: string | null }>>(Prisma.sql`
        SELECT * FROM (${UNION}) communications ${whereSql}
        ORDER BY "createdAt" DESC, "id" DESC
        LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
      `).then((reloaded) => reloaded.map(normalizedRow));

  return {
    rows,
    total,
    page,
    pageSize,
    totalPages,
    options: {
      channels: channels.map(({ channel }) => channel),
      statuses: statuses.map(({ status }) => status),
      emailTypes: types.map(({ emailType }) => emailType),
      providers: providers.map(({ provider }) => provider),
      customers,
    },
    summary: {
      total: channelTotals.reduce((sum, entry) => sum + Number(entry.count), 0),
      whatsapp: Number(channelTotals.find((entry) => entry.channel === "WHATSAPP")?.count || 0),
      followUps: Number(channelTotals.find((entry) => entry.channel === "FOLLOW_UP")?.count || 0),
    },
  };
}

export async function getUnifiedCommunicationDetail(id: string) {
  await Promise.all([
    ensureBillfreePhase1Schema(),
    ensureFollowUpSchema(),
  ]);
  if (id.startsWith("whatsapp:")) {
    const sourceId = id.slice("whatsapp:".length);
    const rows = await prisma.$queryRaw<Array<{
      id: string;
      customerId: string;
      customerName: string | null;
      eventType: string;
      channel: string;
      templateKey: string | null;
      payload: string | null;
      status: string;
      createdAt: Date;
      launchedById: string | null;
      launchedByName: string | null;
      invoiceId: string | null;
      invoiceNumber: string | null;
    }>>(Prisma.sql`
      SELECT w."id", w."customerId", c."name" AS "customerName", w."eventType",
        w."channel", w."templateKey", w."payload", w."status", w."createdAt",
        w."launchedById", u."name" AS "launchedByName",
        w."invoiceId", i."invoiceNumber"
      FROM "CustomerCampaignLog" w
      LEFT JOIN "Customer" c ON c."id" = w."customerId"
      LEFT JOIN "User" u ON u."id" = w."launchedById"
      LEFT JOIN "Invoice" i ON i."id" = w."invoiceId"
      WHERE w."id" = ${sourceId} AND w."channel" LIKE 'WHATSAPP%'
      LIMIT 1
    `);
    const row = rows[0];
    if (!row) return null;
    let message: string | null = null;
    let phone: string | null = null;
    if (row.payload) {
      try {
        const payload: unknown = JSON.parse(row.payload);
        if (payload && typeof payload === "object" && !Array.isArray(payload)) {
          const data = payload as Record<string, unknown>;
          message = typeof data.message === "string" ? data.message : null;
          phone = typeof data.phone === "string" ? data.phone : null;
        }
      } catch (error) {
        console.error("[communication-detail] Invalid WhatsApp payload:", error);
      }
    }
    return {
      id,
      sourceId: row.id,
      sourceType: "WHATSAPP" as const,
      channel: "WHATSAPP" as const,
      customerId: row.customerId,
      customerName: row.customerName,
      subject: row.eventType,
      status: row.status,
      provider: "WhatsApp Web · manual handoff",
      templateKey: row.templateKey,
      createdAt: row.createdAt,
      phone,
      message,
      launchedById: row.launchedById,
      createdByName: row.launchedByName,
      invoiceId: row.invoiceId,
      invoiceNumber: row.invoiceNumber,
    };
  }
  if (id.startsWith("followup:")) {
    const sourceId = id.slice("followup:".length);
    const followUp = await prisma.followUp.findUnique({
      where: { id: sourceId },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            sales: {
              take: 1,
              orderBy: { saleDate: "asc" },
              select: { customer: { select: { id: true, name: true } } },
            },
          },
        },
        createdBy: { select: { name: true } },
      },
    });
    if (!followUp) return null;
    const customer = followUp.invoice.sales[0]?.customer ?? null;
    return {
      id,
      sourceId: followUp.id,
      sourceType: "FOLLOW_UP" as const,
      channel: followUp.channel,
      customerId: customer?.id ?? null,
      customerName: customer?.name ?? null,
      subject: followUp.action || `${followUp.channel} follow-up`,
      status: followUp.status,
      provider: null,
      templateKey: null,
      createdAt: followUp.date,
      phone: null,
      message: followUp.note,
      launchedById: followUp.createdById,
      invoiceId: followUp.invoice.id,
      invoiceNumber: followUp.invoice.invoiceNumber,
      completedAt: followUp.completedAt,
      cancelledAt: followUp.cancelledAt,
      promisedDate: followUp.promisedDate,
      rescheduledTo: followUp.rescheduledTo,
      createdByName: followUp.createdBy?.name ?? null,
    };
  }
  return null;
}
