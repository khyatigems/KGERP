"use client";

import { useEffect, useRef } from "react";

export function GemCursor() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const trailRefs = useRef<(HTMLDivElement | null)[]>([]);
  const mouseRef = useRef({ x: -100, y: -100 });
  const isHoveringRef = useRef(false);
  const isActiveRef = useRef(false);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const existingStyle = document.getElementById("gem-cursor-style");
    if (!existingStyle) {
      const style = document.createElement("style");
      style.id = "gem-cursor-style";
      style.textContent = `html, body, *, *::before, *::after { cursor: none !important; }`;
      document.head.appendChild(style);
    }

    let visible = false;
    const trailHistory: Array<{ x: number; y: number }> = [];

    const tick = () => {
      const wrapper = wrapperRef.current;
      const inner = innerRef.current;
      if (wrapper) {
        if (visible) {
          wrapper.style.transform = `translate3d(${mouseRef.current.x - 14}px, ${mouseRef.current.y - 14}px, 0)`;
          wrapper.style.opacity = "1";
        } else {
          wrapper.style.opacity = "0";
        }
      }
      if (inner) {
        // Scale based on state without using CSS transitions (avoids the click-jump)
        const targetScale = isActiveRef.current ? 0.85 : isHoveringRef.current ? 1.3 : 1;
        inner.style.transform = `scale(${targetScale})`;
      }

      trailHistory.unshift({ x: mouseRef.current.x, y: mouseRef.current.y });
      if (trailHistory.length > 6) trailHistory.length = 6;
      for (let i = 0; i < trailHistory.length; i++) {
        const el = trailRefs.current[i];
        if (el) {
          const p = trailHistory[i];
          el.style.transform = `translate3d(${p.x - 3}px, ${p.y - 3}px, 0) scale(${1 - i * 0.15})`;
          el.style.opacity = String(Math.max(0, 0.35 - i * 0.06));
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    const onMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      if (!visible) visible = true;
    };
    const onEnter = () => { visible = true; };
    const onLeave = () => { visible = false; };

    const onDown = () => {
      isActiveRef.current = true;
    };
    const onUp = () => {
      isActiveRef.current = false;
    };

    const onOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target || !target.closest) {
        isHoveringRef.current = false;
        return;
      }
      const isInteractive = !!target.closest(
        "button, a, input, textarea, select, label, [role='button'], [role='link'], [data-cursor='pointer']"
      );
      isHoveringRef.current = isInteractive;
    };

    rafRef.current = requestAnimationFrame(tick);
    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseenter", onEnter);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("mouseup", onUp);
    document.addEventListener("mouseover", onOver, { passive: true });

    return () => {
      cancelAnimationFrame(rafRef.current);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseenter", onEnter);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("mouseover", onOver);
      const s = document.getElementById("gem-cursor-style");
      if (s) s.remove();
    };
  }, []);

  return (
    <>
      <div
        ref={wrapperRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999]"
        style={{ willChange: "transform, opacity", opacity: 0 }}
      >
        <div
          ref={innerRef}
          className="w-7 h-7"
          style={{ willChange: "transform" }}
        >
          <svg viewBox="0 0 32 32" className="w-full h-full drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]">
            <defs>
              <linearGradient id="gem-cursor-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a5b4fc" />
                <stop offset="50%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
              <linearGradient id="gem-cursor-shine" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="white" stopOpacity="0.9" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M16 2 L28 12 L16 30 L4 12 Z"
              fill="url(#gem-cursor-grad)"
              stroke="white"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            <path
              d="M16 2 L28 12 L16 18 L4 12 Z"
              fill="url(#gem-cursor-shine)"
              opacity="0.8"
            />
            <line x1="4" y1="12" x2="28" y2="12" stroke="white" strokeWidth="0.8" opacity="0.4" />
            <line x1="16" y1="2" x2="16" y2="30" stroke="white" strokeWidth="0.6" opacity="0.3" />
          </svg>
        </div>
      </div>
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          ref={(el) => {
            trailRefs.current[i] = el;
          }}
          className="fixed top-0 left-0 pointer-events-none z-[9998] w-1.5 h-1.5 rounded-full bg-indigo-400/60 mix-blend-screen"
          style={{ willChange: "transform, opacity" }}
        />
      ))}
    </>
  );
}
