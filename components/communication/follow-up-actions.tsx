"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function FollowUpActions({
  id,
  canManage,
}: {
  id: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [note, setNote] = useState("");

  async function run(action: "COMPLETE" | "CANCEL" | "RESCHEDULE" | "ADD_NOTE") {
    if (action === "CANCEL" && !window.confirm("Cancel this follow-up?")) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/followups/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ...(action === "RESCHEDULE" ? { scheduledAt: new Date(scheduledAt).toISOString() } : {}),
          ...(action === "ADD_NOTE" || action === "RESCHEDULE" ? { note } : {}),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Follow-up action failed");
      toast.success(action === "COMPLETE" ? "Follow-up completed" : action === "CANCEL" ? "Follow-up cancelled" : action === "RESCHEDULE" ? "Follow-up rescheduled" : "Note added");
      setNote("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Follow-up action failed");
    } finally {
      setBusy(false);
    }
  }

  if (!canManage) return null;
  return (
    <section className="space-y-3 rounded-md border p-4">
      <h2 className="font-medium">Follow-up actions</h2>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => run("COMPLETE")} className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground transition-all hover:-translate-y-0.5 hover:brightness-110 active:scale-95 disabled:opacity-50">
          {busy && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}
          Complete
        </button>
        <button type="button" disabled={busy} onClick={() => run("CANCEL")} className="rounded-md border px-3 py-2 text-sm transition-all hover:-translate-y-0.5 hover:bg-muted active:scale-95 disabled:opacity-50">
          {busy && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}
          Cancel
        </button>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="space-y-1 text-sm">
          <span className="block text-muted-foreground">Reschedule</span>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(event) => setScheduledAt(event.target.value)}
            className="rounded-md border bg-background px-3 py-2"
          />
        </label>
        <button type="button" disabled={busy || !scheduledAt} onClick={() => run("RESCHEDULE")} className="rounded-md border px-3 py-2 text-sm transition-all hover:-translate-y-0.5 hover:bg-muted active:scale-95 disabled:opacity-50">
          {busy && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}
          Reschedule
        </button>
      </div>
      <div className="space-y-2">
        <label htmlFor={`followup-note-${id}`} className="text-sm text-muted-foreground">Add a note</label>
        <textarea
          id={`followup-note-${id}`}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={5000}
          rows={3}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
        <button type="button" disabled={busy || !note.trim()} onClick={() => run("ADD_NOTE")} className="rounded-md border px-3 py-2 text-sm transition-all hover:-translate-y-0.5 hover:bg-muted active:scale-95 disabled:opacity-50">
          {busy && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}
          Add Note
        </button>
      </div>
    </section>
  );
}
