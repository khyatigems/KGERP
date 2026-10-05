"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface EligibleEmail {
  id: string;
  subject: string;
  recipient: string;
  attemptCount: number;
  failureCode?: string | null;
}

export function CommunicationQueueActions({
  id,
  canRetry,
  canSendNow,
  canCancel,
}: {
  id: string;
  canRetry: boolean;
  canSendNow: boolean;
  canCancel: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function runAction(action: "RETRY" | "SEND_NOW" | "CANCEL") {
    if (action === "CANCEL" && !window.confirm("Cancel this queued email?")) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/email/communications/${encodeURIComponent(id)}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Communication action failed");
      toast.success(action === "CANCEL" ? "Email cancelled" : "Email retry started");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Communication action failed");
    } finally {
      setBusy(false);
    }
  }

  if (!canRetry && !canSendNow && !canCancel) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {canRetry && (
        <button type="button" disabled={busy} onClick={() => runAction("RETRY")} className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground transition-all hover:-translate-y-0.5 hover:brightness-110 active:scale-95 disabled:opacity-50">
          {busy && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}
          Retry
        </button>
      )}
      {canSendNow && (
        <button type="button" disabled={busy} onClick={() => runAction("SEND_NOW")} className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground transition-all hover:-translate-y-0.5 hover:brightness-110 active:scale-95 disabled:opacity-50">
          {busy && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}
          Send Now
        </button>
      )}
      {canCancel && (
        <button type="button" disabled={busy} onClick={() => runAction("CANCEL")} className="rounded-md border px-3 py-2 text-sm transition-all hover:-translate-y-0.5 hover:bg-muted active:scale-95 disabled:opacity-50">
          {busy && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}
          Cancel
        </button>
      )}
    </div>
  );
}

export function CommunicationBulkRetry({
  eligibleEmails,
  eligibleCount,
}: {
  eligibleEmails: EligibleEmail[];
  eligibleCount: number;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  async function submit(body: { ids?: string[]; allEligible?: boolean }) {
    setBusy(true);
    try {
      const response = await fetch("/api/email/communications/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Bulk retry failed");
      const count = result.queued || 0;
      if (count === 0) throw new Error("None of the selected emails remained eligible for retry");
      toast.success(`${count} eligible email${count === 1 ? "" : "s"} queued; ${result.processed || 0} processed now`);
      setSelected([]);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bulk retry failed");
    } finally {
      setBusy(false);
    }
  }

  if (!eligibleCount) return <p className="text-sm text-muted-foreground">No retryable failures need attention.</p>;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {eligibleCount} failed email{eligibleCount === 1 ? "" : "s"} can be retried. Only transient failures with remaining attempts are included.
      </p>
      {eligibleEmails.length > 0 && (
        <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border p-3">
          {eligibleEmails.map((email) => (
            <div key={email.id} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(email.id)}
                onChange={() => toggle(email.id)}
                disabled={busy}
                aria-label={`Select ${email.subject || "untitled email"} to retry`}
                className="mt-1"
              />
              <div className="min-w-0">
                <Link href={`/communication/${email.id}`} className="block truncate font-medium hover:text-primary hover:underline">
                  {email.subject || "(no subject)"}
                </Link>
                <span className="block truncate text-xs text-muted-foreground">
                  {email.recipient} · Retry {email.attemptCount + 1}/5
                </span>
              </div>
            </div>
          ))}
          {eligibleCount > eligibleEmails.length && (
            <p className="text-xs text-muted-foreground">Showing the first {eligibleEmails.length}; use Retry All Eligible to include the rest.</p>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || selected.length === 0}
          onClick={() => submit({ ids: selected })}
          className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground transition-all hover:-translate-y-0.5 hover:brightness-110 active:scale-95 disabled:opacity-50"
        >
          {busy && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}
          Retry Selected{selected.length ? ` (${selected.length})` : ""}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => submit({ allEligible: true })}
          className="rounded-md border px-3 py-2 text-sm transition-all hover:-translate-y-0.5 hover:bg-muted active:scale-95 disabled:opacity-50"
        >
          {busy && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}
          Retry All Eligible
        </button>
      </div>
    </div>
  );
}

export function QueuedEmailRecovery({
  emails,
  total,
  canManage,
}: {
  emails: Array<EligibleEmail & { nextRetryAt: string | null }>;
  total: number;
  canManage: boolean;
}) {
  if (!total) return null;
  return (
    <div className="space-y-3 border-t pt-4">
      <div>
        <h3 className="font-medium">Scheduled retries</h3>
        <p className="text-sm text-muted-foreground">
          {total} queued email{total === 1 ? "" : "s"} waiting for the next attempt.
        </p>
      </div>
      <ul className="space-y-2">
        {emails.map((email) => (
          <li key={email.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
            <div className="min-w-0">
              <Link href={`/communication/${email.id}`} className="block truncate text-sm font-medium hover:text-primary hover:underline">
                {email.subject || "(no subject)"}
              </Link>
              <p className="truncate text-xs text-muted-foreground">{email.recipient}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {email.failureCode ? `Retry ${email.attemptCount + 1}/5` : "Scheduled"}
                {email.nextRetryAt ? ` · Due: ${email.nextRetryAt}` : ""}
              </p>
            </div>
            {canManage && (
              <CommunicationQueueActions
                id={email.id}
                canRetry={false}
                canSendNow
                canCancel
              />
            )}
          </li>
        ))}
        {total > emails.length && (
          <li className="text-xs text-muted-foreground">
            Showing {emails.length} of {total}; use filters to find other queued emails.
          </li>
        )}
      </ul>
    </div>
  );
}

export function ProcessDueEmailsButton({ dueCount }: { dueCount: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function process() {
    setBusy(true);
    try {
      const response = await fetch("/api/email/communications/process-due", { method: "POST" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Queue processing failed");
      toast.success(
        result.processed
          ? `Processed ${result.processed}: ${result.sent} sent, ${result.retryScheduled} rescheduled, ${result.failed} failed`
          : "No due emails to process",
      );
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Queue processing failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <button
      type="button"
      onClick={() => void process()}
      disabled={busy || dueCount === 0}
      className="rounded-md border px-3 py-2 text-sm transition-all hover:-translate-y-0.5 hover:bg-muted active:scale-95 disabled:opacity-50"
    >
      {busy && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}
      {busy ? "Processing…" : `Process Due Emails${dueCount ? ` (${dueCount})` : ""}`}
    </button>
  );
}

export function SyncCommunicationInboxButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function syncInbox() {
    setBusy(true);
    try {
      const response = await fetch("/api/email/communications/sync-inbox", { method: "POST" });
      const result = await response.json();
      if (!response.ok || result.failed > 0) {
        throw new Error(result.error || `Inbox sync failed for ${result.failed} of ${result.found} messages`);
      }
      if (result.contentWarning) {
        toast.warning(
          `${result.processed} new · ${result.updated} updated · ${result.alreadySynced} already synced. ${result.contentWarning}`,
        );
        router.refresh();
        return;
      }
      toast.success(
        result.found === 0
          ? "Zoho returned no messages from the Inbox folder"
          : `${result.processed} new · ${result.updated} updated · ${result.alreadySynced} already synced (${result.found} found)`,
      );
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Inbox synchronization failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <button type="button" onClick={() => void syncInbox()} disabled={busy} className="rounded-md border px-3 py-2 text-sm transition-all hover:-translate-y-0.5 hover:bg-muted active:scale-95 disabled:opacity-50">
      {busy && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}
      {busy ? "Checking inbox…" : "Check Inbox Now"}
    </button>
  );
}

export function CommunicationReadButton({ id, isRead }: { id: string; isRead: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function updateReadState() {
    setBusy(true);
    try {
      const response = await fetch(`/api/email/communications/${encodeURIComponent(id)}/read`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: !isRead }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Read state could not be updated");
      toast.success(isRead ? "Communication marked unread" : "Communication marked read");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Read state could not be updated");
    } finally {
      setBusy(false);
    }
  }
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void updateReadState()}
      aria-label={isRead ? "Mark unread" : "Mark read"}
      className="rounded border px-2 py-1 text-xs text-muted-foreground transition-all hover:-translate-y-0.5 hover:text-foreground active:scale-95 disabled:opacity-50"
    >
      {busy && <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />}
      {isRead ? "Mark unread" : "Mark read"}
    </button>
  );
}

export function MarkAllReadButton({ unreadCount }: { unreadCount: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function markAllRead() {
    setBusy(true);
    try {
      const response = await fetch("/api/email/communications/read-all", { method: "POST" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Messages could not be marked read");
      toast.success(`${result.updated} communication${result.updated === 1 ? "" : "s"} marked read`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Messages could not be marked read");
    } finally {
      setBusy(false);
    }
  }
  return (
    <button
      type="button"
      disabled={busy || unreadCount === 0}
      onClick={() => void markAllRead()}
      className="rounded-md border px-3 py-2 text-sm transition-all hover:-translate-y-0.5 hover:bg-muted active:scale-95 disabled:opacity-50"
    >
      {busy && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}
      Mark All Read{unreadCount ? ` (${unreadCount})` : ""}
    </button>
  );
}
