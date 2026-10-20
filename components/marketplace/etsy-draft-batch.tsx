"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { runEtsyDraftBatch } from "@/lib/marketplace/etsy-draft-batch";
import { toast } from "@/lib/erp-feedback";

export type QueuedEtsyDraft = { key: string; sku: string; title: string; shop: string; prices: string; request: Record<string, unknown>; result?: string; saved?: boolean; failed?: boolean };

export function EtsyDraftBatch({ items, onChange, onRunning, blocked }: { blocked: boolean; items: QueuedEtsyDraft[]; onChange: React.Dispatch<React.SetStateAction<QueuedEtsyDraft[]>>; onRunning: (running: boolean) => void }) {
  const [running, setRunning] = useState(false);
  const [count, setCount] = useState("5");
  const stop = useRef(false);
  const router = useRouter();
  if (!items.length) return null;
  return <div className="space-y-3 rounded-lg border p-4">
    <h3 className="font-semibold">Bulk Etsy draft saving</h3>
    <p className="text-sm">Review each item in the Etsy form and add it to this batch. Each keeps its own shop, prices, attributes and photos. The queue follows you between Create Listings and Drafts in this browser tab. Keep the page open while a batch is running.</p>
    {items.map((entry) => <div key={entry.key} className="flex justify-between gap-2 rounded border p-2 text-sm">
      <span>{entry.sku} · {entry.title} · {entry.shop} · {entry.prices}<span className="block text-xs">{entry.result || "Reviewed and queued"}</span></span>
      <Button type="button" size="sm" variant="ghost" disabled={running} onClick={() => onChange((previous) => previous.filter((item) => item.key !== entry.key))}>Remove</Button>
    </div>)}
    <label className="block text-sm">Drafts to save this run (1–25)<Input type="number" min="1" max="25" value={count} disabled={running} onChange={(event) => setCount(event.target.value)} /></label>
    <Button type="button" disabled={blocked || running || !items.some((entry) => !entry.saved && !entry.failed)} onClick={async () => {
      const limit = Number(count);
      if (!Number.isInteger(limit) || limit < 1 || limit > 25) { toast.error("Choose a batch size from 1 to 25."); return; }
      const batch = items.filter((entry) => !entry.saved && !entry.failed).slice(0, limit);
      setRunning(true); onRunning(true); stop.current = false;
      try {
        await runEtsyDraftBatch(batch, limit, async (entry) => {
          onChange((previous) => previous.map((item) => item.key === entry.key ? { ...item, result: "Saving…" } : item));
            const response = await fetch("/api/marketplace/listing-preparation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(entry.request) });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.error || "Draft save failed.");
            onChange((previous) => previous.map((item) => item.key === entry.key ? { ...item, saved: true, result: `Saved Etsy draft ${payload.externalListingId}${payload.warnings?.length ? `; ${payload.warnings.join("; ")}` : ""}` } : item));
        }, () => stop.current, (entry, error) => {
            onChange((previous) => previous.map((item) => item.key === entry.key ? { ...item, failed: true, result: error instanceof Error ? error.message : "Save failed. Check Etsy before retrying." } : item));
        });
        router.refresh();
      } finally { setRunning(false); onRunning(false); }
    }}>{running ? "Saving Etsy batch…" : "Save queued Etsy drafts"}</Button>
    {running && <Button type="button" variant="outline" onClick={() => { stop.current = true; }}>Stop after current item</Button>}
    <p className="text-xs text-muted-foreground">Saves unpublished drafts. Saved and failed items are excluded from later runs. Check Etsy before reviewing and re-adding a failed item.</p>
  </div>;
}
