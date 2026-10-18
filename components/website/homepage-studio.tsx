"use client";
import { useEffect, useRef, useState } from "react";
import {
  homeSections,
  type Content,
  type ImageAsset,
  type SiteSettings,
  type PublicFeed,
} from "@/lib/website/editorial/contract";
import { privatePreviewHtml } from "./private-preview";
type Entry = {
  id: string;
  slug: string;
  kind: string;
  publishedAt: string | null;
  payload: Content;
};
const sections: Record<
  string,
  { title: string; description: string; image: string }
> = {
  discovery: {
    title: "Search & discovery",
    description: "Encyclopedia introduction and gemstone search",
    image: "/media/about-selection.webp",
  },
  about: {
    title: "Our story",
    description: "Company introduction and values",
    image: "/media/story.webp",
  },
  featured: {
    title: "Featured gemstones",
    description: "Up to six selected reference articles",
    image: "/media/hero-sapphire.webp",
  },
  learning: {
    title: "Certification & learning",
    description: "Documentation and report guidance",
    image: "/media/certification-brand.webp",
  },
  guides: {
    title: "Gemstone guides",
    description: "Selected educational guides",
    image: "/media/knowledge.webp",
  },
  help: {
    title: "Questions & contact",
    description: "Common questions and the enquiry form",
    image: "/media/contact-brand.webp",
  },
};
export function HomepageStudio({
  site,
  images,
  articles,
  change,
  save,
  openHero,
}: {
  site: SiteSettings;
  images: ImageAsset[];
  articles: Entry[];
  change: (site: SiteSettings) => void;
  save: () => void;
  openHero: () => void;
}) {
  const [base, setBase] = useState<{
      css: string;
      preview: { type: "homepage"; feed: PublicFeed };
    } | null>(null),
    [html, setHtml] = useState(""),
    [error, setError] = useState(""),
    [selected, setSelected] = useState(""),
    [width, setWidth] = useState(1200),
    [available, setAvailable] = useState(1200),
    [loading, setLoading] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null),
    host = useRef<HTMLDivElement>(null),
    initial = useRef(site);
  const patch = (value: Partial<SiteSettings>) => change({ ...site, ...value });
  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/website/editorial/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(initial.current),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setBase(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview unavailable");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const observer = new ResizeObserver(() =>
      setAvailable(element.clientWidth),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!base) return;
    const timer = setTimeout(() => {
      try {
        setHtml(
          privatePreviewHtml({
            ...base,
            preview: {
              type: "homepage",
              feed: {
                ...base.preview.feed,
                settings: site,
                homepageMedia: images.filter((a) =>
                  [
                    site.heroImageId,
                    site.heroVideoId,
                    site.brandImageId,
                    ...site.heroGalleryIds,
                    ...site.galleryImageIds,
                  ].includes(a.id),
                ),
              },
            },
          }),
        );
      } catch {
        setError("Unable to render this preview. Check your settings.");
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [base, site, images]);
  function focusSection() {
    const doc = frame.current?.contentDocument,
      win = frame.current?.contentWindow;
    if (!doc || !win) return;
    doc
      .querySelectorAll("[data-home-section]")
      .forEach((e) => ((e as HTMLElement).style.outline = ""));
    if (selected) {
      const element = doc.querySelector(
        `[data-home-section="${selected}"]`,
      ) as HTMLElement | null;
      if (element) {
        element.style.outline = "3px solid #b49655";
        element.style.outlineOffset = "-3px";
        win.scrollTo({
          top: element.getBoundingClientRect().top + win.scrollY,
          behavior: "instant",
        });
      }
    } else win.scrollTo(0, 0);
  }
  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    let observer: ResizeObserver | undefined;
    const loaded = () => {
      observer?.disconnect();
      focusSection();
      const body = element.contentDocument?.body;
      if (body) {
        observer = new ResizeObserver(focusSection);
        observer.observe(body);
      }
    };
    element.addEventListener("load", loaded);
    loaded();
    return () => {
      observer?.disconnect();
      element.removeEventListener("load", loaded);
    };
  }, [selected, html, width]);
  function move(key: string, direction: number) {
    const order = [...site.homepageSections],
      index = order.indexOf(key as (typeof order)[number]),
      next = index + direction;
    if (index < 0 || next < 0 || next >= order.length) return;
    [order[index], order[next]] = [order[next], order[index]];
    patch({ homepageSections: order });
    setSelected(key);
  }
  const published = articles.filter((a) => !!a.publishedAt);
  function picks(
    kind: "gemstones" | "guides",
    field: "featuredSlugs" | "featuredGuideSlugs",
  ) {
    const entries = published
      .filter((a) => a.kind === kind)
      .sort((a, b) => a.payload.title.localeCompare(b.payload.title));
    return (
      <div className="studio-panel space-y-4">
        <h3>
          Featured {kind === "gemstones" ? "gemstones" : "guides"} ·{" "}
          {site[field].length}/6
        </h3>
        <p className="studio-help">
          Choose up to six published entries. Six gemstone selections appear in
          two rows of three on desktop and adapt for smaller screens. Selection
          order is display order.
        </p>
        {!!site[field].filter((slug) => !entries.some((a) => a.slug === slug))
          .length && (
          <p role="alert">
            Some selections are not published and cannot appear publicly. Select
            published entries below.
          </p>
        )}
        <div className="studio-feature-picks">
          {entries.map((a) => {
            const image = images.find(
              (i) =>
                a.payload.imageIds.includes(i.id) && i.mediaType === "image",
            );
            return (
              <label key={a.id}>
                <input
                  type="checkbox"
                  checked={site[field].includes(a.slug)}
                  disabled={
                    !site[field].includes(a.slug) && site[field].length >= 6
                  }
                  onChange={(e) =>
                    patch({
                      [field]: e.target.checked
                        ? [...site[field], a.slug]
                        : site[field].filter((slug) => slug !== a.slug),
                    })
                  }
                />
                {image && (
                  <img
                    src={image.url}
                    alt=""
                    loading="lazy"
                    width={60}
                    height={45}
                  />
                )}
                <span>
                  {a.payload.title}
                  <small>Published</small>
                </span>
              </label>
            );
          })}
        </div>
        {!entries.length && (
          <p>
            No published entries are available. Publish reviewed articles in
            Articles first.
          </p>
        )}
        <button onClick={() => patch({ [field]: [] })}>
          Use automatic selection
        </button>
      </div>
    );
  }
  return (
    <section className="space-y-5">
      <div className="studio-section-heading">
        <div>
          <p className="studio-eyebrow">Website experience</p>
          <h2>Homepage designer</h2>
          <p>
            Move sections, choose featured content and preview your unsaved
            changes before saving.
          </p>
        </div>
        <button className="studio-primary" onClick={save}>
          Save homepage
        </button>
      </div>
      <div className="studio-home-designer">
        <div className="space-y-4">
          <div className="studio-panel space-y-3">
            <h3>Hero & navigation</h3>
            <p className="studio-help">
              Manage uploads, crops, slideshow images and video timing in Hero
              media.
            </p>
            <button onClick={openHero}>Open hero media studio</button>
            <button onClick={() => setSelected("")}>Preview top of page</button>
          </div>
          <div className="studio-panel space-y-3">
            <h3>Homepage sections</h3>
            <p className="studio-help">
              Click a section to scroll its preview into view. Use arrows to
              change its position.
            </p>
            {site.homepageSections.map((key, index) => (
              <div className="studio-section-card" key={key}>
                <button
                  aria-pressed={selected === key}
                  onClick={() => setSelected(key)}
                >
                  <img
                    src={sections[key].image}
                    alt=""
                    width={72}
                    height={48}
                  />
                  <span>
                    <strong>
                      {index + 1}. {sections[key].title}
                    </strong>
                    <small>{sections[key].description}</small>
                  </span>
                </button>
                <div className="studio-toolbar">
                  <button
                    aria-label={`Move ${sections[key].title} up`}
                    disabled={index === 0}
                    onClick={() => move(key, -1)}
                  >
                    ↑ Up
                  </button>
                  <button
                    aria-label={`Move ${sections[key].title} down`}
                    disabled={index === site.homepageSections.length - 1}
                    onClick={() => move(key, 1)}
                  >
                    ↓ Down
                  </button>
                  <button
                    onClick={() =>
                      patch({
                        homepageSections: site.homepageSections.filter(
                          (k) => k !== key,
                        ),
                      })
                    }
                  >
                    Hide
                  </button>
                </div>
              </div>
            ))}
            {homeSections
              .filter((k) => !site.homepageSections.includes(k))
              .map((key) => (
                <button
                  key={key}
                  onClick={() =>
                    patch({ homepageSections: [...site.homepageSections, key] })
                  }
                >
                  Add {sections[key].title}
                </button>
              ))}
          </div>
        </div>
        <div className="studio-panel studio-home-live space-y-4">
          <div className="studio-section-heading">
            <div>
              <h3>Live homepage preview</h3>
              <p>Private preview. Pending selected media can appear here.</p>
            </div>
            <button
              disabled={loading}
              onClick={() => {
                initial.current = site;
                void refresh();
              }}
            >
              Refresh homepage preview
            </button>
          </div>
          <div className="studio-toolbar">
            {[
              [390, "Mobile"],
              [768, "Tablet"],
              [1200, "Desktop"],
            ].map(([w, label]) => (
              <button
                key={w}
                aria-pressed={width === w}
                onClick={() => setWidth(Number(w))}
              >
                {label} preview
              </button>
            ))}
          </div>
          {error && <p role="alert">{error}</p>}
          {loading && !html && <p role="status">Preparing homepage preview…</p>}
          <div className="studio-home-preview-host" ref={host}>
            {html && (
              <iframe
                ref={frame}
                title="Live homepage designer preview"
                sandbox="allow-same-origin"
                srcDoc={html}
                onLoad={focusSection}
                style={{
                  width,
                  height: 850,
                  zoom: Math.min(1, available / width),
                  background: "white",
                  border: 0,
                }}
              />
            )}
          </div>
          <p className="studio-help">
            {width}px layout scaled to fit. Navigation and scripts are disabled;
            this preview does not publish articles or approve rights.
          </p>
        </div>
      </div>
      <div className="studio-panel space-y-4">
        <h3>Headline and homepage actions</h3>
        <div className="studio-form-grid">
          {(
            [
              ["heading", "Homepage headline"],
              ["introduction", "Homepage introduction"],
              ["heroPrimaryLabel", "Primary button label"],
              ["heroPrimaryPath", "Primary button path"],
              ["heroSecondaryLabel", "Secondary button label"],
              ["heroSecondaryPath", "Secondary button path"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="studio-label">
              {label}
              {key === "introduction" ? (
                <textarea
                  rows={3}
                  value={site[key]}
                  onChange={(e) => patch({ [key]: e.target.value })}
                />
              ) : (
                <input
                  value={site[key]}
                  onChange={(e) => patch({ [key]: e.target.value })}
                />
              )}
            </label>
          ))}
        </div>
      </div>
      {picks("gemstones", "featuredSlugs")}
      {picks("guides", "featuredGuideSlugs")}
    </section>
  );
}
