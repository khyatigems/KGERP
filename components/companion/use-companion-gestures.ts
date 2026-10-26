"use client";

import { useEffect, useRef, useState } from "react";

export const COMPANION_REST_DELAY = 60_000;

/** User inactivity is local UI state, never a claim about business/job status. */
export function useCompanionGestures(wakeSignal: string, disabled: boolean) {
  const [resting, setResting] = useState(false);
  const [reaction, setReaction] = useState<"happy" | "wink" | null>(null);
  const [mode, setMode] = useState({ wakeSignal, disabled });
  if (mode.wakeSignal !== wakeSignal || mode.disabled !== disabled) {
    setMode({ wakeSignal, disabled });
    setResting(false);
    setReaction(null);
  }
  const restRef = useRef(false);
  const lastActive = useRef(0);
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hovered = useRef(false);
  const turn = useRef(0);
  useEffect(() => {
    if (disabled) return;
    lastActive.current = Date.now(); restRef.current = false; hovered.current = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const active = () => {
      lastActive.current = Date.now();
      if (restRef.current) { restRef.current = false; setResting(false); }
      if (timer === undefined) timer = setTimeout(check, COMPANION_REST_DELAY);
    };
    const check = () => {
      timer = undefined;
      const remaining = COMPANION_REST_DELAY - (Date.now() - lastActive.current);
      if (remaining <= 0 && !hovered.current) { restRef.current = true; setResting(true); return; }
      timer = setTimeout(check, Math.max(1000, remaining > 0 ? remaining : COMPANION_REST_DELAY));
    };
    timer = setTimeout(check, COMPANION_REST_DELAY);
    const events = ["pointerdown", "pointermove", "keydown", "scroll"] as const;
    events.forEach(event => window.addEventListener(event, active, { passive: true }));
    return () => { clearTimeout(timer); clearTimeout(reactionTimer.current); events.forEach(event => window.removeEventListener(event, active)); };
  }, [disabled, wakeSignal]);
  useEffect(() => () => clearTimeout(reactionTimer.current), []);
  function greet() {
    if (disabled) return;
    hovered.current = true; lastActive.current = Date.now(); restRef.current = false; setResting(false);
    clearTimeout(reactionTimer.current);
    setReaction(turn.current++ % 2 ? "wink" : "happy");
    // A short wink follows the welcome smile; avoid a continuous reaction loop.
    reactionTimer.current = setTimeout(() => {
      if (!hovered.current) return;
      setReaction("wink");
      reactionTimer.current = setTimeout(() => { setReaction(null); hovered.current = false; }, 1500);
    }, 800);
  }
  function leave() {
    hovered.current = false; clearTimeout(reactionTimer.current); setReaction(null);
    lastActive.current = Date.now();
  }
  return { resting, reaction, handlers: { onPointerEnter: greet, onPointerLeave: leave, onFocus: greet, onBlur: leave } };
}
