"use client";
import { useEffect, useRef, useState } from "react";
import type { SiteSettings, ImageAsset } from "@/lib/website/editorial/contract";
type Slide = {
  type: "video" | "image";
  url: string;
  alt: string;
  eyebrow: string;
  title: string;
  emphasis: string;
  description: string;
  poster?: string;
  caption: string;
};
export function BrandHero({
  settings,
  image,
  video,
  gallery = [],
}: {
  settings: SiteSettings;
  image?: ImageAsset;
  video?: ImageAsset;
  gallery?: ImageAsset[];
}) {
  const heading = settings.heading.match(/^(.*?[.!?])\s+(.+)$/);
  const slides: Slide[] = [
    {
      type: "video",
      url: video?.url || "/media/khyatigems-brand-film.mp4",
      poster: video?.posterUrl || "/media/brand-film-poster.jpg",
      alt: video?.alt || "KhyatiGems brand presentation",
      eyebrow: "The KhyatiGems Gemstone Encyclopedia",
      title: heading?.[1] || settings.heading,
      emphasis: heading?.[2] || "",
      description: settings.introduction,
      caption: "KhyatiGems brand presentation",
    },
    {
      type: "image",
      url: image?.url || "/media/hero-sapphire.webp",
      alt:
        image?.alt || "Blue faceted gemstone in the KhyatiGems brand artwork",
      eyebrow: "Colour and natural character",
      title: "Every gemstone,",
      emphasis: "a story to explore.",
      description:
        "Explore gemstone properties, treatments and care. Discover the questions that help you understand an individual stone.",
      caption: image?.caption || "Illustrative brand artwork",
    },
    ...(gallery.length
      ? gallery.map((asset) => ({
          type: "image" as const,
          url: asset.url,
          alt: asset.alt,
          eyebrow: "From KhyatiGems",
          title: "Discover more.",
          emphasis: "Understand clearly.",
          description: settings.introduction,
          caption: asset.caption || asset.title,
        }))
      : [
          {
            type: "image" as const,
            url: "/media/hero-bracelets.webp",
            alt: "Gemstone bracelets and a gemstone tree in a KhyatiGems brand composition",
            eyebrow: "A considered place to begin",
            title: "Beautiful details.",
            emphasis: "Thoughtful questions.",
            description:
              "Learn about gemstone materials, the meaning of their names and the documentation that helps put their details in context.",
            caption: "Illustrative brand artwork",
          },
        ]),
  ];
  const [current, setCurrent] = useState(0),
    [paused, setPaused] = useState(false),
    [hovered, setHovered] = useState(false),
    [muted, setMuted] = useState(false);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  const player = useRef<HTMLVideoElement>(null);
  const next = () => setCurrent((index) => (index + 1) % slides.length);
  useEffect(() => {
    if (current === 0 && player.current && player.current.readyState >= 1)
      player.current.currentTime = Math.min(
        settings.heroVideoStart,
        Math.max(0, player.current.duration - 0.1),
      );
  }, [current, settings.heroVideoStart]);
  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const media = player.current;
    if (current !== 0 || paused || !visible || motion.matches) {
      media?.pause();
      return;
    }
    if (!media) return;
    let cancelled = false;
    void media.play().catch(async () => {
      if (cancelled) return;
      media.muted = true;
      setMuted(true);
      await media.play().catch(() => {});
    });
    return () => {
      cancelled = true;
      media.pause();
    };
  }, [current, paused, visible]);
  useEffect(() => {
    if (
      current === 0 ||
      paused ||
      !visible ||
      hovered ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const timer = setTimeout(() => {
      if (!document.hidden) next();
    }, settings.heroSlideSeconds * 1000);
    return () => clearTimeout(timer);
  }, [current, paused, hovered, visible, settings.heroSlideSeconds]);
  const slide = slides[current];
  return (
    <section
      className="brand-hero"
      aria-roledescription="carousel"
      aria-label="KhyatiGems introduction"
    >
      <div className="brand-hero-copy" key={current}>
        <p className="eyebrow">{slide.eyebrow}</p>
        <h1>
          {slide.title}
          {slide.emphasis && (
            <>
              <br />
              <i>{slide.emphasis}</i>
            </>
          )}
        </h1>
        <p className="brand-hero-intro">{slide.description}</p>
        <div className="home-actions">
          <a className="button" href={settings.heroPrimaryPath}>
            {settings.heroPrimaryLabel} →
          </a>
          <a className="text-link" href={settings.heroSecondaryPath}>
            {settings.heroSecondaryLabel} →
          </a>
        </div>
        {current === 0 && (
          <details className="hero-film-description">
            <summary>About the brand film</summary>
            <p>
              {video?.transcript ||
                "A visual introduction to the KhyatiGems brand, featuring gemstone examination scenes, selection, packaging and jewellery."}
            </p>
          </details>
        )}
        <a className="hero-search-link" href="/gemstones">
          Search the encyclopedia ↗
        </a>
      </div>
      <div
        className="brand-hero-art"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <video
          ref={player}
          className={current === 0 ? "brand-slide active" : "brand-slide"}
          aria-hidden={current !== 0}
          tabIndex={current === 0 ? 0 : -1}
          controls
          playsInline
          preload="metadata"
          poster={slides[0].poster}
          style={{
            objectPosition: `${settings.heroVideoPositionX}% ${settings.heroVideoPositionY}%`,
          }}
          onLoadedMetadata={(event) => {
            if (settings.heroVideoStart > 0)
              event.currentTarget.currentTime = Math.min(
                settings.heroVideoStart,
                Math.max(0, event.currentTarget.duration - 0.1),
              );
          }}
          onTimeUpdate={(event) => {
            if (
              current === 0 &&
              settings.heroVideoEnd > settings.heroVideoStart &&
              event.currentTarget.currentTime >= settings.heroVideoEnd
            ) {
              event.currentTarget.pause();
              next();
            }
          }}
          onEnded={next}
          onVolumeChange={(event) => setMuted(event.currentTarget.muted)}
          aria-label={slides[0].alt}
        >
          <source src={slides[0].url} type="video/mp4" />
          {video?.captionsVtt && (
            <track
              kind="captions"
              src={`/api/captions/${video.id}`}
              srcLang="en"
              label="English"
            />
          )}
        </video>
        {slides.slice(1).map((item, index) => (
          <img
            key={item.url}
            className={
              current === index + 1 ? "brand-slide active" : "brand-slide"
            }
            style={{
              objectPosition: `${settings.heroImagePositionX}% ${settings.heroImagePositionY}%`,
              transform: `scale(${settings.heroImageZoom})`,
            }}
            src={item.url}
            alt={item.alt}
            aria-hidden={current !== index + 1}
            width={1440}
            height={810}
          />
        ))}
        <div
          className="brand-hero-controls"
          onFocusCapture={() => setHovered(true)}
          onBlurCapture={() => setHovered(false)}
        >
          <div>
            <button
              type="button"
              aria-label="Previous hero slide"
              onClick={() =>
                setCurrent(
                  (index) => (index + slides.length - 1) % slides.length,
                )
              }
            >
              ←
            </button>
            {slides.map((item, index) => (
              <button
                key={index}
                type="button"
                className="brand-slide-dot"
                aria-label={`Show hero slide ${index + 1}`}
                aria-pressed={current === index}
                onClick={() => setCurrent(index)}
              />
            ))}
            <button type="button" aria-label="Next hero slide" onClick={next}>
              →
            </button>
            <button
              type="button"
              aria-pressed={paused}
              onClick={() => setPaused((value) => !value)}
            >
              {paused ? "Resume" : "Pause"}
            </button>
          </div>
          {current === 0 && (
            <button
              type="button"
              className="hero-sound"
              onClick={() => {
                const media = player.current;
                if (!media) return;
                media.muted = !media.muted;
                setPaused(false);
                setMuted(media.muted);
                void media.play().catch(() => {});
              }}
            >
              {muted ? "Enable sound" : "Mute video"}
            </button>
          )}
        </div>
        <p className="brand-media-note">{slide.caption}</p>
      </div>
    </section>
  );
}
