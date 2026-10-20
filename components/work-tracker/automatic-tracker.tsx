"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { currentWorkContext, routeWorkContext, workContextEvent, type WorkContext } from "@/lib/work-tracker/browser-context";

type Interval = { id: string; platform: string; activityType: string; domain: string; eventType: "ACTIVE"; startedAt: string; occurredAt: string; classificationOverride: boolean; inventoryId?: string | null; marketplaceShopId?: string | null; listingRecordId?: string | null };
type State = { active: boolean; paused: boolean; context: WorkContext | null; pending: number; error: string; pause: () => void };
const Tracking = createContext<State>({ active: false, paused: false, context: null, pending: 0, error: "", pause: () => {} });
export const useAutomaticTracking = () => useContext(Tracking);
const IDLE = 300000, BUFFER = IDLE + 90000;
let documentTrackerId = "";

export function AutomaticWorkTracker({ userId, children }: { userId: string; children: React.ReactNode }) {
  const path = usePathname();
  const search = useSearchParams().toString();
  const [paused, setPaused] = useState(false);
  const [state, setState] = useState({ active: false, context: null as WorkContext | null, pending: 0, error: "" });
  useEffect(() => {
    if (!userId) return;
    documentTrackerId ||= crypto.randomUUID();
    const prefix = `kg-work-intervals:${userId}:`;
    const storageKey = `${prefix}${documentTrackerId}`;
    let queue: Interval[] = []; let failedStorage = false;
    try { queue = JSON.parse(localStorage.getItem(storageKey) || "[]"); if (!Array.isArray(queue)) queue = []; } catch { queue = []; }
    // Stored timestamps are not resumed: reopening ERP never bridges downtime.
    let previous: { at: number; context: WorkContext } | null = null;
    let lastInteraction = Date.now(), sending = false, disposed = false, lastError = "", retryAt = 0;
    const route = `${path}?${search}`;
    let context = currentWorkContext() || routeWorkContext(route);
    const persist = () => { try { localStorage.setItem(storageKey, JSON.stringify(queue)); } catch { failedStorage = true; lastError = "Local storage is full. Tracking paused to protect pending records."; } };
    const eligible = () => !paused && !failedStorage && !document.hidden && document.hasFocus() && Date.now() - lastInteraction < IDLE && queue.length < 10000;
    const update = () => { if (!disposed) setState({ active: eligible(), context, pending: queue.length, error: lastError }); };
    const sample = () => {
      const now = Date.now();
      if (previous && now > previous.at && now - previous.at <= 90000) {
        const c = previous.context;
        queue.push({ id: crypto.randomUUID(), platform: c.platform, activityType: c.activityType, domain: location.hostname, eventType: "ACTIVE", startedAt: new Date(previous.at).toISOString(), occurredAt: new Date(now).toISOString(), classificationOverride: c.platform !== "ERP", inventoryId: c.inventoryId, marketplaceShopId: c.marketplaceShopId, listingRecordId: c.listingRecordId });
      }
      if (now - lastInteraction >= IDLE) queue = queue.flatMap(e => {
        const end = Math.min(+new Date(e.occurredAt), lastInteraction);
        return end > +new Date(e.startedAt) ? [{ ...e, occurredAt: new Date(end).toISOString() }] : [];
      });
      previous = eligible() ? { at: now, context } : null;
      persist(); update();
    };
    const sync = async () => {
      if (sending || disposed || Date.now() < retryAt) return;
      // Each tab owns its storage key. Recover old-tab queues as well; UUID
      // ingestion tolerates two tabs retrying an orphan queue simultaneously.
      const storedQueues = new Map<string, Interval[]>();
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i); if (!key?.startsWith(prefix)) continue;
        try { const records = JSON.parse(localStorage.getItem(key) || "[]"); if (Array.isArray(records)) storedQueues.set(key, records); } catch { /* Ignore a damaged key; never upload another user's records. */ }
      }
      storedQueues.set(storageKey, queue);
      const unique = new Map([...storedQueues.values()].flat().map(e => [e.id, e]));
      const batch = [...unique.values()].filter(e => +new Date(e.occurredAt) <= Date.now() - BUFFER).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt)).slice(0, 50);
      if (!batch.length) return;
      if (batch.some(e => +new Date(e.occurredAt) < Date.now() - 7 * 86400000)) { lastError = "Some pending records are over seven days old. Review local tracking storage before continuing."; update(); return; }
      sending = true;
      try {
        const response = await fetch("/api/work-tracker/erp-events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ events: batch }), signal: AbortSignal.timeout(15000) });
        const result = await response.json();
        if (!response.ok || !Array.isArray(result.accepted)) throw new Error(result.error || "Unable to synchronize ERP tracking");
        // A route/context change may have mounted a new tracker while this request was pending.
        for (const key of storedQueues.keys()) {
          const stored: Interval[] = JSON.parse(localStorage.getItem(key) || "[]");
          localStorage.setItem(key, JSON.stringify(stored.filter(e => !result.accepted.includes(e.id))));
        }
        if (!disposed) { queue = queue.filter(e => !result.accepted.includes(e.id)); lastError = ""; persist(); }
      } catch (error) { lastError = error instanceof Error ? error.message : "Unable to synchronize ERP tracking"; retryAt = Date.now() + 60000; }
      finally { sending = false; update(); }
    };
    const interaction = () => {
      const now = Date.now();
      if (now - lastInteraction >= IDLE) sample();
      lastInteraction = now;
      if (!previous && eligible()) { previous = { at: now, context }; update(); }
    };
    const contextChanged = () => { sample(); context = currentWorkContext() || routeWorkContext(route); if (previous) previous.context = context; update(); };
    const visibility = () => { sample(); void sync(); };
    const events = ["pointerdown", "pointermove", "keydown", "scroll"];
    events.forEach(event => window.addEventListener(event, interaction, { passive: true }));
    window.addEventListener(workContextEvent, contextChanged);
    window.addEventListener("focus", visibility); window.addEventListener("blur", visibility);
    document.addEventListener("visibilitychange", visibility);
    const timer = setInterval(() => { sample(); void sync(); }, 20000);
    sample(); void sync();
    return () => { sample(); disposed = true; clearInterval(timer); events.forEach(event => window.removeEventListener(event, interaction)); window.removeEventListener(workContextEvent, contextChanged); window.removeEventListener("focus", visibility); window.removeEventListener("blur", visibility); document.removeEventListener("visibilitychange", visibility); };
  }, [userId, path, search, paused]);
  return <Tracking.Provider value={{ ...state, paused, pause: () => setPaused(value => !value) }}>{children}</Tracking.Provider>;
}
