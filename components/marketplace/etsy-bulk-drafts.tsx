"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EtsyDraftBatch } from "./etsy-draft-batch";
import { useEtsyDraftQueue } from "./use-etsy-draft-queue";
import type { SavedDraft } from "./marketplace-drafts-client";
import { runEtsyDraftBatch } from "@/lib/marketplace/etsy-draft-batch";

export function EtsyBulkDrafts({ drafts, onRunning }: { drafts: SavedDraft[]; onRunning: (running: boolean) => void }) {
 const [queue, setQueue] = useEtsyDraftQueue();
 const [selected, setSelected] = useState<string[]>([]);
 const [action, setAction] = useState("repairEtsySku");
 const [running, setRunning] = useState(false);
 const [results, setResults] = useState<Record<string, string>>({});
 const stop = useRef(false);
 const router = useRouter();
 const eligible = drafts.filter((draft) => draft.platform === "ETSY" && draft.shopId && draft.externalId);
 return <div className="space-y-4">
  <div className="space-y-3 rounded-lg border p-4"><h3 className="font-semibold">Save new Etsy drafts in bulk</h3><p className="text-sm">Review products in Create Listings and choose Add reviewed item to Etsy batch. Your queue is available here in the same browser tab. Save 5 by default or up to 25 per run.</p><Button asChild variant="outline" disabled={running}><Link href="/marketplace-create-listings" onClick={(event) => { if (running) event.preventDefault(); }} aria-disabled={running}>Prepare Etsy batch items</Link></Button>
   {!queue.length && <p className="text-sm text-muted-foreground">No reviewed Etsy items queued yet.</p>}
   <EtsyDraftBatch blocked={running} items={queue} onChange={setQueue} onRunning={(value) => { setRunning(value); onRunning(value); }} />
  </div>
  <div className="space-y-3 rounded-lg border p-4"><h3 className="font-semibold">Update existing Etsy drafts</h3><p className="text-sm">Select up to 25 existing drafts to verify SKUs or retry category attributes. These actions keep the same Etsy draft IDs.</p>
   <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={running} onClick={() => { setSelected(eligible.slice(0, 5).map((draft) => draft.id)); setResults({}); }}>Select first 5</Button><Button type="button" variant="ghost" disabled={running} onClick={() => { setSelected([]); setResults({}); }}>Clear selection</Button><select aria-label="Etsy bulk action" disabled={running} className="rounded border bg-background px-3 py-2 text-sm" value={action} onChange={(event) => { setAction(event.target.value); setResults({}); }}><option value="repairEtsySku">Verify and sync SKUs</option><option value="repairEtsyAttributes">Retry category attributes</option></select></div>
   <div className="max-h-80 space-y-2 overflow-auto">{eligible.map((draft) => <label key={draft.id} className="flex items-start gap-2 rounded border p-3 text-sm"><input type="checkbox" disabled={running || (!selected.includes(draft.id) && selected.length >= 25)} checked={selected.includes(draft.id)} onChange={(event) => { setSelected((previous) => event.target.checked ? [...previous, draft.id] : previous.filter((id) => id !== draft.id)); setResults({}); }} /><span>{draft.sku} · {draft.title} · {draft.shop}{results[draft.id] && <span className="block text-xs">{results[draft.id]}</span>}</span></label>)}</div>
   {!eligible.length && <p className="text-sm text-muted-foreground">No saved Etsy marketplace drafts match the current filter.</p>}
   <Button type="button" disabled={running || !selected.length} onClick={async () => {
    setRunning(true); onRunning(true); stop.current = false; setResults({});
    try { await runEtsyDraftBatch(eligible.filter((draft) => selected.includes(draft.id)).map((draft) => ({ ...draft, key: draft.id })), 25, async (draft) => {
      setResults((previous) => ({ ...previous, [draft.id]: "Working…" }));
      const response = await fetch("/api/marketplace/listing-preparation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, draftId: draft.id, shopId: draft.shopId }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "Update failed.");
      setResults((previous) => ({ ...previous, [draft.id]: payload.warnings?.length ? `Needs attention: ${payload.warnings.join("; ")}` : "Verified successfully" }));
    }, () => stop.current, (draft, error) => setResults((previous) => ({ ...previous, [draft.id]: error instanceof Error ? error.message : "Update failed." }))); router.refresh(); }
    finally { setRunning(false); onRunning(false); }
   }}>{running ? "Processing Etsy batch…" : `Run action on ${selected.length} drafts`}</Button>
   {running && <Button type="button" variant="outline" onClick={() => { stop.current = true; }}>Stop after current item</Button>}
  </div>
 </div>;
}
