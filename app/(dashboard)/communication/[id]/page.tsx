import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CommunicationQueueActions } from "@/components/communication/communication-queue-controls";
import { CommunicationReadButton } from "@/components/communication/communication-queue-controls";
import { FollowUpActions } from "@/components/communication/follow-up-actions";
import { auth } from "@/lib/auth";
import { getCommunicationDetail } from "@/lib/email/email-log";
import { isRetryableEmailFailure, MAX_EMAIL_ATTEMPTS } from "@/lib/email/queue";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { formatMarketplaceDateTime } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { getUnifiedCommunicationDetail } from "@/lib/email/unified-communications";
import { htmlToPlainText } from "@/lib/email/content";

export const metadata: Metadata = {
  title: "Communication Details",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface StoredAttachment {
  fileName: string;
  mimeType: string;
  sourceType?: "INVOICE" | "INVENTORY";
  sourceId?: string;
}

interface Attempt {
  attempt: number;
  at: string;
  status: string;
  failureCode?: string;
  error?: string;
  providerMessageId?: string;
  triggeredBy?: string;
}

function parseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error("[communication-detail] Could not parse stored communication JSON:", error);
    return null;
  }
}

function MetadataValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm">{children || "—"}</dd>
    </div>
  );
}

export default async function CommunicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await checkUserPermission(session.user.id, PERMISSIONS.COMMUNICATION_VIEW))) redirect("/");
  const { id } = await params;
  const isUnifiedRecord = id.startsWith("whatsapp:") || id.startsWith("followup:");
  const communication = isUnifiedRecord ? null : await getCommunicationDetail(id);
  if (!isUnifiedRecord && !communication) notFound();
  if (communication && !communication.isRead) {
    await prisma.emailLog.updateMany({
      where: { id: communication.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  const canManage = await checkUserPermission(session.user.id, PERMISSIONS.COMMUNICATION_MANAGE);
  if (isUnifiedRecord) {
    const record = await getUnifiedCommunicationDetail(id);
    if (!record) notFound();
    const canManageFollowUps =
      record.sourceType === "FOLLOW_UP" &&
      await checkUserPermission(session.user.id, PERMISSIONS.RECEIVABLES_MANAGE);
    const canActOnFollowUp = canManageFollowUps && record.status === "OPEN";
    const customer = record.customerId && record.customerName
      ? <Link href={`/customers/${record.customerId}`} className="text-primary hover:underline">{record.customerName}</Link>
      : "—";
    const invoice = record.invoiceId && record.invoiceNumber
      ? <Link href={`/invoices/${record.invoiceId}`} className="text-primary hover:underline">#{record.invoiceNumber}</Link>
      : "—";
    const whatsAppLink = record.sourceType === "WHATSAPP" && record.phone
      ? `https://wa.me/${record.phone.replace(/\D/g, "")}?text=${encodeURIComponent(record.message || "")}`
      : null;
    return (
      <div className="space-y-6 p-6">
        <Link href="/communication" className="text-sm text-primary hover:underline">← Communication Center</Link>
        <div>
          <p className="text-sm text-muted-foreground">{record.sourceType === "WHATSAPP" ? "WhatsApp handoff" : `${record.channel} follow-up`}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{record.subject || "(untitled communication)"}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="outline">{record.sourceType === "WHATSAPP" ? "WhatsApp Web · manual" : `Follow-up · ${record.channel}`}</Badge>
            <Badge variant={record.status === "COMPLETED" || record.status === "LAUNCHED" ? "default" : record.status === "CANCELLED" ? "secondary" : "outline"}>
              {record.status}
            </Badge>
          </div>
        </div>
        <Card>
          <CardHeader><CardTitle>Communication Details</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              <MetadataValue label="Customer">{customer}</MetadataValue>
              <MetadataValue label="Invoice">{invoice}</MetadataValue>
              <MetadataValue label="Channel">{record.sourceType === "WHATSAPP" ? "WhatsApp" : record.channel}</MetadataValue>
              <MetadataValue label="Created At">{formatMarketplaceDateTime(record.createdAt)}</MetadataValue>
              <MetadataValue label="Created By">{("createdByName" in record && record.createdByName) || (record.launchedById ? "Staff member" : null)}</MetadataValue>
              <MetadataValue label={record.sourceType === "WHATSAPP" ? "WhatsApp number" : "Next promised date"}>
                {record.sourceType === "WHATSAPP" ? record.phone : ("promisedDate" in record && record.promisedDate ? formatMarketplaceDateTime(record.promisedDate) : null)}
              </MetadataValue>
              {"rescheduledTo" in record && record.rescheduledTo && (
                <MetadataValue label="Rescheduled To">{formatMarketplaceDateTime(record.rescheduledTo)}</MetadataValue>
              )}
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{record.sourceType === "WHATSAPP" ? "Prepared Message" : "Follow-up Note"}</CardTitle></CardHeader>
          <CardContent>
            {record.message ? (
              <pre className="whitespace-pre-wrap break-words rounded-md bg-muted p-4 text-sm">{record.message}</pre>
            ) : (
              <p className="text-sm text-muted-foreground">No message or note was recorded.</p>
            )}
            {whatsAppLink && (
              <a href={whatsAppLink} target="_blank" rel="noreferrer" className="mt-4 inline-block rounded-md border px-3 py-2 text-sm hover:bg-muted">
                Open WhatsApp (manual send)
              </a>
            )}
            {record.sourceType === "WHATSAPP" && (
              <p className="mt-3 text-xs text-muted-foreground">
                Opening WhatsApp does not confirm that a message was sent, delivered, or read. Status reflects only the recorded manual handoff.
              </p>
            )}
          </CardContent>
        </Card>
        {record.sourceType === "FOLLOW_UP" && <FollowUpActions id={record.sourceId} canManage={Boolean(canActOnFollowUp)} />}
      </div>
    );
  }
  if (!communication) notFound();
  const retryable = isRetryableEmailFailure(communication.failureCode, communication.attemptCount);
  const canRetry = canManage && communication.status === "FAILED" && retryable;
  const canSendNow =
    canManage &&
    communication.status === "QUEUED" &&
    Boolean(communication.nextRetryAt) &&
    (communication.attemptCount === 0 || retryable);
  const canCancel =
    canManage &&
    (communication.status === "DRAFT" ||
      (communication.status === "QUEUED" && Boolean(communication.nextRetryAt)));
  const attachments = parseJson<StoredAttachment[]>(communication.attachmentsJson) || [];
  const storedPayload = parseJson<{
    attachments?: Array<{ fileName: string; contentBase64: string }>;
  }>(communication.payloadJson);
  const attempts = parseJson<Attempt[]>(communication.retryHistoryJson) || [];
  const plainText =
    communication.bodyText ||
    (communication.bodyRef && !communication.bodyHtml && communication.bodyRef !== "inline" && !communication.bodyRef.startsWith("template:")
      ? communication.bodyRef
      : communication.bodyHtml ? htmlToPlainText(communication.bodyHtml) : null);
  const htmlBody = communication.bodyHtml;
  const safeSender =
    process.env.ZOHO_MAIL_FROM ||
    process.env.EMAIL_FROM ||
    process.env.RESEND_FROM ||
    (communication.direction === "INBOUND" ? "KhyatiGems inbox" : "Configured email provider");
  const customerLink = communication.customer
    ? <Link href={`/customers/${communication.customer.id}`} className="text-primary hover:underline">{communication.customer.name}</Link>
    : "—";
  const invoiceLink = communication.invoice
    ? <Link href={`/invoices/${communication.invoice.id}`} className="text-primary hover:underline">#{communication.invoice.invoiceNumber}</Link>
    : "—";
  const statusVariant = ["FAILED", "BOUNCED"].includes(communication.status)
    ? "destructive"
    : ["QUEUED", "PROCESSING", "DRAFT"].includes(communication.status)
      ? "secondary"
      : "default";

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Link href="/communication" className="text-sm text-primary hover:underline">← Communication Center</Link>
          <h1 className="text-3xl font-bold tracking-tight">{communication.subject || "(no subject)"}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={communication.direction === "INBOUND" ? "default" : "secondary"}>
              {communication.direction === "INBOUND" ? "Inbound" : "Outbound"}
            </Badge>
            <Badge variant={statusVariant}>{communication.status}</Badge>
            {communication.emailType && <Badge variant="outline">{communication.emailType}</Badge>}
            {communication.status === "QUEUED" && communication.nextRetryAt && retryable && communication.attemptCount > 0 && (
              <Badge variant="outline">Retry {Math.min(communication.attemptCount + 1, MAX_EMAIL_ATTEMPTS)}/{MAX_EMAIL_ATTEMPTS}</Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/communication/compose?reply=${communication.id}&mode=reply`} className="rounded-md border px-3 py-2 text-sm transition-all hover:-translate-y-0.5 hover:bg-muted active:scale-95">Reply</Link>
            <Link href={`/communication/compose?reply=${communication.id}&mode=replyAll`} className="rounded-md border px-3 py-2 text-sm transition-all hover:-translate-y-0.5 hover:bg-muted active:scale-95">Reply All</Link>
            <Link href={`/communication/compose?reply=${communication.id}&mode=forward`} className="rounded-md border px-3 py-2 text-sm transition-all hover:-translate-y-0.5 hover:bg-muted active:scale-95">Forward</Link>
            <CommunicationReadButton id={communication.id} isRead />
          </div>
        </div>
        <CommunicationQueueActions
          id={communication.id}
          canRetry={canRetry}
          canSendNow={canSendNow}
          canCancel={canCancel}
        />
      </div>

      <Card>
        <CardHeader><CardTitle>Message Details</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            <MetadataValue label="From">{communication.direction === "INBOUND" ? communication.recipient : safeSender}</MetadataValue>
            <MetadataValue label="To">{communication.direction === "INBOUND" ? safeSender : communication.recipient}</MetadataValue>
            <MetadataValue label="CC">{communication.cc}</MetadataValue>
            <MetadataValue label="BCC">{communication.bcc}</MetadataValue>
            <MetadataValue label="Customer">{customerLink}</MetadataValue>
            <MetadataValue label="Invoice">{invoiceLink}</MetadataValue>
            <MetadataValue label="Email Type">{communication.emailType}</MetadataValue>
            <MetadataValue label="Direction">{communication.direction}</MetadataValue>
            <MetadataValue label="Provider">{communication.provider}</MetadataValue>
            <MetadataValue label="Provider Message ID">{communication.providerMessageId}</MetadataValue>
            <MetadataValue label="Created At">{formatMarketplaceDateTime(communication.createdAt)}</MetadataValue>
            <MetadataValue label="Received At">{communication.receivedAt ? formatMarketplaceDateTime(communication.receivedAt) : "Not supplied by provider"}</MetadataValue>
            <MetadataValue label="Queued At">{communication.queuedAt ? formatMarketplaceDateTime(communication.queuedAt) : null}</MetadataValue>
            <MetadataValue label="Last Attempt">{communication.lastAttemptAt ? formatMarketplaceDateTime(communication.lastAttemptAt) : null}</MetadataValue>
            <MetadataValue label="Next Retry">{communication.nextRetryAt ? formatMarketplaceDateTime(communication.nextRetryAt) : null}</MetadataValue>
            <MetadataValue label="Sent At">{communication.sentAt ? formatMarketplaceDateTime(communication.sentAt) : null}</MetadataValue>
            <MetadataValue label="Delivered At">{communication.deliveredAt ? formatMarketplaceDateTime(communication.deliveredAt) : null}</MetadataValue>
            <MetadataValue label="Opened At">
              {communication.openedAt
                ? formatMarketplaceDateTime(communication.openedAt)
                : communication.provider === "resend"
                  ? "Not reported yet"
                  : "Not available from this provider"}
            </MetadataValue>
            <MetadataValue label="Bounced At">{communication.bouncedAt ? formatMarketplaceDateTime(communication.bouncedAt) : null}</MetadataValue>
            <MetadataValue label="Failed At">{communication.failedAt ? formatMarketplaceDateTime(communication.failedAt) : null}</MetadataValue>
            <MetadataValue label="Attempt Count">{`${communication.attemptCount}/${MAX_EMAIL_ATTEMPTS}`}</MetadataValue>
            <MetadataValue label="Failure Code">{communication.failureCode}</MetadataValue>
          </dl>
        </CardContent>
      </Card>

      {communication.conversation.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Conversation · {communication.conversation.length} messages</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {communication.conversation.map((message) => (
                <li key={message.id} className={`rounded-md border p-4 ${message.id === communication.id ? "border-primary/50 bg-primary/[0.03]" : ""}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{message.direction === "INBOUND" ? "Customer reply" : "Sent by KhyatiGems"}</p>
                      <p className="text-sm text-muted-foreground">
                        {message.direction === "INBOUND" ? "From: " : "To: "}{message.recipient}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatMarketplaceDateTime(message.createdAt)}</p>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm">
                    {message.bodyText || (message.bodyRef && message.bodyRef !== "inline" && !message.bodyRef.startsWith("template:") ? message.bodyRef : "Message body unavailable")}
                  </p>
                  {message.id !== communication.id && (
                    <Link href={`/communication/${message.id}`} className="mt-3 inline-block text-sm text-primary hover:underline">Open message details</Link>
                  )}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {(communication.lastError || communication.errorMessage) && (
        <Card>
          <CardHeader><CardTitle className="text-destructive">Delivery Error</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {communication.failureCode && <p className="text-sm font-medium">{communication.failureCode}</p>}
            <pre className="whitespace-pre-wrap break-words rounded-md bg-muted p-3 text-sm">
              {communication.lastError || communication.errorMessage}
            </pre>
          </CardContent>
        </Card>
      )}

      {communication.providerEvents.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Provider Events</CardTitle></CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {communication.providerEvents.map((event) => (
                <li key={event.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{event.eventType}</p>
                    <p className="text-xs text-muted-foreground">{formatMarketplaceDateTime(event.occurredAt)}</p>
                  </div>
                  <p className="mt-1 break-all text-xs text-muted-foreground">Provider event ID: {event.eventId}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Operation Audit</CardTitle></CardHeader>
        <CardContent>
          {communication.auditEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No operator actions have been recorded for this communication.</p>
          ) : (
            <ol className="space-y-3">
              {communication.auditEvents.map((event) => (
                <li key={event.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{event.action || event.actionType || "Communication action"}</p>
                    <p className="text-xs text-muted-foreground">{formatMarketplaceDateTime(event.createdAt)}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {event.userName || event.userEmail || "Unknown operator"}
                  </p>
                  {event.fieldChanges && (
                    <pre className="mt-2 whitespace-pre-wrap break-all text-xs text-muted-foreground">
                      {event.fieldChanges}
                    </pre>
                  )}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      {htmlBody && (
        <Card>
          <CardHeader><CardTitle>Rendered Email</CardTitle></CardHeader>
          <CardContent>
            <iframe
              title="Rendered email content"
              sandbox=""
              referrerPolicy="no-referrer"
              src={`/api/email/communications/${encodeURIComponent(communication.id)}/preview`}
              className="h-[min(70vh,800px)] w-full rounded-md border bg-white"
            />
          </CardContent>
        </Card>
      )}

      {plainText && (
        <Card>
          <CardHeader><CardTitle>Plain-text Version</CardTitle></CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap break-words rounded-md bg-muted p-4 text-sm">{plainText}</pre>
          </CardContent>
        </Card>
      )}
      {!plainText && !htmlBody && (
        <Card>
          <CardHeader><CardTitle>Email Content</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              The provider did not return a message body for this email. Run Check Inbox Now again to retrieve any content Zoho exposes.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Attachments</CardTitle></CardHeader>
        <CardContent>
          {attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attachments.</p>
          ) : (
            <ul className="space-y-2">
              {attachments.map((attachment, index) => {
                const attachmentPayload = storedPayload?.attachments?.[index];
                const attachmentContent = attachmentPayload?.contentBase64;
                const available = Boolean(attachmentContent);
                const byteLength = attachmentContent
                  ? Buffer.from(attachmentContent, "base64").byteLength
                  : null;
                const previewable =
                  attachment.mimeType === "application/pdf" ||
                  /^image\/(?:png|jpe?g|gif|webp)$/.test(attachment.mimeType);
                const attachmentUrl = `/api/email/communications/${encodeURIComponent(communication.id)}/attachments/${index}`;
                return (
                  <li key={`${attachment.fileName}-${index}`} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{attachment.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {attachment.mimeType}{byteLength !== null ? ` · ${(byteLength / 1024).toFixed(1)} KB` : ""}
                      </p>
                      {attachment.sourceType === "INVOICE" && attachment.sourceId && (
                        <Link href={`/invoices/${attachment.sourceId}`} className="text-xs text-primary hover:underline">
                          Related invoice
                        </Link>
                      )}
                      {attachment.sourceType === "INVENTORY" && attachment.sourceId && (
                        <Link href={`/inventory/${attachment.sourceId}`} className="text-xs text-primary hover:underline">
                          Related inventory item
                        </Link>
                      )}
                    </div>
                    {available ? (
                      <div className="flex items-center gap-3">
                        {previewable && (
                          <a href={`${attachmentUrl}?inline=1`} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
                            Preview
                          </a>
                        )}
                        <a href={attachmentUrl} className="text-sm text-primary hover:underline">Download</a>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">File content unavailable</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Retry History</CardTitle></CardHeader>
        <CardContent>
          {attempts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No delivery attempts recorded.</p>
          ) : (
            <ol className="space-y-3">
              {attempts.map((attempt, index) => (
                <li key={`${attempt.at}-${index}`} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">Attempt {attempt.attempt} · {attempt.status}</p>
                    <p className="text-xs text-muted-foreground">{formatMarketplaceDateTime(attempt.at)}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {attempt.triggeredBy?.replaceAll("_", " ")}
                    {attempt.failureCode ? ` · ${attempt.failureCode}` : ""}
                    {attempt.providerMessageId ? ` · Provider ID: ${attempt.providerMessageId}` : ""}
                  </p>
                  {attempt.error && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-destructive">{attempt.error}</p>}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
