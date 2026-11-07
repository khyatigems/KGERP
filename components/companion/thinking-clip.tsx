"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { companionThinkingVideo } from "@/lib/companion-avatar";
import { useReducedMotion } from "@/lib/use-reduced-motion";

const subscribeVisibility = (listener: () => void) => { document.addEventListener("visibilitychange", listener); return () => document.removeEventListener("visibilitychange", listener); };
const getVisible = () => document.visibilityState === "visible";

/** Supplied MP4 has a background: keep it in a framed card, never fake transparency. */
export function ThinkingClip({ active, motionEnabled = true }: { active: boolean; motionEnabled?: boolean }) {
  const reducedMotion = useReducedMotion();
  const visible = useSyncExternalStore(subscribeVisibility, getVisible, () => false);
  const container = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [onScreen, setOnScreen] = useState(false);
  const [failed, setFailed] = useState(false);
  const playing = active && motionEnabled && !reducedMotion && visible && onScreen && !failed;
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    const observer = new IntersectionObserver(entries => setOnScreen(entries.some(entry => entry.isIntersecting)), { threshold: .1 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const player = video.current;
    if (!player || !playing) return;
    let cancelled = false;
    void player.play().catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; player.pause(); };
  }, [playing]);
  if (!companionThinkingVideo) return null;
  return <div ref={container} className="facet-thinking-clip" data-thinking-active={playing ? "true" : "false"}>
    {playing ? <video ref={video} src={companionThinkingVideo.src} poster={companionThinkingVideo.poster} width={360} height={640} muted playsInline loop preload="none" aria-hidden="true" tabIndex={-1} disablePictureInPicture onError={() => setFailed(true)} /> :
      // eslint-disable-next-line @next/next/no-img-element
      <img src={companionThinkingVideo.poster} width={256} height={456} alt="" aria-hidden="true" loading="lazy" />}
  </div>;
}
