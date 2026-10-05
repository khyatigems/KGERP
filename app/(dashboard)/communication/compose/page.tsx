import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CommunicationComposer } from "@/components/communication/communication-composer";
import { auth } from "@/lib/auth";
import { getCommunicationDetail } from "@/lib/email/email-log";
import { listEmailTemplates } from "@/lib/email/templates";
import { prisma } from "@/lib/prisma";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { htmlToPlainText } from "@/lib/email/content";
import { formatMarketplaceDateTime } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { getInvoiceOrderReferences } from "@/lib/email/order-reference";

export const metadata: Metadata = {
  title: "Compose Email",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function parseReferences(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
  } catch (error) {
    console.error("[communication-compose] Invalid thread references:", error);
    return [];
  }
}

export default async function ComposeCommunicationPage({
  searchParams,
}: {
  searchParams: Promise<{ reply?: string; mode?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await checkUserPermission(session.user.id, PERMISSIONS.COMMUNICATION_MANAGE))) redirect("/");

  const query = await searchParams;
  const [customers, invoices, templates, source] = await Promise.all([
    prisma.customer.findMany({
      where: { email: { not: null } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
      take: 500,
    }),
    prisma.invoice.findMany({
      select: {
        id: true,
        invoiceNumber: true,
        quotationId: true,
        createdAt: true,
        sales: {
          take: 1,
          orderBy: { saleDate: "asc" },
          select: { saleDate: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    listEmailTemplates(),
    query.reply ? getCommunicationDetail(query.reply) : null,
  ]);
  const orderReferences = await getInvoiceOrderReferences(invoices.map((invoice) => invoice.id));
  const invoiceOptions = invoices.map((invoice) => ({
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    quotationId: invoice.quotationId,
    orderNumber: orderReferences.get(invoice.id) || "",
    purchaseDate: formatDate(invoice.sales[0]?.saleDate || invoice.createdAt),
  }));
  const sourceId = source?.id;
  const action = query.mode === "forward" ? "forward" : query.mode === "replyAll" ? "replyAll" : "reply";
  const sourceRecipient =
    source?.direction === "INBOUND"
      ? source.recipient.match(/<([^>]+)>/)?.[1] || source.recipient
      : source?.recipient || "";
  const defaultTo = !source || action === "forward" ? "" : sourceRecipient;
  const defaultSubject = source
    ? `${action === "forward" ? "Fwd: " : "Re: "}${source.subject.replace(/^(?:(?:re|fwd):\s*)+/i, "")}`
    : "";
  const conversationReferences = source
    ? [
        ...parseReferences(source.referencesJson),
        ...(source.messageId ? [source.messageId] : []),
      ].slice(-20)
    : [];
  const sourceBody = source
    ? source.bodyText ||
      (source.bodyHtml ? htmlToPlainText(source.bodyHtml) : source.bodyRef || "")
    : "";
  const defaultBody = source && action === "forward"
    ? `\n\n---------- Forwarded message ----------\nFrom: ${source.recipient}\nSubject: ${source.subject}\n\n${sourceBody}`
    : source
      ? `\n\nOn ${formatMarketplaceDateTime(source.receivedAt || source.createdAt)}, ${source.recipient} wrote:\n${sourceBody
          .split(/\r?\n/)
          .map((line) => `> ${line}`)
          .join("\n")}`
      : "";

  return (
    <div className="p-6">
      <CommunicationComposer
        customers={customers}
        invoices={invoiceOptions}
        templates={templates.filter((template) => template.isActive === 1)}
        initial={{
          to: defaultTo,
          cc: action === "replyAll" ? source?.cc || "" : "",
          subject: defaultSubject,
          body: defaultBody,
          customerId: source?.customerId || "",
          orderId: source?.orderId || "",
          attachInvoice: false,
          threadId: source?.threadId || source?.id || "",
          inReplyTo: source?.messageId || "",
          references: conversationReferences,
          sourceId: sourceId || "",
          mode: action,
        }}
      />
    </div>
  );
}
