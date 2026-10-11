"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EBAY_BATCH_LIMIT, runEbayBatch, validateEbayBatchSelection, type EbayBatchDraft } from "@/lib/marketplace/ebay-batch";

type Draft = EbayBatchDraft & { title: string; price: number; currency: string; shop: string; platform: string };
type Result = { state: "READY" | "FAILED" | "PUBLISHED"; token?: string; title?: string; price?: number; currency?: string; quantity?: number; photoCount?: number; specificCount?: number; location?: string; message?: string; listingUrl?: string };

export function EbayBulkReview({ drafts }: { drafts: Draft[] }) {
  const router = useRouter();
  const eligible = drafts.filter((draft) => draft.platform === "EBAY" && draft.shopId);
  const [selected, setSelected] = useState<string[]>([]);
  const [results, setResults] = useState<Record<string, Result>>({});
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [dirty, setDirty] = useState<string[]>([]);
  useEffect(() => {
    function changed(event: Event) {
      const detail = (event as CustomEvent<{ draftId: string; dirty: boolean }>).detail;
      if (!detail) return;
      setDirty((current) => detail.dirty ? [...new Set([...current, detail.draftId])] : current.filter((id) => id !== detail.draftId));
      setResults((current) => { const next = { ...current }; delete next[detail.draftId]; return next; });
      setConfirmed(false);
    }
    window.addEventListener("ebay-draft-edits", changed);
    return () => window.removeEventListener("ebay-draft-edits", changed);
  }, []);
  const [address, setAddress] = useState({ country: "IN", postalCode: "122001", city: "Kpmg" });
  const stop = useRef(false);
  const chosen = eligible.filter((draft) => selected.includes(draft.id));
  const ready = chosen.filter((draft) => results[draft.id]?.state === "READY");
  const hasUnsavedChanges = chosen.some((draft) => dirty.includes(draft.id));
  async function request(draft: EbayBatchDraft, action: string, extra: Record<string, unknown> = {}) {
    const response = await fetch("/api/marketplace/listing-preparation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, draftId: draft.id, shopId: draft.shopId, ...extra }) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "eBay operation failed.");
    return payload;
  }
  function selection(ids: string[]) { setSelected(ids); setResults({}); setConfirmed(false); }
  if (!eligible.length) return null;
  return <div className="mb-4 space-y-3 rounded-lg border p-4">
    <h3 className="font-semibold">Bulk eBay preparation and publishing</h3>
    <p className="text-sm">Select up to {EBAY_BATCH_LIMIT} saved drafts. Save each product&apos;s actual details first; changes in an open review must be verified before starting a batch.</p>
    <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => selection(eligible.slice(0, 5).map((draft) => draft.id))}>Select first 5</Button>
    <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => selection([])}>Clear selection</Button>
    <div className="max-h-64 space-y-2 overflow-auto">{eligible.map((draft) => <Label key={draft.id} className="flex items-start gap-2 rounded border p-2">
      <input type="checkbox" disabled={busy || (!selected.includes(draft.id) && selected.length >= EBAY_BATCH_LIMIT)} checked={selected.includes(draft.id)} onChange={(event) => selection(event.target.checked ? [...selected, draft.id] : selected.filter((id) => id !== draft.id))} />
      <span className="min-w-0 text-sm">{draft.sku} · {results[draft.id]?.title || draft.title} · {draft.shop} · {results[draft.id]?.currency || draft.currency} {(results[draft.id]?.price ?? draft.price).toFixed(2)}
        {results[draft.id] && <span className="block">{results[draft.id].state}: {results[draft.id].message || "Verified; ready for review."}{results[draft.id].listingUrl && <a className="ml-2 underline" href={results[draft.id].listingUrl} target="_blank" rel="noreferrer">View listing</a>}</span>}
        {results[draft.id]?.state === "READY" && <span className="block">Quantity {results[draft.id].quantity} · {results[draft.id].photoCount} photos · {results[draft.id].specificCount} item specifics · {results[draft.id].location}</span>}
      </span>
    </Label>)}</div>
    <p className="text-xs">For drafts without a selected eBay location, use this actual dispatch address:</p>
    <div className="grid gap-3 sm:grid-cols-3">{(["country", "postalCode", "city"] as const).map((key) => <Label key={key} className="flex flex-col items-start gap-2">{key === "country" ? "Country code" : key === "postalCode" ? "Postal code" : "City"}<Input disabled={busy} value={address[key]} onChange={(event) => { setAddress({ ...address, [key]: event.target.value }); setResults({}); setConfirmed(false); }} /></Label>)}</div>
    {hasUnsavedChanges && <p className="text-sm text-amber-700">A selected product has unsaved review edits. Verify that product&apos;s edits first, or reload its review to discard them.</p>}
    <Button type="button" variant="outline" disabled={busy || !chosen.length || hasUnsavedChanges} onClick={async () => {
      try { validateEbayBatchSelection(chosen); } catch (error) { toast.error(error instanceof Error ? error.message : "Invalid selection."); return; }
      setBusy(true); setResults({}); setConfirmed(false); stop.current = false;
      try {
        await runEbayBatch(chosen, async (draft) => {
          const review = await request(draft, "reviewCompleteEbay");
          const result = await request(draft, "prepareCompleteEbay", { locationKey: review.preparation?.locationKey || undefined, dispatchAddress: review.preparation?.locationKey ? undefined : address });
          return { token: result.reviewToken, title: result.input.title, price: result.input.price, currency: result.input.currency, quantity: result.input.quantity, photoCount: result.input.media.filter((asset: { type: string }) => asset.type === "IMAGE").length, specificCount: Object.keys(result.input.aspects).length, location: [result.location?.location?.address?.city, result.location?.location?.address?.postalCode, result.location?.location?.address?.country].filter(Boolean).join(", ") };
        }, () => stop.current, (draft, result) => setResults((current) => ({ ...current, [draft.id]: result.error ? { state: "FAILED", message: result.error } : { state: "READY", ...result.value } })));
      } finally { setBusy(false); }
    }}>{busy ? "Processing batch…" : `Verify ${chosen.length} selected drafts`}</Button>
    {busy && <Button type="button" variant="outline" onClick={() => { stop.current = true; toast.info("Stopping after the current request finishes."); }}>Stop after current item</Button>}
    {!busy && ready.length > 0 && <div className="space-y-2 rounded border p-3">
      <p className="text-sm">Publish {ready.length} verified listings shown above at their displayed prices. Failed or unverified items are excluded. eBay fees may apply. Separate Seller Hub drafts remain.</p>
      <Label className="flex gap-2"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />I reviewed these {ready.length} products, shops and prices and confirm publishing them live.</Label>
      <Button type="button" disabled={!confirmed || hasUnsavedChanges} onClick={async () => {
        setBusy(true); setConfirmed(false); stop.current = false;
        try {
          await runEbayBatch(ready, async (draft) => {
            const result = await request(draft, "publishCompleteEbay", { reviewToken: results[draft.id].token, confirmationSku: draft.sku });
            return result.listingUrl as string;
          }, () => stop.current, (draft, result) => setResults((current) => ({ ...current, [draft.id]: result.error ? { ...current[draft.id], state: "FAILED", message: result.error } : { ...current[draft.id], state: "PUBLISHED", message: "Published successfully.", listingUrl: result.value } })));
          // Keep outcomes visible until the seller dismisses the batch.
        } finally { setBusy(false); }
      }}>Publish {ready.length} verified listings</Button>
    </div>}
    {Object.values(results).some((result) => result.state === "PUBLISHED") && !busy && <Button type="button" variant="outline" onClick={() => { selection([]); router.refresh(); }}>Finish and refresh listings</Button>}
  </div>;
}
