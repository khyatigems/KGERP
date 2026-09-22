import { prisma } from "@/lib/prisma";

export interface CommunicationEntry {
  id: string;
  direction: "OUTBOUND" | "INBOUND";
  channel: "EMAIL" | "WHATSAPP" | "NOTE";
  recipient: string | null;
  subject: string | null;
  status: string | null;
  timestamp: Date;
}

/**
 * Unified communication timeline for a customer or order. Currently returns
 * outbound email history; inbound replies (Phase 14) and other channels can be
 * merged here later.
 */
export async function getCommunicationTimeline(input: {
  customerId?: string;
  orderId?: string;
  limit?: number;
}): Promise<CommunicationEntry[]> {
  const limit = Math.min(Math.max(input.limit || 50, 1), 200);

  const emails = await prisma.emailLog.findMany({
    where: {
      ...(input.customerId ? { customerId: input.customerId } : {}),
      ...(input.orderId ? { orderId: input.orderId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return emails.map((e) => ({
    id: e.id,
    direction: (e.direction === "INBOUND" ? "INBOUND" : "OUTBOUND") as "OUTBOUND" | "INBOUND",
    channel: "EMAIL" as const,
    recipient: e.recipient,
    subject: e.subject,
    status: e.status,
    timestamp: e.createdAt,
  }));
}

export async function getEmailLogById(id: string) {
  return prisma.emailLog.findUnique({ where: { id } });
}
