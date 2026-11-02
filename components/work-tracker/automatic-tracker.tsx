"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { currentWorkContext, routeWorkContext, workContextEvent } from "@/lib/work-tracker/browser-context";
import { createAutomaticTracking, type TrackingState } from "@/lib/work-tracker/automatic-tracking";

type State = TrackingState & { pause: () => void; retry: () => void };
const initial: TrackingState = { active: false, paused: false, context: null, pending: 0, error: "" };
const Tracking = createContext<State>({ ...initial, pause: () => {}, retry: () => {} });
export const useAutomaticTracking = () => useContext(Tracking);
let documentTrackerId = "";

export function AutomaticWorkTracker({ userId, children }: { userId: string; children: React.ReactNode }) {
  const path = usePathname(), search = useSearchParams().toString();
  const route = useRef("");
  const controller = useRef<ReturnType<typeof createAutomaticTracking> | null>(null);
  const [state, setState] = useState(initial);
  useEffect(() => {
    route.current = `${path}?${search}`;
    controller.current?.changeContext(currentWorkContext() || routeWorkContext(route.current));
  }, [path, search]);
  useEffect(() => {
    if (!userId) return;
    documentTrackerId ||= crypto.randomUUID();
    // Access can throw in restricted browser profiles. Let the controller retain
    // its error state instead of crashing the entire workspace provider.
    const storage = { get length() { return window.localStorage.length; }, key: (index: number) => window.localStorage.key(index), getItem: (key: string) => window.localStorage.getItem(key), setItem: (key: string, value: string) => window.localStorage.setItem(key, value) };
    const tracker = createAutomaticTracking({ userId, ownerId: documentTrackerId, domain: location.hostname, context: currentWorkContext() || routeWorkContext(route.current), storage, focused: () => !document.hidden && document.hasFocus(), onChange: setState, onSynced: () => window.dispatchEvent(new Event("khyati:work-synced")) });
    controller.current = tracker;
    let disposed = false, continuation: ReturnType<typeof setTimeout> | undefined;
    const sync = async () => { if (await tracker.sync() && !disposed) continuation = setTimeout(() => void sync(), 1000); };
    const interaction = () => tracker.interaction();
    const contextChanged = () => tracker.changeContext(currentWorkContext() || routeWorkContext(route.current));
    const visibility = () => { tracker.sample(); void sync(); };
    const blur = () => { tracker.sample(false); void sync(); };
    const storageChanged = (event: StorageEvent) => { if (event.key === `kg-work-paused:${userId}`) tracker.refreshPaused(); };
    const events = ["pointerdown", "pointermove", "keydown", "scroll"];
    events.forEach(event => window.addEventListener(event, interaction, { passive: true }));
    window.addEventListener(workContextEvent, contextChanged);
    window.addEventListener("focus", visibility); window.addEventListener("blur", blur);
    window.addEventListener("pagehide", blur); window.addEventListener("online", sync);
    window.addEventListener("storage", storageChanged);
    document.addEventListener("visibilitychange", visibility);
    const timer = setInterval(() => { tracker.sample(); void sync(); }, 20000);
    tracker.sample(); void sync();
    return () => {
      disposed = true; tracker.dispose(); controller.current = null; clearInterval(timer); clearTimeout(continuation);
      events.forEach(event => window.removeEventListener(event, interaction));
      window.removeEventListener(workContextEvent, contextChanged);
      window.removeEventListener("focus", visibility); window.removeEventListener("blur", blur);
      window.removeEventListener("pagehide", blur); window.removeEventListener("online", sync);
      window.removeEventListener("storage", storageChanged);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [userId]);
  return <Tracking.Provider value={{ ...state, pause: () => controller.current?.togglePaused(), retry: () => { void controller.current?.retry(); } }}>{children}</Tracking.Provider>;
}
