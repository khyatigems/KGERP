"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Bell, Check, CheckCheck, CircleAlert, Info, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RetryMarketplaceSyncButton } from "@/components/marketplace/retry-sync-button";
import { cn } from "@/lib/utils";

type Notice = {
  id: string;
  type: "info" | "success" | "warning" | "error";
  eventKey: string;
  title: string;
  message: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

const severityStyles = {
  info: { Icon: Info, className: "text-sky-600 bg-sky-500/10" },
  success: { Icon: Check, className: "text-emerald-600 bg-emerald-500/10" },
  warning: { Icon: AlertTriangle, className: "text-amber-600 bg-amber-500/10" },
  error: { Icon: CircleAlert, className: "text-destructive bg-destructive/10" },
} as const;

function relativeTime(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return new Date(value).toLocaleDateString();
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notice[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [canRetryMarketplaceSync, setCanRetryMarketplaceSync] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  const load = useCallback(async (quiet = false, offset = 0) => {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch(`/api/notifications?limit=20&offset=${offset}`, { cache: "no-store" });
      if (!response.ok) throw new Error("unavailable");
      const data = await response.json() as { items: Notice[]; hasMore: boolean; unreadCount: number; canRetryMarketplaceSync: boolean };
      setItems((current) => offset ? [...current, ...data.items] : data.items);
      setHasMore(data.hasMore);
      setUnreadCount(data.unreadCount);
      setCanRetryMarketplaceSync(data.canRetryMarketplaceSync);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!open) return;
    void load(true);
    const timer = window.setInterval(() => void load(true), 60_000);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex="0"]'));
      if (!focusable.length) { event.preventDefault(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    requestAnimationFrame(() => panelRef.current?.focus());
    return () => { window.clearInterval(timer); window.removeEventListener("keydown", onKeyDown); };
  }, [open, load]);

  const markRead = async (id: string) => {
    try {
      const response = await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      if (!response.ok) throw new Error("unavailable");
      setItems((current) => current.map((item) => item.id === id ? { ...item, readAt: new Date().toISOString() } : item));
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch { toast.error("Could not mark notification as read"); }
  };

  const markAllRead = async () => {
    try {
      const response = await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) });
      if (!response.ok) throw new Error("unavailable");
      const now = new Date().toISOString();
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt || now })));
      setUnreadCount(0);
    } catch { toast.error("Could not mark notifications as read"); }
  };

  const renderContents = () => {
    if (loading) return <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />Loading notifications</div>;
    if (error) return <div className="px-4 py-8 text-center"><CircleAlert className="mx-auto mb-2 size-5 text-destructive" /><p className="text-sm">Notifications are unavailable.</p><Button className="mt-3" size="sm" variant="outline" onClick={() => void load()}>Try again</Button></div>;
    if (!items.length) return <div className="px-4 py-10 text-center"><Bell className="mx-auto mb-2 size-5 text-muted-foreground" /><p className="text-sm font-medium">You’re all caught up</p><p className="mt-1 text-xs text-muted-foreground">Important operational updates will appear here.</p></div>;
    return <div className="divide-y divide-border">{items.map((item) => {
      const config = severityStyles[item.type] || severityStyles.info;
      const Icon = config.Icon;
      return <article key={item.id} className={cn("px-3 py-3", !item.readAt && "bg-muted/35")}>
        <div className="flex items-start gap-3">
          <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full", config.className)}><Icon className="size-4" /></span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2"><h3 className="text-sm font-medium leading-5">{item.title}</h3><time className="shrink-0 pt-0.5 text-[11px] text-muted-foreground" dateTime={item.createdAt}>{relativeTime(item.createdAt)}</time></div>
            <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">{item.message}</p>
            <div className="mt-2 flex items-center gap-3">
              {item.href && <Link href={item.href} onClick={() => { if (!item.readAt) void markRead(item.id); setOpen(false); }} className="text-xs font-medium text-primary hover:underline">View details</Link>}
              {canRetryMarketplaceSync && item.eventKey.startsWith("marketplace-sync:") && <RetryMarketplaceSyncButton jobIds={[item.eventKey.slice("marketplace-sync:".length)]} label="Retry sync" />}
              {!item.readAt && <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => void markRead(item.id)}><Check className="mr-1 size-3.5" />Mark read</Button>}
            </div>
          </div>
        </div>
      </article>;
    })}</div>;
  };

  return <div className="relative">
    <Button ref={triggerRef} type="button" variant="ghost" size="icon" className="relative" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`} aria-controls="erp-notifications-panel" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((value) => !value)}>
      <Bell className="size-5" />
      {unreadCount > 0 && <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">{unreadCount > 99 ? "99+" : unreadCount}</span>}
    </Button>
    {open && <>
      <button type="button" tabIndex={-1} aria-label="Close notifications" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
      <section ref={panelRef} id="erp-notifications-panel" tabIndex={-1} role="dialog" aria-modal="true" aria-label="Notifications" className="absolute right-0 top-12 z-50 w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl outline-none">
        <header className="flex items-center justify-between border-b px-4 py-3"><div><h2 className="text-sm font-semibold">Notifications</h2><p className="text-xs text-muted-foreground">{unreadCount} unread</p></div>{unreadCount > 0 && <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => void markAllRead()}><CheckCheck className="mr-1.5 size-4" />Mark all read</Button>}</header>
        <div className="max-h-[min(65vh,30rem)] overflow-y-auto">{renderContents()}</div>
        {hasMore && <footer className="border-t px-4 py-2 text-center"><Button size="sm" variant="ghost" className="text-xs" disabled={loadingMore} onClick={() => { setLoadingMore(true); void load(true, items.length); }}>{loadingMore ? "Loading…" : "Load older notifications"}</Button></footer>}
      </section>
    </>}
  </div>;
}
