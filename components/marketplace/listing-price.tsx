"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatMarketplaceDateTime } from "@/lib/utils";

type Entry = { id?: string; price: number; currency: string | null; changedAt: string; changedBy?: string };
const amount = (price: number, currency: string) => `${currency} ${price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function ListingPrice({ listingId, price, currency, recent, title }: { listingId: string; price: number | null; currency: string; recent: Entry[]; title: string }) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [latest, previous] = recent;
  const comparable = price != null && latest?.price === price && previous && (!latest.currency || latest.currency === currency) && (!previous.currency || previous.currency === currency);
  const delta = comparable ? price - previous.price : 0;
  async function showHistory() {
    setOpen(true); setLoading(true); setError("");
    try {
      const response = await fetch(`/api/marketplace/listings/${encodeURIComponent(listingId)}/price-history`, { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load price history. Please retry.");
      const data = await response.json(); setHistory(data.history);
    } catch (error) { setError(error instanceof Error ? error.message : "Could not load price history."); }
    finally { setLoading(false); }
  }
  return <div className="min-w-44 space-y-1">
    <div className="flex items-center gap-1 font-medium">{price == null ? "—" : amount(price, currency)}{delta > 0 ? <ArrowUp aria-label="Price increased" className="h-3.5 w-3.5 text-emerald-500" /> : delta < 0 ? <ArrowDown aria-label="Price decreased" className="h-3.5 w-3.5 text-red-500" /> : null}</div>
    {previous && <div className="text-xs text-muted-foreground">Previous: {amount(previous.price, previous.currency || currency)}</div>}
    {delta !== 0 && <div className="text-xs text-muted-foreground">{delta > 0 ? "+" : "−"}{amount(Math.abs(delta), currency)}{previous.price > 0 ? ` (${(Math.abs(delta) / previous.price * 100).toFixed(1)}%)` : ""}</div>}
    {latest && <div className="whitespace-normal text-[10px] text-muted-foreground">{recent.length > 1 ? "Change observed" : "First recorded"}: {formatMarketplaceDateTime(latest.changedAt)}</div>}
    <Button variant="ghost" size="sm" className="h-6 px-0 text-xs" onClick={() => void showHistory()}><History className="mr-1 h-3 w-3" />Price history</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>Listing price history</DialogTitle><DialogDescription>{title} · Prices observed by ERP; changes between syncs may not be captured.</DialogDescription></DialogHeader>
      {loading ? <p className="text-sm" role="status">Loading history…</p> : error ? <div><p role="alert" className="text-sm text-destructive">{error}</p><Button variant="outline" onClick={() => void showHistory()}>Retry</Button></div> : history.length ? <div className="max-h-96 overflow-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Price</th><th className="p-2">Observed (IST)</th><th className="p-2">Source</th></tr></thead><tbody>{history.map((entry, index) => <tr key={entry.id || index} className="border-t"><td className="p-2 whitespace-nowrap">{amount(entry.price, entry.currency || currency)}{!entry.currency && <span className="block text-[10px] text-muted-foreground">Legacy currency assumed</span>}</td><td className="p-2">{formatMarketplaceDateTime(entry.changedAt)}</td><td className="p-2 text-xs">{entry.changedBy?.replaceAll("_", " ")}</td></tr>)}</tbody></table></div> : <p className="text-sm text-muted-foreground">No prices have been recorded yet. Run a listings sync to record the current price.</p>}
    </DialogContent></Dialog>
  </div>;
}
