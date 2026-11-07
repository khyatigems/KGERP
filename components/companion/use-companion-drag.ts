"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { saveCompanionPreferences } from "@/app/(dashboard)/settings/companion/actions";
import { COMPANION_PREFERENCES_EVENT, type CompanionPreferences } from "@/lib/companion";
import { COMPANION_BUBBLE_WIDTH } from "@/lib/companion-layout";

export function useCompanionDrag(prefs: CompanionPreferences, userId: string, onError: (value: string) => void) {
  const diameter = prefs.size;
  const moved = useRef(false);
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
    } catch { onError("Position changed for this visit, but could not be saved. Try moving Khyra again."); }
  }
  const handlers = {
    onClickCapture(event: React.MouseEvent<HTMLButtonElement>) { if (moved.current) { event.preventDefault(); event.stopPropagation(); moved.current = false; } },
    onPointerDown(event: PointerEvent<HTMLButtonElement>) {
      if (event.button !== 0) return;
      moved.current = false;
      const root = event.currentTarget.closest<HTMLElement>("[data-companion-state]")!;
      const rect = root.getBoundingClientRect();
      drag.current = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, dock };
      event.currentTarget.setPointerCapture(event.pointerId); event.preventDefault();
    },
    onPointerMove(event: PointerEvent<HTMLButtonElement>) {
      if (!drag.current) return;
      if (!moved.current && Math.hypot(event.clientX - drag.current.x, event.clientY - drag.current.y) < 5) return;
      moved.current = true;
      const left = Math.max(4, Math.min(window.innerWidth - diameter - 4, drag.current.left + event.clientX - drag.current.x));
      const top = Math.max(4, Math.min(window.innerHeight - diameter - 4, drag.current.top + event.clientY - drag.current.y));
      const next = { x: Math.max(0, Math.min(1, left / Math.max(1, window.innerWidth - diameter - 4))), y: Math.max(0, Math.min(1, top / Math.max(1, window.innerHeight - diameter - 4))) };
      drag.current.dock = next; setDock(next);
    },
    onPointerUp(event: PointerEvent<HTMLButtonElement>) {
      if (!drag.current) return;
      const next = drag.current.dock; drag.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId); if (moved.current) void persist(next);
    },
    onPointerCancel() { drag.current = null; setDock(currentPrefs.current.dock); },
    onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
      const changes: Record<string, [number, number]> = { ArrowLeft: [-.04, 0], ArrowRight: [.04, 0], ArrowUp: [0, -.04], ArrowDown: [0, .04] };
      const delta = changes[event.key]; if (!delta) return;
      event.preventDefault();
      const rect = event.currentTarget.closest<HTMLElement>("[data-companion-state]")!.getBoundingClientRect();
      const base = dock ?? { x: rect.left / Math.max(1, window.innerWidth - diameter - 4), y: rect.top / Math.max(1, window.innerHeight - diameter - 4) };
      const next = { x: Math.max(0, Math.min(1, base.x + delta[0])), y: Math.max(0, Math.min(1, base.y + delta[1])) };
      setDock(next); clearTimeout(keyboardTimer.current); keyboardTimer.current = setTimeout(() => void persist(next), 400);
    },
  };
  const bubbleWidth = Math.min(COMPANION_BUBBLE_WIDTH, viewport.width - 24);
  const dockTop = dock ? Math.max(4, dock.y * (viewport.height - diameter - 4)) : 0;
  const aboveSpace = dockTop - 30;
  const belowSpace = viewport.height - dockTop - diameter - 50;
  const bubbleBelow = belowSpace > aboveSpace;
  const bubbleLeft = dock && viewport.width ? Math.max(12, Math.min(viewport.width - bubbleWidth - 12, dock.x * (viewport.width - diameter - 4) + (dock.x < .5 ? 0 : diameter - bubbleWidth))) : 0;
  const alertStyle: CSSProperties | undefined = dock && viewport.width ? {
    "--bubble-tail": `${Math.max(22, Math.min(bubbleWidth - 22, Math.max(12, dock.x * (viewport.width - diameter - 4)) + diameter / 2 - bubbleLeft))}px`,
    "--bubble-max-height": `${Math.max(170, bubbleBelow ? belowSpace : aboveSpace)}px`,
    position: "fixed" as const,
    left: bubbleLeft,
    top: bubbleBelow ? dockTop + diameter + 38 : "auto",
    bottom: !bubbleBelow ? viewport.height - dockTop + 18 : "auto",
    margin: 0,
  } as CSSProperties : undefined;
  return { handlers, dock, bubbleBelow, alertStyle, style: dock && viewport.width ? { left: Math.max(4, dock.x * (viewport.width - diameter - 4)), top: Math.max(4, dock.y * (viewport.height - diameter - 4)), right: "auto", bottom: "auto" } : undefined };
}
