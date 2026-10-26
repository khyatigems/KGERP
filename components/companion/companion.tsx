"use client";



import Link from "next/link";

import { usePathname } from "next/navigation";

import { isValidElement, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

import { ArrowUpRight, Check, GripHorizontal, Pin, Settings2, X } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { Button } from "@/components/ui/button";

import { COMPANION_FEEDBACK_EVENT, COMPANION_PREFERENCES_EVENT, companionActions, companionCharacters, companionHref, filterCompanionNotices, type CompanionPreferences } from "@/lib/companion";

import { acknowledgeCompanionNotice, companionNotificationStore } from "@/lib/companion-notification-store";

import { OPEN_COMPANION_EVENT, isMarketplaceSyncToast } from "@/lib/companion-runtime";

import { saveCompanionPreferences } from "@/app/(dashboard)/settings/companion/actions";

import { RetryMarketplaceSyncButton } from "@/components/marketplace/retry-sync-button";

import { useCompanionFeedback, type CompanionFeedback } from "./use-companion-feedback";

import { useCompanionDrag } from "./use-companion-drag";

import { CompanionCustomization } from "./appearance-picker";

import { useCompanionGestures } from "./use-companion-gestures";

import { Facet, type FacetState } from "./facet";

import "./companion.css";



function content(value: ReactNode | (() => ReactNode)): ReactNode { return typeof value === "function" ? value() : value; }

function text(value: ReactNode): string {

  if (typeof value === "string" || typeof value === "number") return String(value);

  if (Array.isArray(value)) return value.map(text).join(" ");

  if (isValidElement<{ children?: ReactNode }>(value)) return text(value.props.children);

  return "";

}

function FeedbackCard({ item, acknowledge }: { item: CompanionFeedback; acknowledge: (id: string | number) => void }) {

  const action = item.action;

  const cancel = item.cancel;

  return <article className="facet-feedback rounded-xl border bg-background/50 p-3" data-feedback-id={item.id}>

    <div className="mb-2 flex items-center justify-between gap-2 text-[10px] text-muted-foreground"><span className={item.type === "error" ? "text-destructive" : ""}>{item.type === "loading" ? "In progress" : item.type || "ERP activity"} · {item.read ? "Read" : "New"}</span><time dateTime={item.receivedAt}>{new Date(item.receivedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time></div>

    <div className="text-xs leading-5">{item.jsx || content(item.title) || "ERP action updated"}</div>

    {item.description && <div className="mt-1 text-xs text-muted-foreground">{content(item.description)}</div>}

    <div className="mt-2 flex flex-wrap items-center gap-2">

      {isValidElement(action) ? action : action && typeof action === "object" && "label" in action ? <Button size="sm" variant="outline" onClick={action.onClick}>{action.label}</Button> : null}

      {isValidElement(cancel) ? cancel : cancel && typeof cancel === "object" && "label" in cancel ? <Button size="sm" variant="ghost" onClick={cancel.onClick}>{cancel.label}</Button> : null}

      {!item.read && <button className="ml-auto rounded px-2 py-1 text-xs hover:bg-muted" onClick={() => acknowledge(item.id)}>Acknowledge</button>}

    </div>

  </article>;

}



type Alert = { key: string; title: ReactNode; message: ReactNode; tab: "inbox" | "activity" };

export function Companion({ preferences: prefs, allowedModules, userId }: { preferences: CompanionPreferences; allowedModules: string[]; userId: string }) {

  const pathname = usePathname();

  const characterName = companionCharacters.find(character => character.id === prefs.character)?.name || "Facet";

  const snapshot = useSyncExternalStore(companionNotificationStore.subscribe, companionNotificationStore.getSnapshot, companionNotificationStore.getServerSnapshot);

  const { history, acknowledge: acknowledgeFeedback } = useCompanionFeedback(userId);

  const [open, setOpen] = useState(false);

  const [tab, setTab] = useState<"inbox" | "activity" | "workday" | "customize">("inbox");

  const [filter, setFilter] = useState<"all" | "unread" | "attention">("all");

  const [query, setQuery] = useState("");

  const [visible, setVisible] = useState(true);

  const [greeting, setGreeting] = useState(false);

  const [snoozed, setSnoozed] = useState(false);

  const [feedback, setFeedback] = useState<FacetState>("idle");

  const [pendingId, setPendingId] = useState<string | null>(null);

  const [error, setError] = useState("");

  const [queue, setQueue] = useState<Alert[]>([]);

  const announced = useRef(new Set<string>());

  const [reviews, setReviews] = useState<string[]>([]);

  const drag = useCompanionDrag(prefs, userId, setError);

  const reviewKey = `facet:review:${userId}:${new Date().toLocaleDateString("en-CA")}`;

  useEffect(() => { try { setReviews(JSON.parse(localStorage.getItem(reviewKey) || "[]")); } catch { setReviews([]); } }, [reviewKey]);

  useEffect(() => {

    try { announced.current = new Set(JSON.parse(sessionStorage.getItem(`facet:announced:${userId}`) || "[]")); } catch { /* Session storage optional. */ }

  }, [userId]);

  useEffect(() => {

    const candidates: Alert[] = [

      ...snapshot.items.filter(item => !item.readAt && (prefs.severity === "all" || item.type === "warning" || item.type === "error")).slice(0, 3).map(item => ({ key: `notice:${item.id}`, title: item.title, message: item.message, tab: "inbox" as const })),

      ...history.filter(item => !item.read && !isMarketplaceSyncToast(item.id, item.className)).slice(0, 3).map(item => ({ key: `toast:${item.id}:${item.receivedAt}:${item.revision}`, title: item.jsx ? "ERP action updated" : content(item.title), message: item.jsx ? "Open activity for details and available actions." : content(item.description), tab: "activity" as const })),

    ];

    const fresh = candidates.filter(item => !announced.current.has(item.key));

    fresh.forEach(item => announced.current.add(item.key));

    if (fresh.length) {

      try { sessionStorage.setItem(`facet:announced:${userId}`, JSON.stringify([...announced.current].slice(-200))); } catch { /* Optional session deduplication. */ }

      if (!open && visible && prefs.notifications && !prefs.quiet && !snoozed) { setGreeting(false); setQueue(current => [...current, ...fresh].slice(-5)); }

    }

  }, [snapshot.items, history, prefs.notifications, prefs.quiet, prefs.severity, snoozed, open, visible, userId]);

  useEffect(() => {

    if (open || prefs.quiet || snoozed || !prefs.notifications) { setQueue(current => current.length ? [] : current); return; }

    if (!queue.length || !visible) return;

    const timer = window.setTimeout(() => setQueue(current => current.slice(1)), 9000);

    return () => window.clearTimeout(timer);

  }, [queue, open, prefs.quiet, snoozed, prefs.notifications, visible]);

  useEffect(() => {

    const openPanel = () => { setTab("inbox"); setOpen(true); setGreeting(false); };

    window.addEventListener(OPEN_COMPANION_EVENT, openPanel);

    return () => window.removeEventListener(OPEN_COMPANION_EVENT, openPanel);

  }, []);

  useEffect(() => {

    setGreeting(false);

    if (!prefs.greetings || prefs.quiet) return;

    try { const key = `facet:greeted:${userId}`; if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1"); } catch { /* Storage optional. */ }

    setGreeting(true); const timer = window.setTimeout(() => setGreeting(false), 6000);

    return () => window.clearTimeout(timer);

  }, [prefs.greetings, prefs.quiet, userId]);

  useEffect(() => {

    const update = () => setVisible(document.visibilityState === "visible");

    update(); document.addEventListener("visibilitychange", update);

    return () => document.removeEventListener("visibilitychange", update);

  }, []);

  useEffect(() => {

    setFeedback("idle"); if (prefs.quiet || snoozed) return;

    let timer: number | undefined;

    const update = (event: Event) => {

      const state = (event as CustomEvent).detail?.state;

      if (!["working", "success", "warning"].includes(state)) return;

      setFeedback(state); window.clearTimeout(timer);

      timer = window.setTimeout(() => setFeedback("idle"), state === "working" ? 15000 : 3500);

    };

    window.addEventListener(COMPANION_FEEDBACK_EVENT, update);

    return () => { window.clearTimeout(timer); window.removeEventListener(COMPANION_FEEDBACK_EVENT, update); };

  }, [prefs.quiet, snoozed]);



  const allActions = companionActions.filter(action => allowedModules.includes("ALL") || allowedModules.includes(action.permission));

  const actions = [...allActions].sort((a, b) => Number(prefs.pinned.includes(b.href)) - Number(prefs.pinned.includes(a.href)) || Number(pathname.startsWith(b.context)) - Number(pathname.startsWith(a.context))).slice(0, 4);

  const unread = snapshot.unreadCount ?? snapshot.items.filter(item => !item.readAt).length;

  const activityUnread = history.filter(item => !item.read).length;

  const sleeping = prefs.quiet || snoozed;

  const gestures = useCompanionGestures(`${queue[0]?.key || ""}:${feedback}:${open}`, sleeping);

  const busy = history.some(item => !item.read && item.type === "loading");

  const state: FacetState = sleeping ? "sleeping" : busy || feedback === "working" ? "working" : feedback !== "idle" ? feedback : gestures.reaction ? gestures.reaction : queue.length && !open ? "notification" : greeting ? "greeting" : gestures.resting && !open ? "resting" : snapshot.items.some(item => !item.readAt && (item.type === "warning" || item.type === "error")) ? "warning" : unread + activityUnread ? "notification" : "idle";

  const top = drag.dock ? drag.dock.y < .5 : prefs.position.startsWith("top");

  const left = drag.dock ? drag.dock.x < .5 : prefs.position.endsWith("left");

  const acknowledge = async (id: string) => {

    setPendingId(id); setError("");

    try {

      const response = await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(id === "all" ? { all: true } : { id }) });

      if (!response.ok) throw new Error();

      acknowledgeCompanionNotice(id); window.dispatchEvent(new CustomEvent("erp:notification-read", { detail: { id } }));

    } catch { setError("Could not acknowledge this update. Please try again."); }

    finally { setPendingId(null); }

  };

  async function pin(href: string) {

    const pinned = prefs.pinned.includes(href) ? prefs.pinned.filter(item => item !== href) : [...prefs.pinned, href].slice(-8);

    try { const result = await saveCompanionPreferences({ ...prefs, pinned }); if (result.error) throw new Error(); window.dispatchEvent(new CustomEvent(COMPANION_PREFERENCES_EVENT, { detail: { userId, preferences: result.preferences } })); }

    catch { setError("Shortcut could not be pinned. Please try again."); }

  }

  const shownNotices = filterCompanionNotices(snapshot.items, filter, query);

  const shownActivity = history.filter(item => (filter !== "unread" || !item.read) && (filter !== "attention" || item.type === "warning" || item.type === "error") && `${text(content(item.title))} ${text(content(item.description))} ${item.jsx ? "ERP action updated" : ""}`.toLowerCase().includes(query.toLowerCase()));

  const alert = queue[0];

  return <div style={drag.style} className={`group/companion fixed z-40 ${top ? "top-20" : "bottom-[max(5rem,env(safe-area-inset-bottom))] sm:bottom-6"} ${left ? "left-3 lg:left-[18rem]" : "right-3 sm:right-6"} ${prefs.animations && !sleeping ? "companion-motion" : ""} ${!visible ? "companion-paused" : ""}`} data-companion-state={state}>

    <button {...drag.handlers} title="Drag to move. Arrow keys also move Facet." aria-label="Move Facet" className="mx-auto flex h-5 w-10 touch-none cursor-grab items-center justify-center rounded-t-lg border border-b-0 bg-background/80 text-muted-foreground opacity-40 hover:opacity-100 focus-visible:opacity-100 group-hover/companion:opacity-100 active:cursor-grabbing"><GripHorizontal className="size-4" /></button>

    <Popover open={open} onOpenChange={value => { setOpen(value); setGreeting(false); }}>

      <PopoverTrigger asChild><button {...gestures.handlers} title="Open ERP tools · Right-click to customize" onContextMenu={event => { event.preventDefault(); setTab("customize"); setOpen(true); }} style={{ width: prefs.size, height: prefs.size }} data-companion-launcher aria-label={`Open Facet companion, ${unread + activityUnread} unread updates`} className="relative flex items-center justify-center rounded-2xl bg-transparent p-0 drop-shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">

        <Facet character={prefs.character} state={state} />{!sleeping && unread + activityUnread > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">{unread + activityUnread > 99 ? "99+" : unread + activityUnread}</span>}

      </button></PopoverTrigger>

      <PopoverContent collisionPadding={12} side={top ? "bottom" : "top"} align={left ? "start" : "end"} sideOffset={12} className="w-[min(400px,calc(100vw-24px))] overflow-y-auto rounded-2xl p-0 shadow-xl motion-reduce:animate-none" style={{ maxHeight: "min(640px, var(--radix-popover-content-available-height))" }} aria-label="Facet ERP companion">

        <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-popover px-4 py-3"><div className="size-12"><Facet character={prefs.character} state={state} /></div><div className="flex-1"><h2 className="font-semibold">{characterName} <span className="text-xs font-normal text-muted-foreground">· KhyatiGems</span></h2><p className="text-xs text-muted-foreground">{sleeping ? "Quiet and ready when you need me" : "Your business, in focus"}</p></div><button aria-label="Close companion panel" onClick={() => setOpen(false)} className="rounded-md p-2 hover:bg-muted"><X className="size-4" /></button></header>

        <div className="space-y-4 p-4">

          <section aria-label="Quick actions"><p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Your next move</p><div className="grid grid-cols-2 gap-2">{actions.map(action => <Link key={action.href} href={action.href} onClick={() => setOpen(false)} className="flex items-center justify-between gap-1 rounded-xl border p-3 text-xs font-medium hover:bg-muted">{action.label}<ArrowUpRight className="size-3 shrink-0" /></Link>)}</div></section>

          <nav aria-label="Companion sections" className="flex gap-1 rounded-xl bg-muted/60 p-1">{([['inbox', `Inbox · ${unread}`], ['activity', `Activity · ${activityUnread}`], ['workday', 'Workday'], ['customize', 'Style']] as const).map(([value, label]) => <button key={value} aria-pressed={tab === value} onClick={() => setTab(value)} className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium ${tab === value ? "bg-background shadow-sm" : "text-muted-foreground"}`}>{label}</button>)}</nav>

          {tab !== "workday" && tab !== "customize" && <div className="flex gap-2"><input aria-label="Search companion notifications" placeholder="Search updates…" value={query} onChange={event => setQuery(event.target.value)} className="min-w-0 flex-1 rounded-lg border bg-background p-2 text-xs" /><select aria-label="Filter companion notifications" value={filter} onChange={event => setFilter(event.target.value as typeof filter)} className="rounded-lg border bg-background p-2 text-xs"><option value="all">All</option><option value="unread">Unread</option><option value="attention">Needs attention</option></select></div>}

          {tab === "inbox" && <section aria-label="ERP notification inbox" className="space-y-2">

            <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Saved ERP events · read and unread</span>{unread > 0 && <button disabled={pendingId !== null} onClick={() => void acknowledge("all")} className="text-primary">Mark all read</button>}</div>

            {snapshot.status === "loading" ? <p className="text-xs text-muted-foreground">Loading ERP updates…</p> : snapshot.status === "error" ? <div className="text-xs"><p>Updates are temporarily unavailable.</p><Button size="sm" variant="outline" onClick={() => snapshot.refresh?.()}>Retry</Button></div> : null}

            {shownNotices.map(item => <article key={item.id} className={`rounded-xl border p-3 ${item.readAt ? "bg-muted/20" : "border-primary/25 bg-primary/5"}`}><div className="flex items-start justify-between gap-2"><h3 className="text-xs font-semibold">{item.title}</h3><span className={`text-[10px] ${item.type === "error" ? "text-destructive" : "text-muted-foreground"}`}>{item.type} · {item.readAt ? "Read" : "New"}</span></div><p className="mt-1 break-words text-xs leading-5 text-muted-foreground">{item.message}</p><time dateTime={item.createdAt} className="text-[10px] text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</time><div className="mt-2 flex flex-wrap items-center justify-between gap-2">{companionHref(item.href) && <Link href={companionHref(item.href)!} onClick={() => setOpen(false)} className="text-xs font-medium text-primary underline underline-offset-4">Open record</Link>}{!item.readAt && <button disabled={pendingId !== null} onClick={() => void acknowledge(item.id)} className="ml-auto flex items-center gap-1 rounded p-1 text-xs hover:bg-muted disabled:opacity-50" aria-label={`Acknowledge ${item.title}`}><Check className="size-3" />Acknowledge</button>}{(allowedModules.includes("ALL") || allowedModules.includes("settings:manage")) && "eventKey" in item && typeof item.eventKey === "string" && item.eventKey.startsWith("marketplace-sync:") && (item.type === "error" || item.type === "warning") && <RetryMarketplaceSyncButton jobIds={[item.eventKey.slice("marketplace-sync:".length)]} label="Retry sync" />}</div></article>)}

            {snapshot.status === "ready" && !shownNotices.length && <p className="rounded-xl bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">{snapshot.items.length ? "No updates match this filter." : "No saved ERP events yet. New action feedback appears in Activity as you work."}</p>}

            {snapshot.hasMore && <Button size="sm" variant="outline" className="w-full" disabled={snapshot.loadingMore} onClick={() => snapshot.loadMore?.()}>{snapshot.loadingMore ? "Loading…" : "Load older notifications"}</Button>}

          </section>}

          {tab === "activity" && <section aria-label="ERP action activity" className="space-y-2"><div className="flex items-center justify-between gap-2 text-xs"><span className="text-muted-foreground">This enabled session · last 100 updates</span>{activityUnread > 0 && <button className="text-primary" onClick={() => acknowledgeFeedback()}>Mark all read</button>}</div>{shownActivity.map(item => <FeedbackCard key={item.id} item={item} acknowledge={acknowledgeFeedback} />)}{!shownActivity.length && <p className="rounded-xl bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">Your saves, confirmations, warnings and other action feedback appear here as you work.</p>}</section>}

          {tab === "workday" && <section className="space-y-4" aria-label="Workday tools"><div><h3 className="text-sm font-semibold">Daily business review</h3><p className="mt-1 text-xs text-muted-foreground">A personal checklist, marked by you. Resets each day on this browser.</p></div>{allActions.filter(item => ["/reports/missing-media", "/reports/receivables", "/reports/inventory-aging", "/marketplace-sync-history"].includes(item.href)).map(item => <div key={item.href} className="flex items-center gap-3 rounded-xl border p-3"><input type="checkbox" aria-label={`Reviewed ${item.label}`} checked={reviews.includes(item.href)} onChange={() => { const next = reviews.includes(item.href) ? reviews.filter(value => value !== item.href) : [...reviews, item.href]; setReviews(next); try { localStorage.setItem(reviewKey, JSON.stringify(next)); } catch { /* Local persistence optional. */ } }} /><Link href={item.href} onClick={() => setOpen(false)} className="text-xs hover:underline">{item.label}<ArrowUpRight className="ml-1 inline size-3" /></Link></div>)}<div><h3 className="mb-2 text-sm font-semibold">Pin your shortcuts</h3><div className="space-y-1">{allActions.map(item => <button key={item.href} onClick={() => void pin(item.href)} aria-pressed={prefs.pinned.includes(item.href)} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-xs hover:bg-muted">{item.label}<Pin className={`size-3 ${prefs.pinned.includes(item.href) ? "fill-primary text-primary" : "text-muted-foreground"}`} /></button>)}</div></div></section>}

          {tab === "customize" && <CompanionCustomization key={`${prefs.character}:${prefs.size}`} preferences={prefs} userId={userId} />}

          {error && <p role="alert" className="text-xs text-destructive">{error}</p>}

          {prefs.motivation && !sleeping && <p className="rounded-xl bg-primary/5 p-3 text-xs leading-5 text-muted-foreground">Every carefully documented gem makes the next decision easier.</p>}

          <footer className="flex items-center justify-between border-t pt-3"><Button variant="ghost" size="sm" onClick={() => setSnoozed(value => !value)}>{snoozed ? `Wake ${characterName}` : "Rest for now"}</Button><Link href="/settings/companion" onClick={() => setOpen(false)} className="flex items-center gap-1 text-xs text-muted-foreground"><Settings2 className="size-3" />Preferences</Link></footer>

        </div>

      </PopoverContent>

    </Popover>

    {!open && !sleeping && visible && (alert || greeting) && <div role="status" style={drag.alertStyle} className={`absolute ${top ? "top-full mt-2" : "bottom-full mb-2"} ${left ? "left-0" : "right-0"} w-[min(290px,calc(100vw-24px))] rounded-xl border bg-popover p-3 text-popover-foreground shadow-xl`} data-companion-alert><button onClick={() => { if (alert) setQueue(current => current.slice(1)); else setGreeting(false); }} aria-label="Dismiss companion alert" className="float-right -mr-1 -mt-1 p-1"><X className="size-3" /></button><div className="max-h-28 overflow-hidden text-xs font-medium">{alert?.title || "Welcome back. I’m Facet."}</div><div className="mt-1 line-clamp-3 text-xs text-muted-foreground">{alert?.message || "Your updates and business tools, always within reach."}</div>{alert && <button className="mt-2 text-xs font-medium text-primary underline" onClick={() => { setTab(alert.tab); setOpen(true); setFilter("all"); setQuery(""); }}>View {alert.tab === "inbox" ? "update" : "activity"}{queue.length > 1 ? ` · ${queue.length - 1} more` : ""}</button>}</div>}

  </div>;

}

