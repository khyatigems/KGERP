"use client";
import { useState, type FormEvent } from "react";
export type Followup = {
  id: string;
  owner?: string | null;
  notes?: string | null;
  nextContact?: string | null;
  followupRevision?: number;
};
export function EnquiryFollowup({
  enquiry,
  save,
}: {
  enquiry: Followup;
  save: (payload: unknown) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await save({
        owner: String(data.get("owner") || ""),
        notes: String(data.get("notes") || ""),
        nextContact: String(data.get("nextContact") || ""),
        revision: Number(enquiry.followupRevision || 0),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save follow-up");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className="grid gap-3 rounded border p-3"
      key={enquiry.followupRevision || 0}
    >
      <h4 className="font-semibold">Lead follow-up</h4>
      <label className="grid gap-1 text-sm">
        Assigned to
        <input
          name="owner"
          className="rounded border bg-background p-2"
          maxLength={120}
          defaultValue={enquiry.owner || ""}
        />
      </label>
      <label className="grid gap-1 text-sm">
        Next contact date
        <input
          name="nextContact"
          type="date"
          className="rounded border bg-background p-2"
          defaultValue={enquiry.nextContact || ""}
        />
      </label>
      <label className="grid gap-1 text-sm">
        Internal follow-up notes
        <textarea
          name="notes"
          className="rounded border bg-background p-2"
          rows={3}
          maxLength={6000}
          defaultValue={enquiry.notes || ""}
        />
      </label>
      <button className="rounded border px-4 py-2 text-sm" disabled={busy}>
        {busy ? "Saving…" : "Save follow-up"}
      </button>
      <p role="status" className="text-sm">
        {error}
      </p>
    </form>
  );
}
