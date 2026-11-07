"use client";

import { NotificationHistory } from "./notification-history";
import { companionRuntime, OPEN_COMPANION_EVENT } from "@/lib/companion-runtime";
import { publishCompanionNotifications } from "@/lib/companion-notification-store";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

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

export function NotificationBell() {
  const companionActive = useSyncExternalStore(companionRuntime.subscribe, companionRuntime.getSnapshot, companionRuntime.getServerSnapshot);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notice[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const cursorRef = useRef<string | null>(null);
  const requestRef = useRef(false);

  const load = useCallback(async (quiet = false, offset = 0) => {
    if (requestRef.current) return;
    requestRef.current = true;
    if (!quiet) setLoading(true);
    try {
      const paging = offset && cursorRef.current ? `cursor=${encodeURIComponent(cursorRef.current)}` : `offset=${offset}`;
      const response = await fetch(`/api/notifications?limit=20&${paging}`, { cache: "no-store" });
      if (!response.ok) throw new Error("unavailable");
      const data = await response.json() as { items: Notice[]; hasMore: boolean; nextCursor?: string | null; unreadCount: number; canRetryMarketplaceSync: boolean };
      cursorRef.current = data.nextCursor ?? null;
      setItems((current) => offset ? [...current, ...data.items.filter(item => !current.some(existing => existing.id === item.id))] : data.items);
      setHasMore(data.hasMore);
      setUnreadCount(data.unreadCount);
      setError(false);
    } catch {
      setError(true);
    } finally {
      requestRef.current = false;
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    publishCompanionNotifications(items, loading ? "loading" : error ? "error" : "ready", { hasMore, unreadCount, loadingMore, refresh: () => void load(true), loadMore: () => { setLoadingMore(true); void load(true, items.length); } });
  }, [items, loading, error, hasMore, unreadCount, loadingMore, load]);
  useEffect(() => {
    const read = () => { void load(true); };
    const storage = (event: StorageEvent) => { if (event.key === "erp:notification-review") read(); };
    window.addEventListener("storage", storage);
    window.addEventListener("erp:notification-read", read);
    return () => { window.removeEventListener("erp:notification-read", read); window.removeEventListener("storage", storage); };
  }, [load]);
  useEffect(() => () => publishCompanionNotifications([], "loading"), []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void load(true);
    };
    const timer = window.setInterval(refreshWhenVisible, 60_000);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [load]);
  useEffect(() => {
    if (!open || companionActive) return;
    void load(true);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex="0"]'));
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
    return () => { window.removeEventListener("keydown", onKeyDown); };
  }, [open, load, companionActive]);

  return <div className="relative">
    <Button ref={triggerRef} type="button" variant="ghost" size="icon" className="relative" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`} aria-controls="erp-notifications-panel" aria-expanded={open} aria-haspopup="dialog" onClick={() => { if (companionActive) { setOpen(false); window.dispatchEvent(new CustomEvent(OPEN_COMPANION_EVENT)); } else setOpen((value) => !value); }}>
      <Bell className="size-5" />
      {unreadCount > 0 && <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">{unreadCount > 99 ? "99+" : unreadCount}</span>}
    </Button>
    {open && !companionActive && <>
      <button type="button" tabIndex={-1} aria-label="Close notifications" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
      <section ref={panelRef} id="erp-notifications-panel" tabIndex={-1} role="dialog" aria-modal="true" aria-label="Notifications" className="absolute right-0 top-12 z-50 w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-[0_24px_90px_#0005] outline-none">
        <header className="flex items-center justify-between border-b px-4 py-3"><div><h2 className="text-sm font-semibold">Notifications</h2><p className="text-xs text-muted-foreground">{unreadCount} unread</p></div></header>
        <div className="max-h-[min(65vh,30rem)] overflow-y-auto">{<NotificationHistory onOpenRecord={() => setOpen(false)} />}</div>

      </section>
    </>}
  </div>;
}
