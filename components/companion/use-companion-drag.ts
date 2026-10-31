"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { saveCompanionPreferences } from "@/app/(dashboard)/settings/companion/actions";
import { COMPANION_PREFERENCES_EVENT, type CompanionPreferences } from "@/lib/companion";

export function useCompanionDrag(prefs: CompanionPreferences, userId: string, onError: (value: string) => void) {
  const diameter = prefs.size;
  const [dock, setDock] = useState(prefs.dock);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const currentPrefs = useRef(prefs);
  currentPrefs.current = prefs;
  const keyboardTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(keyboardTimer.current), []);
  const drag = useRef<{ x: number; y: number; left: number; top: number; dock: CompanionPreferences["dock"] } | null>(null);
  useEffect(() => { setDock(prefs.dock); }, [prefs.dock]);
  useEffect(() => {
    const resize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    resize(); window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  async function persist(next: CompanionPreferences["dock"]) {
    const preferences = { ...currentPrefs.current, dock: next };
    try {
      const result = await saveCompanionPreferences(preferences);
      if (result.error) throw new Error();
      window.dispatchEvent(new CustomEvent(COMPANION_PREFERENCES_EVENT, { detail: { userId, preferences } }));
    } catch { onError("Position changed for this visit, but could not be saved. Try moving Facet again."); }
  }
  const handlers = {
    onPointerDown(event: PointerEvent<HTMLButtonElement>) {
      if (event.button !== 0) return;
      const root = event.currentTarget.closest<HTMLElement>("[data-companion-state]")!;
      const rect = root.getBoundingClientRect();
      drag.current = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, dock };
      event.currentTarget.setPointerCapture(event.pointerId); event.preventDefault();
    },
    onPointerMove(event: PointerEvent<HTMLButtonElement>) {
      if (!drag.current) return;
      const left = Math.max(12, Math.min(window.innerWidth - diameter - 24, drag.current.left + event.clientX - drag.current.x));
      const top = Math.max(12, Math.min(window.innerHeight - diameter - 44, drag.current.top + event.clientY - drag.current.y));
      const next = { x: Math.max(0, Math.min(1, left / Math.max(1, window.innerWidth - diameter - 24))), y: Math.max(0, Math.min(1, top / Math.max(1, window.innerHeight - diameter - 44))) };
      drag.current.dock = next; setDock(next);
    },
    onPointerUp(event: PointerEvent<HTMLButtonElement>) {
      if (!drag.current) return;
      const next = drag.current.dock; drag.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId); void persist(next);
    },
    onPointerCancel() { drag.current = null; setDock(currentPrefs.current.dock); },
    onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
      const changes: Record<string, [number, number]> = { ArrowLeft: [-.04, 0], ArrowRight: [.04, 0], ArrowUp: [0, -.04], ArrowDown: [0, .04] };
      const delta = changes[event.key]; if (!delta) return;
      event.preventDefault();
      const rect = event.currentTarget.closest<HTMLElement>("[data-companion-state]")!.getBoundingClientRect();
      const base = dock ?? { x: rect.left / Math.max(1, window.innerWidth - diameter - 24), y: rect.top / Math.max(1, window.innerHeight - diameter - 44) };
      const next = { x: Math.max(0, Math.min(1, base.x + delta[0])), y: Math.max(0, Math.min(1, base.y + delta[1])) };
      setDock(next); clearTimeout(keyboardTimer.current); keyboardTimer.current = setTimeout(() => void persist(next), 400);
    },
  };
  const bubbleLeft = dock && viewport.width ? Math.max(12, Math.min(viewport.width - 302, dock.x * (viewport.width - diameter - 24) + (dock.x < .5 ? 0 : diameter - 290))) : 0;
  const alertStyle: CSSProperties | undefined = dock && viewport.width ? {
    "--bubble-tail": `${Math.max(22, Math.min(268, Math.max(12, dock.x * (viewport.width - diameter - 24)) + diameter / 2 - bubbleLeft))}px`,
    position: "fixed" as const,
    left: bubbleLeft,
    top: dock.y < .5 ? Math.max(12, dock.y * (viewport.height - diameter - 44)) + diameter + 38 : "auto",
    bottom: dock.y >= .5 ? viewport.height - Math.max(12, dock.y * (viewport.height - diameter - 44)) + 18 : "auto",
    margin: 0,
  } as CSSProperties : undefined;
  return { handlers, dock, alertStyle, style: dock && viewport.width ? { left: Math.max(12, dock.x * (viewport.width - diameter - 24)), top: Math.max(12, dock.y * (viewport.height - diameter - 44)), right: "auto", bottom: "auto" } : undefined };
}
