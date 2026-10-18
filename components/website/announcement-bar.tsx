"use client";
import { useEffect, useState } from "react";
import type { SiteSettings } from "@/lib/website/editorial/contract";
export type Announcement = SiteSettings["announcements"][number];
export function announcementState(a: Announcement, now = Date.now()) {
  if (!a.enabled) return "Disabled";
  if (a.startsAt && a.endsAt && Date.parse(a.endsAt) <= Date.parse(a.startsAt))
    return "Invalid schedule";
  if (a.startsAt && Date.parse(a.startsAt) > now) return "Scheduled";
  if (a.endsAt && Date.parse(a.endsAt) <= now) return "Expired";
  return "Live";
}
export function AnnouncementBar({
  announcements,
  interval = 8,
  animation = "fade",
  autoplay = true,
}: {
  announcements: Announcement[];
  interval?: number;
  animation?: "fade" | "slide" | "none";
  autoplay?: boolean;
}) {
  const [index, setIndex] = useState(0),
    [paused, setPaused] = useState(false),
    [interacting, setInteracting] = useState(false),
    [visible, setVisible] = useState(true),
    [reduced, setReduced] = useState(false);
  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(motion.matches);
    update();
    motion.addEventListener("change", update);
    const visibility = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      motion.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    if (
      !autoplay ||
      paused ||
      interacting ||
      reduced ||
      !visible ||
      announcements.length < 2
    )
      return;
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % announcements.length),
      Math.max(5, Math.min(30, interval)) * 1000,
    );
    return () => clearInterval(timer);
  }, [
    autoplay,
    paused,
    interacting,
    reduced,
    visible,
    announcements.length,
    interval,
  ]);
  const active = index % Math.max(1, announcements.length),
    a = announcements[active];
  if (!a) return null;
  const href = /^\/(?!\/)[a-zA-Z0-9/\-#?=&]*$/.test(a.href)
    ? a.href
    : "/gemstones";
  return (
    <aside
      aria-label="Website announcements"
      aria-roledescription={announcements.length > 1 ? "carousel" : undefined}
      className={`kg-announcement kg-announcement--${["brand", "gold", "neutral"].includes(a.tone) ? a.tone : "brand"}`}
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node))
          setInteracting(false);
      }}
    >
      <div
        className={`kg-announcement__message kg-announcement__${reduced ? "none" : animation}`}
        key={active}
        aria-live={paused || !autoplay ? "polite" : "off"}
      >
        {a.linkLabel ? (
          <>
            <span>{a.text}</span>
            <a href={href}>
              {a.linkLabel}
              <span aria-hidden="true"> →</span>
            </a>
          </>
        ) : (
          <a href={href}>{a.text}</a>
        )}
      </div>
      {announcements.length > 1 && (
        <div className="kg-announcement__controls">
          <button
            type="button"
            aria-label="Previous announcement"
            onClick={() =>
              setIndex(
                (i) => (i + announcements.length - 1) % announcements.length,
              )
            }
          >
            ‹
          </button>
          <span
            aria-label={`Announcement ${active + 1} of ${announcements.length}`}
          >
            {active + 1}/{announcements.length}
          </span>
          <button
            type="button"
            aria-label="Next announcement"
            onClick={() => setIndex((i) => (i + 1) % announcements.length)}
          >
            ›
          </button>
          {autoplay && !reduced && (
            <button
              type="button"
              aria-label={
                paused ? "Resume announcements" : "Pause announcements"
              }
              onClick={() => setPaused((p) => !p)}
            >
              {paused ? "▶" : "Ⅱ"}
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
