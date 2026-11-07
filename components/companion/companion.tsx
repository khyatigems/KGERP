"use client";



import { KHYRA, khyraGreeting, khyraContextForPath } from "@/lib/khyra/identity";
import { khyraSavedDialogue, khyraFeedbackDialogue, khyraSafeFallback } from "@/lib/khyra/live";
import type { KhyraSeverity } from "@/lib/khyra/types";
import { useCompanionPresence, useActiveViewRead } from "./use-active-view-read";
import { KhyraSpeechBubble } from "./khyra-speech-bubble";
import { companionEventExpression, officialCompanionAssetsReady, type CompanionPose, type CompanionPoseContext } from "@/lib/companion-avatar";
import { reviewNotifications } from "@/lib/notification-review-client";
import { businessStoryKey } from "@/lib/business-event-identity";
import { companionInterruptionDelay, claimCompanionInterruptions } from "@/lib/companion-interruptions";
import { AttentionCards } from "./attention-cards";
import { NotificationHistory } from "@/components/notifications/notification-history";
import Link from "next/link";

import { usePathname } from "next/navigation";

import { isValidElement, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";

import { ArrowUpRight, Pin, Settings2, X } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { Button } from "@/components/ui/button";

import { canCompanionInterrupt, companionQuietHours, COMPANION_FEEDBACK_EVENT, COMPANION_PREFERENCES_EVENT, companionActions, type CompanionPreferences, type CompanionNotice } from "@/lib/companion";

import { acknowledgeCompanionNotice, companionNotificationStore } from "@/lib/companion-notification-store";

import { companionOperationMetadata, OPEN_COMPANION_EVENT, isMarketplaceSyncToast } from "@/lib/companion-runtime";

import { saveCompanionPreferences } from "@/app/(dashboard)/settings/companion/actions";


import { useCompanionFeedback, type CompanionFeedback } from "./use-companion-feedback";

import { useCompanionDrag } from "./use-companion-drag";

import { CompanionCustomization } from "./appearance-picker";



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

  const readRef = useActiveViewRead(String(item.id) + ":" + item.revision, !item.read && item.type !== "loading", () => acknowledge(item.id));
  const operation = companionOperationMetadata(item.id);
  const action = item.action;

  const cancel = item.cancel;

  return <article ref={readRef} className="facet-feedback rounded-2xl border border-primary/15 bg-primary/5 p-3" data-feedback-id={item.id}>

    <div className="mb-2 flex items-center justify-between gap-2 text-[10px] text-muted-foreground"><span className={item.type === "error" ? "text-destructive" : ""}>{item.type === "loading" ? "In progress" : item.type || "ERP activity"} · {item.read ? "Read" : "New"}</span><time dateTime={item.receivedAt}>{new Date(item.receivedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time></div>

    <div className="text-xs leading-5">{operation ? operation.title : item.jsx || content(item.title) || KHYRA.activityUpdated}</div>

    {item.description && <div className="mt-1 text-xs text-muted-foreground">{content(item.description)}</div>}

    {operation && item.jsx && <details className="mt-3 border-t border-primary/10 pt-2 text-xs"><summary className="cursor-pointer text-muted-foreground">Save details and completeness</summary><div className="mt-3 min-w-0">{item.jsx}</div></details>}

    <div className="mt-2 flex flex-wrap items-center gap-2">

      {isValidElement(action) ? action : action && typeof action === "object" && "label" in action ? <Button size="sm" variant="outline" onClick={action.onClick}>{action.label}</Button> : null}

      {isValidElement(cancel) ? cancel : cancel && typeof cancel === "object" && "label" in cancel ? <Button size="sm" variant="ghost" onClick={cancel.onClick}>{cancel.label}</Button> : null}

      {!item.read && <button className="ml-auto rounded px-2 py-1 text-xs hover:bg-muted" onClick={() => acknowledge(item.id)}>Mark as read</button>}

    </div>

  </article>;

}



type Alert = { eventId?: string; module?: string; severity?: KhyraSeverity; createdAt?: string; expression?: FacetState; feedbackId?: string | number; noticeId?: string; priority: number; key: string; title: ReactNode; message: ReactNode; tab: "inbox" | "activity" };

function noticeAlert(item: CompanionNotice): Alert {
  const dialogue = item.dialogue || khyraSavedDialogue(item);
  return { eventId: dialogue?.eventId, module: dialogue?.module, severity: dialogue?.severity, createdAt: item.createdAt,
    expression: dialogue ? dialogue.expression === "rest" ? "sleeping" : dialogue.expression : companionEventExpression(item.type),
    noticeId: item.id, priority: item.type === "error" ? 3 : item.type === "warning" ? 2 : 1,
    key: `event:${businessStoryKey(item.eventKey || item.id)}${item.snoozedUntil ? `:snoozed:${item.snoozedUntil}` : ""}`,
    title: khyraSafeFallback(item.title), message: dialogue?.friendly || khyraSafeFallback(item.message), tab: "inbox" };
}
function feedbackAlert(item: CompanionFeedback): Alert {
  const title = text(content(item.title)); const description = text(content(item.description));
  const dialogue = khyraFeedbackDialogue(item.type, title, description, item.eventKey);
  return { eventId: dialogue?.eventId, module: dialogue?.module, severity: dialogue?.severity, createdAt: item.receivedAt,
    expression: dialogue ? dialogue.expression === "rest" ? "sleeping" : dialogue.expression : companionEventExpression(item.type),
    feedbackId: item.id, priority: item.type === "error" ? 3 : item.type === "warning" ? 2 : 1, key: `event:${businessStoryKey(item.eventKey || String(item.id))}`,
    title: item.jsx && !title ? KHYRA.activityUpdated : khyraSafeFallback(title), message: item.jsx && !title ? KHYRA.activityDetails : dialogue?.friendly || (description ? khyraSafeFallback(description) : ""), tab: "activity" };
}
export function Companion({ preferences: prefs, allowedModules, userId }: { preferences: CompanionPreferences; allowedModules: string[]; userId: string }) {

  const present = useCompanionPresence();
  const pathname = usePathname();

  const characterName = KHYRA.name;
  const pageContext = khyraContextForPath(pathname);
  const framing = "adaptive" as const;
  const [previewPose, setPreviewPose] = useState<CompanionPose | null>(null);
  const [feedbackContext, setFeedbackContext] = useState<CompanionPoseContext>({});
  const [greetingText, setGreetingText] = useState<string>(KHYRA.introduction);
  const [greetingEventId, setGreetingEventId] = useState("general.introduction");

  const snapshot = useSyncExternalStore(companionNotificationStore.subscribe, companionNotificationStore.getSnapshot, companionNotificationStore.getServerSnapshot);


  const [open, setOpen] = useState(false);

  const [tab, setTab] = useState<"inbox" | "activity" | "workday" | "customize">("inbox");

  const [filter, setFilter] = useState<"all" | "unread" | "attention">("all");

  const [query, setQuery] = useState("");

  const [visible, setVisible] = useState(true);

  const [greeting, setGreeting] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);

  const [restUntil, setRestUntil] = useState(() => {
    try { return typeof window === "undefined" ? 0 : Number(localStorage.getItem(`facet:rest:${userId}`)) || 0; }
    catch { return 0; }
  });
  const [clock, setClock] = useState(Date.now());
  const snoozed = restUntil === -1 || restUntil > clock;
  const scheduledQuiet = companionQuietHours(prefs, new Date(clock));
  const feedbackVisible = open || (prefs.notifications && !prefs.quiet && !snoozed && !scheduledQuiet);
  const { history, acknowledge: acknowledgeFeedback } = useCompanionFeedback(userId, feedbackVisible);
  useEffect(() => {
    const read = () => { try { setRestUntil(Number(localStorage.getItem(`facet:rest:${userId}`)) || 0); } catch { /* Optional rest persistence. */ } };
    read();
    const storage = (event: StorageEvent) => { if (event.key === `facet:rest:${userId}`) read(); };
    window.addEventListener("storage", storage);
    return () => window.removeEventListener("storage", storage);
  }, [userId]);
  useEffect(() => {
    if (!prefs.quietHours.enabled && restUntil <= 0) return;
    const timer = window.setInterval(() => setClock(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, [prefs.quietHours.enabled, restUntil]);
  function rest(until: number) {
    setClock(Date.now()); setRestUntil(until); setGreeting(false); setQueue([]);
    try { localStorage.setItem(`facet:rest:${userId}`, String(until)); } catch { /* Optional rest persistence. */ }
  }

  const [feedback, setFeedback] = useState<FacetState>("idle");


  const [error, setError] = useState("");

  const [queue, setQueue] = useState<Alert[]>([]);

  const announced = useRef(new Set<string>());
  const currentAlertKeys = useRef(new Set<string>());
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const next = snapshot.items.map(item => Date.parse(item.snoozedUntil || "")).filter(time => time > Date.now()).sort((a, b) => a - b)[0];
    if (!next) return;
    const timer = window.setTimeout(() => setClock(Date.now()), Math.min(2147483647, Math.max(1, next - Date.now() + 50)));
    return () => window.clearTimeout(timer);
  }, [snapshot.items, clock]);

  const [reviews, setReviews] = useState<string[]>([]);

  const drag = useCompanionDrag(prefs, userId, setError);

  const reviewKey = `facet:review:${userId}:${new Date().toLocaleDateString("en-CA")}`;

  useEffect(() => { try { setReviews(JSON.parse(localStorage.getItem(reviewKey) || "[]")); } catch { setReviews([]); } }, [reviewKey]);

  useEffect(() => {

    try { announced.current = new Set(JSON.parse(sessionStorage.getItem(`facet:announced:${userId}`) || "[]")); } catch { /* Session storage optional. */ }

  }, [userId]);

  useEffect(() => {

    currentAlertKeys.current = new Set();
    if (open || !visible || !present || snoozed || scheduledQuiet || !prefs.notifications || prefs.quiet) return;
    const candidates: Alert[] = [

      ...snapshot.items.filter(item => !item.readAt && canCompanionInterrupt(prefs, item)).map(noticeAlert),
      ...history.filter(item => !item.read && item.type !== "loading" && (!item.jsx || !!item.type) && canCompanionInterrupt(prefs, item) && !isMarketplaceSyncToast(item.id, item.className)).map(feedbackAlert),

    ];

    currentAlertKeys.current = new Set(candidates.map(item => item.key));
    const fresh = candidates.sort((a, b) => b.priority - a.priority || Date.parse(b.createdAt || "") - Date.parse(a.createdAt || "")).filter((item, index, items) => !announced.current.has(item.key) && items.findIndex(other => other.key === item.key) === index);

    if (!fresh.length) return;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    void claimCompanionInterruptions(userId, fresh.map(item => item.key)).then(keys => {
      if (!mounted.current) return;
      const claimed = fresh.filter(item => keys.includes(item.key) && currentAlertKeys.current.has(item.key) && !announced.current.has(item.key));
      claimed.forEach(item => announced.current.add(item.key));
      if (!claimed.length) {
        const delay = companionInterruptionDelay(userId);
        if (delay > 0 && !cancelled) retry = setTimeout(() => setClock(Date.now()), delay + 50);
        return;
      }
      try { sessionStorage.setItem(`facet:announced:${userId}`, JSON.stringify([...announced.current].slice(-200))); } catch { /* Optional session deduplication. */ }
      setGreeting(false); setQueue(current => [...current, ...claimed].slice(0, 5));
    });
    return () => { cancelled = true; clearTimeout(retry); };
  }, [snapshot.items, history, prefs, snoozed, scheduledQuiet, open, visible, present, userId, clock]);

  useEffect(() => {

    if (open || prefs.quiet || snoozed || scheduledQuiet || !prefs.notifications) { setQueue(current => current.length ? [] : current); return; }

    if (!queue.length || !visible || !present) return;

    const timer = window.setTimeout(() => setQueue(current => current.slice(1)), 9000);

    return () => window.clearTimeout(timer);

  }, [queue, open, prefs.quiet, snoozed, scheduledQuiet, prefs.notifications, visible, present]);

  useEffect(() => {

    const openPanel = () => { setTab("inbox"); setOpen(true); setGreeting(false); };

    window.addEventListener(OPEN_COMPANION_EVENT, openPanel);

    return () => window.removeEventListener(OPEN_COMPANION_EVENT, openPanel);

  }, []);

  useEffect(() => {

    setGreeting(false);

    if (!prefs.greetings || prefs.quiet || snoozed || scheduledQuiet) return;

    let firstVisit = true;
    try { const key = `khyra:greeted:${userId}`; if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1"); firstVisit = !localStorage.getItem(`khyra:introduced:${userId}`); localStorage.setItem(`khyra:introduced:${userId}`, "1"); } catch { /* Storage optional. */ }
    const hour = new Date().getHours();
    setGreetingText(khyraGreeting(hour, firstVisit));
    setGreetingEventId(firstVisit ? "general.introduction" : hour >= 5 && hour < 12 ? "general.morning" : hour >= 12 && hour < 17 ? "general.afternoon" : hour >= 17 && hour < 23 ? "general.evening" : "general.returning");

    setGreeting(true); const timer = window.setTimeout(() => setGreeting(false), 6000);

    return () => window.clearTimeout(timer);

  }, [prefs.greetings, prefs.quiet, snoozed, scheduledQuiet, userId]);

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

      if (!["working", "thinking", "success", "happy", "warning", "concerned", "alert", "speaking"].includes(state)) return;
      const detail = (event as CustomEvent).detail;
      setFeedbackContext({ eventId: typeof detail?.eventId === "string" ? detail.eventId : undefined, module: typeof detail?.module === "string" ? detail.module : undefined });

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

  const sleeping = prefs.quiet || snoozed || scheduledQuiet;



  const busy = history.some(item => !item.read && item.type === "loading");

  const state: FacetState = sleeping ? "sleeping" : reviewLoading && open && tab === "workday" ? "thinking" : busy || feedback === "working" ? "working" : feedback !== "idle" ? feedback : queue.length && !open ? (officialCompanionAssetsReady ? queue[0].expression || "speaking" : "notification") : greeting ? "greeting" : snapshot.items.some(item => !item.readAt && (item.type === "warning" || item.type === "error")) ? "warning" : unread + activityUnread ? "notification" : officialCompanionAssetsReady && open ? "ready" : "idle";

  const top = drag.dock ? drag.bubbleBelow : prefs.position.startsWith("top");

  const left = drag.dock ? drag.dock.x < .5 : prefs.position.endsWith("left");

  async function pin(href: string) {

    const pinned = prefs.pinned.includes(href) ? prefs.pinned.filter(item => item !== href) : [...prefs.pinned, href].slice(-8);

    try { const result = await saveCompanionPreferences({ ...prefs, pinned }); if (result.error) throw new Error(); window.dispatchEvent(new CustomEvent(COMPANION_PREFERENCES_EVENT, { detail: { userId, preferences: result.preferences } })); }

    catch { setError("Shortcut could not be pinned. Please try again."); }

  }


  const shownActivity = history.filter(item => (filter !== "unread" || !item.read) && (filter !== "attention" || item.type === "warning" || item.type === "error") && `${text(content(item.title))} ${text(content(item.description))} ${item.jsx ? "ERP action updated" : ""}`.toLowerCase().includes(query.toLowerCase()));

  const progress = history.find(item => !item.read && item.type === "loading" && canCompanionInterrupt(prefs, item));
  const alert = progress && !sleeping ? feedbackAlert(progress) : queue[0];
  const poseContext: CompanionPoseContext = { ...((feedback !== "idle" && feedbackContext.module) ? feedbackContext : { eventId: alert?.eventId || (greeting ? greetingEventId : undefined), module: alert?.module || pageContext.module }), section: open ? tab : undefined, storyKey: alert?.key };
  const selectedPreview = open && tab === "customize" ? previewPose || undefined : undefined;

  return <div style={drag.style} className={`group/companion fixed z-40 ${top ? "top-20" : "bottom-[max(0.25rem,env(safe-area-inset-bottom))]"} ${left ? "left-3 lg:left-[18rem]" : "right-3 sm:right-6"} ${prefs.animations && !sleeping ? "companion-motion" : ""} ${!visible ? "companion-paused" : ""}`} data-companion-state={state}>



    <Popover open={open} onOpenChange={value => { setOpen(value); setGreeting(false); }}>

      <PopoverTrigger asChild><button {...drag.handlers} title="Click for tools · Drag to move · Arrow keys move Khyra" onContextMenu={event => { event.preventDefault(); setTab("customize"); setOpen(true); }} style={{ width: prefs.size, height: prefs.size }} data-companion-launcher aria-label={`Open Khyra companion, ${unread + activityUnread} unread updates`} className="relative flex items-center justify-center rounded-2xl touch-none cursor-grab active:cursor-grabbing bg-transparent p-0 drop-shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">

        <span className="block size-full" style={{ transform: prefs.flipped ? "scaleX(-1)" : undefined }}><Facet character={prefs.character} state={state} framing={framing} context={poseContext} pose={selectedPreview} /></span>{!sleeping && unread + activityUnread > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">{unread + activityUnread > 99 ? "99+" : unread + activityUnread}</span>}

      </button></PopoverTrigger>

      <PopoverContent collisionPadding={12} side={top ? "bottom" : "top"} align={left ? "start" : "end"} sideOffset={12} className="khyra-panel w-[min(400px,calc(100vw-24px))] overflow-y-auto rounded-2xl p-0 shadow-xl motion-reduce:animate-none" style={{ maxHeight: "min(640px, var(--radix-popover-content-available-height))" }} aria-label="Khyra ERP companion">

        <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-popover px-4 py-3"><div className="size-12"><span className="block size-full" style={{ transform: prefs.flipped ? "scaleX(-1)" : undefined }}><Facet character={prefs.character} state={state} framing={framing} context={poseContext} pose={selectedPreview} /></span></div><div className="flex-1"><h2 className="font-semibold">{characterName} {!officialCompanionAssetsReady && <span className="text-xs font-normal text-muted-foreground">· KhyatiGems</span>}</h2><p className="text-xs text-muted-foreground">{sleeping ? KHYRA.quiet : KHYRA.ready}</p></div><button aria-label="Close companion panel" onClick={() => setOpen(false)} className="rounded-md p-2 hover:bg-muted"><X className="size-4" /></button></header>

        <div className="space-y-4 p-4">
          {(!prefs.notifications || sleeping || prefs.severity === "attention") && <div role="note" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-5">{!prefs.notifications ? "Speech bubbles are turned off. ERP feedback still appears as a toast." : sleeping ? "Khyra is resting. Speech bubbles and live reactions resume when Rest or quiet hours end." : "Only warnings and errors interrupt you. Routine updates remain in Activity."} <Link href="/settings/companion" onClick={() => setOpen(false)} className="font-medium underline">Notification preferences</Link></div>}


          {tab !== "customize" && tab !== "activity" && <section aria-label="Quick actions"><p className="mb-3 text-xs leading-5 text-muted-foreground">{pageContext.message}</p><p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Your next move</p><div className="grid grid-cols-2 gap-2">{actions.map(action => <Link key={action.href} href={action.href} onClick={() => setOpen(false)} className="flex items-center justify-between gap-1 rounded-xl border p-3 text-xs font-medium hover:bg-muted">{action.label}<ArrowUpRight className="size-3 shrink-0" /></Link>)}</div></section>}

          <nav aria-label="Companion sections" className="flex gap-1 rounded-xl bg-muted/60 p-1">{([['inbox', `Inbox · ${unread}`], ['activity', `Activity · ${activityUnread}`], ['workday', 'Workday'], ['customize', 'Style']] as const).map(([value, label]) => <button key={value} aria-pressed={tab === value} onClick={event => { setTab(value); const panel = event.currentTarget.closest<HTMLElement>('[data-slot="popover-content"]'); if (panel) panel.scrollTop = 0; }} className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium ${tab === value ? "bg-background shadow-sm" : "text-muted-foreground"}`}>{label}</button>)}</nav>

          {tab === "activity" && <div className="flex gap-2"><input aria-label="Search companion notifications" placeholder="Search updates…" value={query} onChange={event => setQuery(event.target.value)} className="min-w-0 flex-1 rounded-lg border bg-background p-2 text-xs" /><select aria-label="Filter companion notifications" value={filter} onChange={event => setFilter(event.target.value as typeof filter)} className="rounded-lg border bg-background p-2 text-xs"><option value="all">All</option><option value="unread">Unread</option><option value="attention">Needs attention</option></select></div>}

          {tab === "inbox" && <NotificationHistory onOpenRecord={() => setOpen(false)} />}

          {tab === "activity" && <section aria-label="ERP action activity" className="space-y-2"><div className="flex items-center justify-between gap-2 text-xs"><span className="text-muted-foreground">This enabled session · last 100 updates</span>{activityUnread > 0 && <button className="text-primary" onClick={() => acknowledgeFeedback()}>Mark all read</button>}</div>{shownActivity.map(item => <FeedbackCard key={item.id} item={item} acknowledge={acknowledgeFeedback} />)}{!shownActivity.length && <p className="rounded-xl bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">Your saves, confirmations, warnings and other action feedback appear here as you work.</p>}</section>}

          {tab === "workday" && <section className="space-y-4" aria-label="Workday tools"><AttentionCards onOpen={() => setOpen(false)} onLoadingChange={setReviewLoading} motionEnabled={prefs.animations && !sleeping && visible} /><div><h3 className="text-sm font-semibold">Daily business review</h3><p className="mt-1 text-xs text-muted-foreground">A personal checklist, marked by you. Resets each day on this browser.</p></div>{allActions.filter(item => ["/reports/missing-media", "/reports/receivables", "/reports/inventory-aging", "/marketplace-sync-history"].includes(item.href)).map(item => <div key={item.href} className="flex items-center gap-3 rounded-xl border p-3"><input type="checkbox" aria-label={`Reviewed ${item.label}`} checked={reviews.includes(item.href)} onChange={() => { const next = reviews.includes(item.href) ? reviews.filter(value => value !== item.href) : [...reviews, item.href]; setReviews(next); try { localStorage.setItem(reviewKey, JSON.stringify(next)); } catch { /* Local persistence optional. */ } }} /><Link href={item.href} onClick={() => setOpen(false)} className="text-xs hover:underline">{item.label}<ArrowUpRight className="ml-1 inline size-3" /></Link></div>)}<div><h3 className="mb-2 text-sm font-semibold">Pin your shortcuts</h3><div className="space-y-1">{allActions.map(item => <button key={item.href} onClick={() => void pin(item.href)} aria-pressed={prefs.pinned.includes(item.href)} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-xs hover:bg-muted">{item.label}<Pin className={`size-3 ${prefs.pinned.includes(item.href) ? "fill-primary text-primary" : "text-muted-foreground"}`} /></button>)}</div></div></section>}

          {tab === "customize" && <CompanionCustomization key={`${prefs.character}:${prefs.size}:${prefs.framing}:${prefs.poseMode}`} preferences={prefs} userId={userId} motionEnabled={prefs.animations && !sleeping && visible} onPosePreview={setPreviewPose} />}

          {error && <p role="alert" className="text-xs text-destructive">{error}</p>}

          {prefs.motivation && !sleeping && <p className="rounded-xl bg-primary/5 p-3 text-xs leading-5 text-muted-foreground">{KHYRA.encouragement}</p>}

          <footer className="flex items-center justify-between border-t pt-3"><div className="flex gap-1">{snoozed ? <Button variant="ghost" size="sm" onClick={() => rest(0)}>Wake {characterName}</Button> : <select aria-label="Rest companion" value="" onChange={event => rest(event.target.value === "manual" ? -1 : Date.now() + Number(event.target.value) * 60000)} className="min-h-10 max-w-40 rounded-lg border bg-background px-2 text-xs"><option value="" disabled>Rest / snooze…</option><option value="15">Rest 15 minutes</option><option value="60">Rest 1 hour</option><option value="manual">Until I wake you</option></select>}</div><Link href="/settings/companion" onClick={() => setOpen(false)} className="flex items-center gap-1 text-xs text-muted-foreground"><Settings2 className="size-3" />Preferences</Link></footer>

        </div>

      </PopoverContent>

    </Popover>

    {!open && !sleeping && visible && (alert || greeting) && <KhyraSpeechBubble
      key={alert?.key || "greeting"} title={alert?.title || greetingText} message={alert ? alert.message : KHYRA.introductionDetail}
      state={state} severity={alert?.severity || "informational"} category={alert?.module ? alert.module.replaceAll("_", " ") : pageContext.label}
      createdAt={alert?.createdAt} intro={!alert} count={Math.max(0, queue.length - 1)}
      style={{ "--companion-size": `${prefs.size}px`, ...drag.alertStyle } as CSSProperties} side={top ? "below" : "above"} align={left ? "start" : "end"}
      readKey={!progress ? alert?.key : undefined}
      onRead={() => {
        if (alert?.noticeId) void reviewNotifications({ id: alert.noticeId, action: "read" }).then(() => acknowledgeCompanionNotice(alert.noticeId!)).catch(() => setError("Could not mark this update read. Please try again."));
        if (alert?.feedbackId !== undefined) acknowledgeFeedback(alert.feedbackId);
        history.filter(item => !item.read && item.type !== "loading" && `event:${businessStoryKey(item.eventKey || String(item.id))}` === alert?.key).forEach(item => acknowledgeFeedback(item.id));
      }}
      onDismiss={() => { if (progress) acknowledgeFeedback(progress.id); else if (alert) setQueue(current => current.slice(1)); else setGreeting(false); }}
      onReview={() => { if (alert?.noticeId) void reviewNotifications({ id: alert.noticeId }).catch(() => setError("Could not mark this notification read. Please try again.")); setTab(alert?.tab || "workday"); setOpen(true); setGreeting(false); setFilter("all"); setQuery(""); }}
      onSnooze={() => rest(Date.now() + 900000)}
    />}


  </div>;

}

