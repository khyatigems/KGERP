"use client";
import { useEffect, useRef, useState } from "react";
import {
  AnnouncementBar,
  announcementState,
  type Announcement,
} from "./announcement-bar";
import type { SiteSettings } from "@/lib/website/editorial/contract";
const localDate = (v: string) =>
  v
    ? new Date(Date.parse(v) - new Date(v).getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : "";
export function AnnouncementStudio({
  site,
  change,
  save,
  dirty,
}: {
  site: SiteSettings;
  change: (v: SiteSettings) => void;
  save: () => void;
  dirty: boolean;
}) {
  const [selected, select] = useState(0),
    [width, setWidth] = useState(768),
    [visitor, setVisitor] = useState(false),
    [time, setTime] = useState(() => localDate(new Date().toISOString()));
  const previewHost = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(1200);
  useEffect(() => {
    const element = previewHost.current;
    if (!element) return;
    const measure = () => {
      const css = getComputedStyle(element);
      setAvailableWidth(
        element.clientWidth -
          parseFloat(css.paddingLeft) -
          parseFloat(css.paddingRight),
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, []);
  const items = site.announcements,
    index = Math.min(selected, Math.max(0, items.length - 1)),
    current = items[index];
  const now = time ? Date.parse(time) : Date.now();
  function update(patch: Partial<Announcement>) {
    change({
      ...site,
      announcements: items.map((a, i) =>
        i === index ? { ...a, ...patch } : a,
      ),
    });
  }
  function add(
    text = "Explore our gemstone encyclopedia",
    href = "/gemstones",
    linkLabel = "Explore gemstones",
  ) {
    if (items.length >= 10) return;
    change({
      ...site,
      announcements: [
        ...items,
        {
          text,
          href,
          linkLabel,
          tone: "brand",
          enabled: false,
          startsAt: "",
          endsAt: "",
        },
      ],
    });
    select(items.length);
  }
  function move(direction: number) {
    const next = index + direction;
    if (next < 0 || next >= items.length) return;
    const ordered = [...items];
    [ordered[index], ordered[next]] = [ordered[next], ordered[index]];
    change({ ...site, announcements: ordered });
    select(next);
  }
  return (
    <section className="announcement-studio space-y-5">
      <div className="studio-section-heading">
        <div>
          <p className="studio-eyebrow">Website experience</p>
          <h2>Announcement studio</h2>
          <p>
            Create helpful notices, schedule their visibility and see how they
            look before saving.
          </p>
        </div>
        <button className="studio-primary" onClick={save}>
          Save announcements
        </button>
      </div>
      <div className="studio-toolbar">
        <span className="studio-chip">{items.length} / 10 notices</span>
        <span className="studio-chip">
          {dirty ? "Unsaved website changes" : "All website changes saved"}
        </span>
        <button onClick={() => add()} disabled={items.length >= 10}>
          Add announcement
        </button>
      </div>
      <div className="studio-panel studio-form-grid">
        <label className="studio-label">
          Seconds per announcement
          <input
            type="number"
            min={5}
            max={30}
            value={site.announcementInterval}
            onChange={(e) =>
              change({ ...site, announcementInterval: Number(e.target.value) })
            }
          />
        </label>
        <label className="studio-label">
          Transition
          <select
            value={site.announcementAnimation}
            onChange={(e) =>
              change({
                ...site,
                announcementAnimation: e.target
                  .value as SiteSettings["announcementAnimation"],
              })
            }
          >
            <option value="fade">Fade</option>
            <option value="slide">Slide</option>
            <option value="none">No animation</option>
          </select>
        </label>
        <label className="studio-switch">
          <input
            type="checkbox"
            checked={site.announcementAutoplay}
            onChange={(e) =>
              change({ ...site, announcementAutoplay: e.target.checked })
            }
          />
          Rotate announcements automatically
        </label>
        <p className="studio-help">
          Only one notice is shown at a time. Rotation pauses while hovered or
          focused, when the tab is hidden, or when the visitor requests reduced
          motion.
        </p>
      </div>
      <div className="studio-announcement-grid">
        <div className="studio-panel space-y-3">
          <h3>Your notices</h3>
          {!items.length && (
            <p>
              No announcements yet. Start with a template or create your own.
            </p>
          )}
          {items.map((a, i) => (
            <button
              key={i}
              className="studio-notice"
              aria-pressed={index === i}
              onClick={() => select(i)}
            >
              <span>{a.text || "Untitled announcement"}</span>
              <small>{announcementState(a, now)}</small>
            </button>
          ))}
          <h3>Quick templates</h3>
          <button onClick={() => add()} disabled={items.length >= 10}>
            Gemstone discovery
          </button>
          <button
            onClick={() =>
              add(
                "Discover your birthstone and its story",
                "/birthstones",
                "Find your birthstone",
              )
            }
            disabled={items.length >= 10}
          >
            Birthstone guide
          </button>
          <button
            onClick={() =>
              add(
                "Have a gemstone question? Our team can help.",
                "/contact",
                "Contact KhyatiGems",
              )
            }
            disabled={items.length >= 10}
          >
            Contact invitation
          </button>
        </div>
        <div className="studio-panel space-y-4">
          {current ? (
            <>
              <div className="studio-toolbar">
                <h3>Edit announcement</h3>
                <span className="studio-chip">
                  {announcementState(current, now)}
                </span>
              </div>
              <label className="studio-label">
                Message
                <textarea
                  rows={3}
                  maxLength={500}
                  value={current.text}
                  onChange={(e) => update({ text: e.target.value })}
                />
                <small>{current.text.length} / 500 characters</small>
              </label>
              <div className="studio-form-grid">
                <label className="studio-label">
                  Button label
                  <input
                    maxLength={60}
                    value={current.linkLabel}
                    onChange={(e) => update({ linkLabel: e.target.value })}
                  />
                  <small>Leave blank to link the whole message.</small>
                </label>
                <label className="studio-label">
                  Website path
                  <input
                    value={current.href}
                    onChange={(e) => update({ href: e.target.value })}
                  />
                  <small>Use an internal path, such as /birthstones.</small>
                </label>
              </div>
              <div className="studio-form-grid">
                <label className="studio-label">
                  Colour style
                  <select
                    value={current.tone}
                    onChange={(e) =>
                      update({ tone: e.target.value as Announcement["tone"] })
                    }
                  >
                    <option value="brand">Midnight blue</option>
                    <option value="gold">Soft gold</option>
                    <option value="neutral">Pearl grey</option>
                  </select>
                </label>
                <label className="studio-switch">
                  <input
                    type="checkbox"
                    checked={current.enabled}
                    onChange={(e) => update({ enabled: e.target.checked })}
                  />
                  Enable on website
                </label>
              </div>
              <div className="studio-form-grid">
                {(["startsAt", "endsAt"] as const).map((k) => (
                  <label className="studio-label" key={k}>
                    {k === "startsAt" ? "Starts at" : "Ends at"}
                    <input
                      type="datetime-local"
                      value={localDate(current[k])}
                      onChange={(e) =>
                        update({
                          [k]: e.target.value
                            ? new Date(e.target.value).toISOString()
                            : "",
                        })
                      }
                    />
                  </label>
                ))}
              </div>
              <p className="studio-help">
                Times use your device’s local timezone. Leave both empty for an
                ongoing notice. Disabled notices are never public.
              </p>
              {announcementState({ ...current, enabled: true }, now) ===
                "Invalid schedule" && (
                <p role="alert">
                  The end must be after the start. Correct the schedule before
                  saving.
                </p>
              )}
              <div className="studio-toolbar">
                <button onClick={() => move(-1)} disabled={index === 0}>
                  Move up
                </button>
                <button
                  onClick={() => move(1)}
                  disabled={index === items.length - 1}
                >
                  Move down
                </button>
                <button
                  disabled={items.length >= 10}
                  onClick={() => {
                    change({
                      ...site,
                      announcements: [...items, { ...current, enabled: false }],
                    });
                    select(items.length);
                  }}
                >
                  Duplicate
                </button>
                <button
                  className="studio-danger"
                  onClick={() =>
                    change({
                      ...site,
                      announcements: items.filter((_, i) => i !== index),
                    })
                  }
                >
                  Remove announcement
                </button>
              </div>
            </>
          ) : (
            <div className="studio-empty">
              <h3>A useful message, beautifully presented</h3>
              <p>
                Notices appear below the website navigation. New notices start
                disabled so you can prepare them first.
              </p>
              <button className="studio-primary" onClick={() => add()}>
                Create your first announcement
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="studio-panel space-y-4">
        <div className="studio-section-heading">
          <div>
            <h3>Live layout preview</h3>
            <p>
              Unsaved preview only. Saving changes the website settings; this
              preview does not publish articles.
            </p>
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
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="studio-toolbar">
          <label className="studio-switch">
            <input
              type="checkbox"
              checked={visitor}
              onChange={(e) => setVisitor(e.target.checked)}
            />
            Show visitor view at selected time
          </label>
          <label className="studio-label">
            Preview time
            <input
              type="datetime-local"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </label>
        </div>
        <div className="studio-preview-scroll" ref={previewHost}>
          <div
            className="studio-browser-preview"
            style={{ width, zoom: Math.min(1, availableWidth / width) }}
          >
            <div className="studio-browser-chrome">
              <i />
              <i />
              <i />
              <span>khyatigems.com · private preview</span>
            </div>
            <div className="studio-preview-nav">
              KHYATIGEMS <small>Gemstone Encyclopedia</small>
            </div>
            <div
              data-announcement-preview
              onClick={(event) => event.preventDefault()}
            >
              <AnnouncementBar
                interval={site.announcementInterval}
                animation={site.announcementAnimation}
                autoplay={site.announcementAutoplay}
                announcements={
                  visitor
                    ? items.filter((a) => announcementState(a, now) === "Live")
                    : current
                      ? [current]
                      : []
                }
              />
            </div>
            <div className="studio-preview-content">
              <h4>Discover the world of gemstones</h4>
              <p>
                {visitor &&
                !items.some((a) => announcementState(a, now) === "Live")
                  ? "No announcements would be visible at this time."
                  : "Your website content continues below the announcement bar."}
              </p>
            </div>
          </div>
        </div>
        <p className="studio-help">
          Preview layout: {width}px wide, scaled to fit this workspace.
        </p>
        {!visitor && current && (
          <p className="studio-help">
            Showing the selected draft, including when it is disabled or outside
            its schedule. Use visitor view to check actual visibility.
          </p>
        )}
      </div>
    </section>
  );
}
