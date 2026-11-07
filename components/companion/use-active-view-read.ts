"use client";

import { useEffect, useRef, useState } from "react";

export const COMPANION_READ_DWELL = 6000;
let lastInteraction = Date.now();
export function useCompanionPresence() {
  const [present, setPresent] = useState(true);
  useEffect(() => {
    let idle: ReturnType<typeof setTimeout> | undefined;
    const active = () => {
      lastInteraction = Date.now(); clearTimeout(idle);
      setPresent(document.visibilityState === "visible" && document.hasFocus());
      idle = setTimeout(() => setPresent(false), 60000);
    };
    const away = () => { clearTimeout(idle); setPresent(false); };
    const visibility = () => document.visibilityState === "visible" ? active() : away();
    const events = ["pointerdown", "pointermove", "keydown", "wheel", "focus"] as const;
    active(); events.forEach(event => window.addEventListener(event, active, { passive: true }));
    window.addEventListener("blur", away); document.addEventListener("visibilitychange", visibility);
    return () => { clearTimeout(idle); events.forEach(event => window.removeEventListener(event, active)); window.removeEventListener("blur", away); document.removeEventListener("visibilitychange", visibility); };
  }, []);
  return present;
}
/** Reading requires visible content, a focused tab and recent user activity. */
export function useActiveViewRead(key: string | undefined, enabled: boolean, onRead?: () => void) {
  const ref = useRef<HTMLElement | null>(null);
  const callback = useRef(onRead);
  useEffect(() => { callback.current = onRead; }, [onRead]);
  useEffect(() => {
    if (!key || !enabled || !ref.current || !callback.current) return;
    let inView = false, finished = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reset = () => { clearTimeout(timer); timer = undefined; };
    const schedule = () => {
      if (!inView || document.visibilityState !== "visible" || !document.hasFocus() || Date.now() - lastInteraction >= 60000) { reset(); return; }
      if (timer || finished) return;
      timer = setTimeout(() => {
        timer = undefined;
        if (!inView || document.visibilityState !== "visible" || !document.hasFocus() || Date.now() - lastInteraction >= 60000) return;
        finished = true; callback.current?.();
      }, COMPANION_READ_DWELL);
    };
    const active = () => { lastInteraction = Date.now(); schedule(); };
    const observer = new IntersectionObserver(entries => { inView = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .6); schedule(); }, { threshold: [0, .6] });
    observer.observe(ref.current);
    const events = ["pointerdown", "pointermove", "keydown", "wheel"] as const;
    events.forEach(event => window.addEventListener(event, active, { passive: true }));
    window.addEventListener("focus", active); window.addEventListener("blur", reset);
    document.addEventListener("visibilitychange", schedule);
    return () => { reset(); observer.disconnect(); events.forEach(event => window.removeEventListener(event, active)); window.removeEventListener("focus", active); window.removeEventListener("blur", reset); document.removeEventListener("visibilitychange", schedule); };
  }, [key, enabled]);
  return ref;
}
