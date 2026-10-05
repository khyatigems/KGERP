import { prisma } from "@/lib/prisma";
import { ensureMarketplaceFoundationSchema } from "@/lib/marketplace-foundation";
import { ensureActivityLogSchema } from "@/lib/prisma";
import { getUnifiedCommunications } from "@/lib/email/unified-communications";

export type { CommunicationTimelineEntry as CommunicationEntry } from "@/lib/email/communication-center";

export async function getCommunicationTimeline(input: {
  customerId?: string;
  orderId?: string;
  limit?: number;
}) {
  const { rows } = await getUnifiedCommunications({
    customerId: input.customerId,
    orderId: input.orderId,
    limit: input.limit,
  });
  return rows.map((row) => ({
    id: row.id,
    direction: row.direction,
    channel: row.sourceType === "FOLLOW_UP" ? row.followUpAction || row.channel : row.channel,
    recipient: row.recipient,
    subject: row.subject,
    bodyRef: row.bodyRef,
    status: row.status,
    timestamp: row.createdAt,
    customerId: row.customerId,
    customerName: row.customerName,
    orderId: row.orderId,
    invoiceNumber: row.invoiceNumber,
    sourceType: row.sourceType,
    followUpNote: row.followUpNote,
  }));
}

export async function getCommunicationDetail(id: string) {
  await Promise.all([ensureMarketplaceFoundationSchema(), ensureActivityLogSchema()]);
  const email = await prisma.emailLog.findUnique({ where: { id } });
  if (!email) return null;
  const [customer, invoice, conversation, providerEvents, auditEvents] = await Promise.all([
    email.customerId
      ? prisma.customer.findUnique({ where: { id: email.customerId }, select: { id: true, name: true } })
      : null,
    email.orderId
      ? prisma.invoice.findUnique({ where: { id: email.orderId }, select: { id: true, invoiceNumber: true } })
      : null,
    prisma.emailLog.findMany({
      where: email.threadId ? { threadId: email.threadId } : { id: email.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.emailProviderEvent.findMany({
      where: { communicationId: email.id },
      orderBy: { occurredAt: "asc" },
    }),
    prisma.activityLog.findMany({
      where: {
        OR: [
          { module: "communication", referenceId: email.id },
          { entityType: "EmailLog", entityId: email.id },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        action: true,
        actionType: true,
        userName: true,
        userEmail: true,
        createdAt: true,
        fieldChanges: true,
      },
    }),
  ]);
  return { ...email, customer, invoice, conversation, providerEvents, auditEvents };
}
