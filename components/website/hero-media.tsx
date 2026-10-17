"use client";
import { useEffect, useRef, useState } from "react";

type Slide = { url: string; alt: string; caption: string };
export function HeroSlideshow({ slides }: { slides: Slide[] }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    if (paused || hovered || motion.matches || slides.length < 2) return;
    const timer = setInterval(() => {
      if (!document.hidden && !motion.matches)
        setCurrent((index) => (index + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [paused, hovered, slides.length]);
  return (
    <div
      className="hero-slideshow"
      aria-label="KhyatiGems brand slideshow"
      aria-roledescription="carousel"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setHovered(false);
      }}
    >
      <figure>
        <img
          src={slides[current].url}
          alt={slides[current].alt}
          width={1440}
          height={810}
          fetchPriority="high"
        />
        <figcaption>{slides[current].caption}</figcaption>
      </figure>
      <div className="slideshow-controls">
        <button
          type="button"
          onClick={() =>
            setCurrent((index) => (index + slides.length - 1) % slides.length)
          }
          aria-label="Previous hero image"
        >
          ←
        </button>
        {slides.map((slide, index) => (
          <button
            key={slide.url}
            type="button"
            className="slide-dot"
            aria-label={`Show hero image ${index + 1}`}
            aria-pressed={current === index}
            onClick={() => setCurrent(index)}
          />
        ))}
        <button
          type="button"
          onClick={() => setCurrent((index) => (index + 1) % slides.length)}
          aria-label="Next hero image"
        >
          →
        </button>
        <button
          type="button"
          onClick={() => setPaused((value) => !value)}
          aria-pressed={paused}
        >
          {paused ? "Resume" : "Pause"}
        </button>
      </div>
    </div>
  );
}

export function AutoplayFilm({
  src,
  poster,
  captions,
}: {
  src: string;
  poster: string;
  captions?: string;
}) {
  const player = useRef<HTMLVideoElement>(null);
  const [soundBlocked, setSoundBlocked] = useState(false);
  useEffect(() => {
    const video = player.current;
    if (!video || matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    let cancelled = false;
    video.muted = false;
    void video.play().catch(async () => {
      if (cancelled) return;
      video.muted = true;
      setSoundBlocked(true);
      await video.play().catch(() => {});
    });
    return () => {
      cancelled = true;
      video.pause();
    };
  }, [src]);
  return (
    <div className="brand-film-player">
      <video
        ref={player}
        controls
        playsInline
        loop
        preload="metadata"
        poster={poster}
        aria-label="KhyatiGems brand presentation"
      >
        <source src={src} type="video/mp4" />
        {captions && (
          <track kind="captions" src={captions} srcLang="en" label="English" />
        )}
        Your browser does not support this video.
      </video>
      {soundBlocked && (
        <button
          className="secondary"
          type="button"
          onClick={() => {
            const video = player.current;
            if (video) {
              video.muted = false;
              void video
                .play()
                .then(() => setSoundBlocked(false))
                .catch(() => {
                  video.muted = true;
                });
            }
          }}
        >
          Enable sound
        </button>
      )}
    </div>
  );
}
