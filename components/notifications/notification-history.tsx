"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { companionHref, type CompanionNotice } from "@/lib/companion";
import { reviewNotifications } from "@/lib/notification-review-client";
import { RetryMarketplaceSyncButton } from "@/components/marketplace/retry-sync-button";
import { Button } from "@/components/ui/button";

export function NotificationHistory({ onOpenRecord }: { onOpenRecord?: () => void }) {
  const [items, setItems] = useState<CompanionNotice[]>([]);
  const [query, setQuery] = useState("");
  const [state, setState] = useState("all");
  const [severity, setSeverity] = useState("");
  const [category, setCategory] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [canRetry, setCanRetry] = useState(false);
  const generation = useRef(0);
  const requestController = useRef<AbortController | null>(null);
  const cancelLoad = useCallback(() => { generation.current++; requestController.current?.abort(); }, []);
  const load = useCallback(async (next?: string | null) => {
    cancelLoad();
    const version = ++generation.current;
    const controller = new AbortController();
    requestController.current = controller;
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ q: query, state, severity, category, limit: "20" });
      if (next) params.set("cursor", next);
      const response = await fetch(`/api/notifications?${params}`, { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (version !== generation.current) return;
      setItems(current => next ? [...current, ...data.items.filter((item: CompanionNotice) => !current.some(old => old.id === item.id))] : data.items);
      setMore(data.hasMore); setCursor(data.nextCursor); setCanRetry(data.canRetryMarketplaceSync);
      if (!next) setSelected([]);
    } catch { if (!controller.signal.aborted && version === generation.current) setError("Saved updates are temporarily unavailable. Please try again."); }
    finally { if (version === generation.current) setLoading(false); }
  }, [query, state, severity, category, cancelLoad]);
  useEffect(() => { cancelLoad(); setSelected([]); setItems([]); setMore(false); setLoading(true); const timer = window.setTimeout(() => void load(), 250); return () => { clearTimeout(timer); cancelLoad(); }; }, [load, cancelLoad]);
  useEffect(() => {
    const refresh = () => void load();
    const storage = (event: StorageEvent) => { if (event.key === "erp:notification-review") refresh(); };
    window.addEventListener("erp:notification-read", refresh); window.addEventListener("storage", storage);
    return () => { window.removeEventListener("erp:notification-read", refresh); window.removeEventListener("storage", storage); };
  }, [load]);
  async function review(input: Parameters<typeof reviewNotifications>[0]) {
    setPending(true); setError("");
    try { await reviewNotifications(input); }
    catch { setError("Could not save your review. Please try again."); }
    finally { setPending(false); }
  }
  return <section aria-label="ERP notification inbox" className="space-y-3 p-3 max-sm:[&_button]:min-h-11 max-sm:[&_a]:min-h-11">
    <input type="search" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search all saved notifications" placeholder="Search all saved history…" className="min-h-10 w-full rounded-lg border bg-background px-3 text-sm" />
    <div className="grid grid-cols-2 gap-2">
      <select aria-label="Notification status" value={state} onChange={e => setState(e.target.value)} className="min-h-10 rounded-lg border bg-background px-2 text-xs">{["all", "unread", "attention", "acknowledged", "resolved"].map(value => <option key={value} value={value}>{value === "all" ? "All notifications" : value}</option>)}</select>
      <select aria-label="Notification severity" value={severity} onChange={e => setSeverity(e.target.value)} className="min-h-10 rounded-lg border bg-background px-2 text-xs"><option value="">Every severity</option>{["info", "success", "warning", "error"].map(value => <option key={value}>{value}</option>)}</select>
      <select aria-label="Notification category" value={category} onChange={e => setCategory(e.target.value)} className="col-span-2 min-h-10 rounded-lg border bg-background px-2 text-xs"><option value="">Every category</option>{[["marketplace-sync", "Marketplace"], ["report-export", "Reports"], ["inventory", "Inventory"], ["sale", "Sales & invoices"], ["purchase", "Purchases"], ["quotation", "Quotations"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
    </div>
    <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={pending} onClick={() => void review({ all: true })}>Mark all read</Button>{selected.length > 0 && <><Button size="sm" variant="outline" disabled={pending} onClick={() => void review({ ids: selected, action: "acknowledge" })}>Acknowledge {selected.length}</Button><Button size="sm" variant="outline" disabled={pending} onClick={() => void review({ ids: selected, action: "snooze", minutes: 60 })}>Snooze 1 hour</Button></>}</div>
    {error && <div role="alert" className="text-xs text-destructive">{error}<button className="ml-2 underline" onClick={() => void load()}>Retry</button></div>}
    {items.map(item => <article key={item.id} className={`rounded-xl border p-3 ${item.readAt ? "bg-muted/20" : "border-primary/25 bg-primary/5"}`}>
      <div className="flex items-start gap-2"><input type="checkbox" aria-label={`Select ${item.title}`} checked={selected.includes(item.id)} onChange={e => setSelected(current => e.target.checked ? [...current, item.id] : current.filter(id => id !== item.id))} className="mt-1 size-4" /><div className="min-w-0 flex-1"><h3 className="text-sm font-medium">{item.title}</h3><p className="mt-1 text-[11px] text-muted-foreground">{item.type} · {item.resolvedAt ? "Resolved · verified recovery" : item.acknowledgedAt ? "Acknowledged · awaiting recovery" : item.readAt ? "Read" : "New"}</p></div></div>
      <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-muted-foreground">{item.dialogue?.detailed || item.message}</p>
      <time className="text-[11px] text-muted-foreground" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time>
      {item.snoozedUntil && Date.parse(item.snoozedUntil) > Date.now() && <p className="text-[11px] text-muted-foreground">Snoozed until {new Date(item.snoozedUntil).toLocaleString()}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {companionHref(item.href) && <Link className="inline-flex min-h-9 items-center text-xs font-medium text-primary underline" href={companionHref(item.href)!} onClick={() => { if (!item.readAt) void review({ id: item.id }); onOpenRecord?.(); }}>Open record</Link>}
        {!item.readAt && <Button size="sm" variant="ghost" disabled={pending} onClick={() => void review({ id: item.id })}>Mark read</Button>}
        {!item.acknowledgedAt && !item.resolvedAt && <Button size="sm" variant="ghost" aria-label={`Acknowledge ${item.title}`} disabled={pending} onClick={() => void review({ id: item.id, action: "acknowledge" })}>Acknowledge</Button>}
        {!item.resolvedAt && <Button size="sm" variant="ghost" disabled={pending} onClick={() => void review({ id: item.id, action: "snooze", minutes: 60 })}>Snooze 1h</Button>}
        {canRetry && !item.resolvedAt && item.eventKey?.startsWith("marketplace-sync:") && <RetryMarketplaceSyncButton jobIds={[item.eventKey.slice("marketplace-sync:".length)]} label="Retry sync" />}
      </div>
    </article>)}
    {loading && <p role="status" className="text-xs text-muted-foreground">Loading saved updates…</p>}
    {!loading && !error && !items.length && <p className="text-xs text-muted-foreground">No saved notifications match your search.</p>}
    {more && <Button size="sm" variant="outline" className="w-full" disabled={loading} onClick={() => void load(cursor)}>Load older notifications</Button>}
  </section>;
}
