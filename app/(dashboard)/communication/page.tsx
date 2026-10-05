import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AnimatedPage } from "@/components/ui/animated-page";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { auth } from "@/lib/auth";
import { CommunicationBulkRetry, CommunicationReadButton, MarkAllReadButton, ProcessDueEmailsButton, QueuedEmailRecovery, SyncCommunicationInboxButton } from "@/components/communication/communication-queue-controls";
import { getCommunicationCenter } from "@/lib/email/communication-center";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { formatMarketplaceDateTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Communication Center",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | undefined>;

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  SENT: "default",
  DELIVERED: "default",
  OPENED: "default",
  RECEIVED: "default",
  QUEUED: "secondary",
  PROCESSING: "secondary",
  DRAFT: "secondary",
  FAILED: "destructive",
  BOUNCED: "destructive",
  CANCELLED: "outline",
  COMPLETED: "default",
  OPEN: "secondary",
  RESCHEDULED: "outline",
  LAUNCHED: "secondary",
};

function createHref(filters: SearchParams, overrides: SearchParams = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...filters, ...overrides })) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `/communication?${query}` : "/communication";
}

export default async function CommunicationCenterPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await checkUserPermission(session.user.id, PERMISSIONS.COMMUNICATION_VIEW))) redirect("/");
  const canManage = await checkUserPermission(session.user.id, PERMISSIONS.COMMUNICATION_MANAGE);

  const rawFilters = await searchParams;
  const result = await getCommunicationCenter(rawFilters).catch((error: unknown) => {
    console.error("[communication-center] Failed to load communications:", error);
    return null;
  });

  if (!result) {
    return (
      <AnimatedPage>
        <div className="space-y-6 p-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Communication Center</h1>
            <p className="text-sm text-muted-foreground">Review inbound and outbound customer communications.</p>
          </div>
          <Card>
            <CardContent className="py-10 text-center">
              <p className="font-medium">Unable to load communications.</p>
              <p className="mt-1 text-sm text-muted-foreground">The communication data could not be retrieved. Please try again.</p>
              <Link href="/communication" className="mt-4 inline-block text-sm text-primary hover:underline">
                Retry
              </Link>
            </CardContent>
          </Card>
        </div>
      </AnimatedPage>
    );
  }

  const { rows, filters, options, pagination, stats, health } = result;
  const directionTabs = [
    { label: "All", value: "" },
    { label: "Inbound", value: "INBOUND" },
    { label: "Outbound", value: "OUTBOUND" },
  ];
  const kpis = [
    { label: "Total Communications", value: stats.total },
    { label: "Sent Today", value: stats.sentToday },
    { label: "Queued", value: stats.queued },
    { label: "Failed", value: stats.failed },
    { label: "Bounced", value: stats.bounced },
    { label: "Inbound", value: stats.inbound },
    {
      label: "Awaiting Reply",
      value: stats.awaitingReply,
      description: "Customers whose latest recorded email is outbound and sent, delivered, or opened.",
    },
    { label: "WhatsApp Launches", value: stats.whatsapp },
    { label: "Follow-ups", value: stats.followUps },
  ];
  const paginationFilters: SearchParams = {
    ...(filters.channel ? { channel: filters.channel } : {}),
    ...(filters.direction ? { direction: filters.direction } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.emailType ? { emailType: filters.emailType } : {}),
    ...(filters.customerId ? { customerId: filters.customerId } : {}),
    ...(filters.provider ? { provider: filters.provider } : {}),
    ...(filters.from ? { from: filters.from } : {}),
    ...(filters.to ? { to: filters.to } : {}),
    ...(filters.q ? { q: filters.q } : {}),
    ...(filters.read ? { read: filters.read } : {}),
  };

  return (
    <AnimatedPage>
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
          <h1 className="text-3xl font-bold tracking-tight">Communication Center</h1>
          <p className="text-sm text-muted-foreground">
            Inbound replies and outbound invoice/certificate emails. Inbox synchronization remains available from Email Templates.
          </p>
          <p className="mt-1 text-sm font-medium text-primary">Inbox {stats.unread}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canManage && <Link href="/communication/compose" className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground transition-all hover:-translate-y-0.5 hover:brightness-110 active:scale-95">Compose Email</Link>}
            <Link href="/communication/analytics" className="rounded-md border px-3 py-2 text-sm transition-all hover:-translate-y-0.5 hover:bg-muted active:scale-95">Analytics & Health</Link>
            {canManage && <SyncCommunicationInboxButton />}
            <MarkAllReadButton unreadCount={stats.unread} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
          {kpis.map((kpi) => (
            <Card key={kpi.label}>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground" title={kpi.description}>{kpi.label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{kpi.value.toLocaleString()}</p>
                {kpi.description && <p className="mt-1 text-xs text-muted-foreground">{kpi.description}</p>}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Communication health</p>
              <Badge
                className="mt-1"
                variant={health.level === "HEALTHY" ? "default" : health.level === "CRITICAL" ? "destructive" : "secondary"}
              >
                {health.label}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <span>Queue: <strong>{stats.queued}</strong></span>
              <span>Failed: <strong>{stats.failed}</strong></span>
              <span>Provider credentials: <strong>{health.providerConfigured ? "Configured" : "Missing"}</strong></span>
              <span>
                Inbox sync: <strong>{health.inboxSyncAt ? formatMarketplaceDateTime(health.inboxSyncAt) : "Never recorded"}</strong>
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Communication channel" className="flex items-center gap-1 rounded-lg border p-1">
            {[
              { label: "All channels", value: "" },
              { label: "Email", value: "EMAIL" },
              { label: "WhatsApp", value: "WHATSAPP" },
              { label: "Follow-ups", value: "FOLLOW_UP" },
            ].map((tab) => (
              <Link
                key={tab.value}
                href={createHref(paginationFilters, { channel: tab.value, page: "" })}
                aria-current={filters.channel === tab.value ? "page" : undefined}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  filters.channel === tab.value ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
          <nav aria-label="Communication direction" className="flex items-center gap-1 rounded-lg border p-1">
            {directionTabs.map((tab) => (
              <Link
                key={tab.value}
                href={createHref(paginationFilters, { direction: tab.value, page: "" })}
                aria-current={filters.direction === tab.value ? "page" : undefined}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  filters.direction === tab.value ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
          <p className="text-sm text-muted-foreground">
            {pagination.total.toLocaleString()} communication{pagination.total === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "All", value: "" },
            { label: `Unread (${stats.unread})`, value: "unread" },
            { label: "Read", value: "read" },
          ].map((option) => (
            <Link
              key={option.value}
              href={createHref(paginationFilters, { read: option.value, page: "" })}
              aria-current={filters.read === option.value ? "page" : undefined}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                filters.read === option.value ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"
              }`}
            >
              {option.label}
            </Link>
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle>Needs Attention</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <p><span className="font-semibold text-destructive">{stats.retryableFailed}</span> retryable failed</p>
              <p><span className="font-semibold">{stats.retryScheduled}</span> retries scheduled</p>
              <p><span className="font-semibold">{stats.scheduled}</span> scheduled emails</p>
              <p><span className="font-semibold">{stats.unread}</span> unread</p>
            </div>
            {canManage && <ProcessDueEmailsButton dueCount={stats.dueNow} />}
            {canManage ? (
              <CommunicationBulkRetry eligibleEmails={result.eligibleEmails} eligibleCount={stats.retryableFailed} />
            ) : (
              <p className="text-sm text-muted-foreground">A user with communication management access can retry eligible failures.</p>
            )}
            <QueuedEmailRecovery
              emails={result.queuedEmails}
              total={stats.retryScheduled}
              canManage={canManage}
            />
          </CardContent>
        </Card>

        <form action="/communication" method="GET" className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
          {filters.direction && <input type="hidden" name="direction" value={filters.direction} />}
          {filters.read && <input type="hidden" name="read" value={filters.read} />}
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Channel</span>
            <select name="channel" defaultValue={filters.channel} className="w-full rounded-md border bg-background px-3 py-2">
              <option value="">All channels</option>
              {options.channels.map((channel) => <option key={channel} value={channel}>{channel.replaceAll("_", " ")}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Search</span>
            <input
              type="search"
              name="q"
              defaultValue={filters.q}
              placeholder="Subject, recipient, customer, invoice…"
              className="w-full rounded-md border bg-background px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Status</span>
            <select name="status" defaultValue={filters.status} className="w-full rounded-md border bg-background px-3 py-2">
              <option value="">All statuses</option>
              {options.statuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Type / Follow-up Channel</span>
            <select name="emailType" defaultValue={filters.emailType} className="w-full rounded-md border bg-background px-3 py-2">
              <option value="">All types</option>
              {options.emailTypes.map((emailType) => <option key={emailType} value={emailType}>{emailType}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Customer</span>
            <select name="customerId" defaultValue={filters.customerId} className="w-full rounded-md border bg-background px-3 py-2">
              <option value="">All customers</option>
              {options.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Provider</span>
            <select name="provider" defaultValue={filters.provider} className="w-full rounded-md border bg-background px-3 py-2">
              <option value="">All providers</option>
              {options.providers.map((provider) => <option key={provider} value={provider}>{provider}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">From</span>
            <input type="date" name="from" defaultValue={filters.from} className="w-full rounded-md border bg-background px-3 py-2" />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">To</span>
            <input type="date" name="to" defaultValue={filters.to} className="w-full rounded-md border bg-background px-3 py-2" />
          </label>
          <div className="flex items-end gap-2">
            <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:-translate-y-0.5 hover:brightness-110 active:scale-95">
              Apply filters
            </button>
            <Link href="/communication" className="rounded-md border px-4 py-2 text-sm transition-all hover:-translate-y-0.5 hover:bg-muted active:scale-95">
              Clear
            </Link>
          </div>
        </form>

        {rows.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="font-medium">No communications found</p>
              <p className="mt-1 text-sm text-muted-foreground">Try changing or clearing the selected filters.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Direction</TableHead>
                  <TableHead>Communication</TableHead>
                  <TableHead>Customer / Invoice</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead className="text-right">Date / Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const isInbound = row.direction === "INBOUND";
                  return (
                    <TableRow key={row.id} className={!row.isRead ? "bg-primary/[0.04]" : undefined}>
                      <TableCell>
                        <Badge variant={isInbound ? "default" : "secondary"}>
                          {isInbound ? "↓ Inbound" : "↑ Outbound"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[28rem]">
                            <Link href={`/communication/${row.id}`} className={`block truncate hover:text-primary hover:underline ${row.isRead ? "font-medium" : "font-semibold"}`}>
                              {row.subject || "(no subject)"}
                            </Link>
                            {row.threadCount > 1 && row.threadId && (
                              <Link href={`/communication/${row.id}`} className="mt-1 inline-block text-xs text-primary hover:underline">
                                Conversation · {row.threadCount} messages
                              </Link>
                            )}
                            <p className="truncate text-sm text-muted-foreground">
                              {isInbound ? "From" : "To"}: {row.recipient || "—"}
                            </p>
                        {row.emailType && <p className="mt-1 text-xs text-muted-foreground">{row.emailType}</p>}
                        {row.bodyRef && !row.bodyRef.startsWith("template:") && row.bodyRef !== "inline" && (
                          <p className="mt-1 truncate text-xs text-muted-foreground">{row.bodyRef}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.customerName ? (
                          <Link href={`/customers/${row.customerId}`} className="block text-primary hover:underline">
                            {row.customerName}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                        {row.invoiceNumber && (
                          <Link href={`/invoices/${row.orderId}`} className="mt-1 block text-sm text-primary hover:underline">
                            Invoice #{row.invoiceNumber}
                          </Link>
                        )}
                      </TableCell>
                      <TableCell>
                            <Badge variant={STATUS_VARIANT[row.status || ""] || "outline"}>{row.status || "—"}</Badge>
                        {row.status === "QUEUED" && row.nextRetryAt && row.failureCode && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Retry {Math.min(row.attemptCount + 1, 5)}/5 · {formatMarketplaceDateTime(row.nextRetryAt)}
                          </p>
                        )}
                        {row.status === "QUEUED" && row.nextRetryAt && !row.failureCode && (
                          <p className="mt-1 text-xs text-muted-foreground">Scheduled · {formatMarketplaceDateTime(row.nextRetryAt)}</p>
                        )}
                        {row.status === "FAILED" && row.lastError && (
                          <p title={row.lastError} className="mt-1 max-w-40 truncate text-xs text-destructive">{row.failureCode || row.lastError}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.sourceType === "EMAIL"
                          ? row.provider || "Email"
                          : row.sourceType === "WHATSAPP"
                            ? "WhatsApp Web · manual"
                            : `Follow-up · ${row.followUpAction || "CALL"}`}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right text-sm text-muted-foreground">
                        {formatMarketplaceDateTime(row.createdAt)}
                        <div className="mt-1 flex justify-end">
                          {row.sourceType === "EMAIL" && <CommunicationReadButton id={row.id} isRead={row.isRead} />}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              {pagination.page > 1 ? (
                <Link href={createHref(paginationFilters, { page: String(pagination.page - 1) })} className="rounded-md border px-3 py-2 text-sm transition-all hover:-translate-y-0.5 hover:bg-muted active:scale-95">
                  Previous
                </Link>
              ) : (
                <span className="rounded-md border px-3 py-2 text-sm text-muted-foreground">Previous</span>
              )}
              {pagination.page < pagination.totalPages ? (
                <Link href={createHref(paginationFilters, { page: String(pagination.page + 1) })} className="rounded-md border px-3 py-2 text-sm transition-all hover:-translate-y-0.5 hover:bg-muted active:scale-95">
                  Next
                </Link>
              ) : (
                <span className="rounded-md border px-3 py-2 text-sm text-muted-foreground">Next</span>
              )}
            </div>
          </div>
        )}
      </div>
    </AnimatedPage>
  );
}
