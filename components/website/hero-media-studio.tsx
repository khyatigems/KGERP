"use client";
import { useState } from "react";
import type {
  ImageAsset,
  SiteSettings,
} from "@/lib/website/editorial/contract";
export function HeroMediaStudio({
  site,
  images,
  change,
  save,
  upload,
  review,
}: {
  site: SiteSettings;
  images: ImageAsset[];
  change: (site: SiteSettings) => void;
  save: () => void;
  upload: (file: File) => Promise<ImageAsset | undefined>;
  review: (asset: ImageAsset) => void;
}) {
  const [device, setDevice] = useState("desktop"),
    [slot, setSlot] = useState<"image" | "video">("image"),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState("");
  const assets = images.filter((a) => a.status !== "archived"),
    image = assets.find((a) => a.id === site.heroImageId),
    video = assets.find((a) => a.id === site.heroVideoId);
  const patch = (value: Partial<SiteSettings>) => change({ ...site, ...value });
  const range = (
    key:
      | "heroImagePositionX"
      | "heroImagePositionY"
      | "heroImageZoom"
      | "heroVideoPositionX"
      | "heroVideoPositionY",
    label: string,
    max = 100,
    min = 0,
    step = 1,
  ) => (
    <label className="studio-label" key={key}>
      {label} · {site[key]}
      {key === "heroImageZoom" ? "×" : "%"}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={site[key]}
        onChange={(e) => patch({ [key]: Number(e.target.value) })}
      />
    </label>
  );
  return (
    <section className="space-y-5">
      <div className="studio-section-heading">
        <div>
          <p className="studio-eyebrow">Homepage presentation</p>
          <h2>Hero media studio</h2>
          <p>
            Upload or choose media, set its focal point and preview the crop.
            Originals remain unchanged.
          </p>
        </div>
        <button className="studio-primary" onClick={save}>
          Save hero settings
        </button>
      </div>
      <div className="studio-panel space-y-4">
        <h3>Upload to the website library</h3>
        <div className="studio-form-grid">
          <label className="studio-label">
            Upload destination
            <select
              value={slot}
              onChange={(e) => setSlot(e.target.value as "image" | "video")}
            >
              <option value="image">Main hero image</option>
              <option value="video">Hero video</option>
            </select>
          </label>
          <label className="studio-label">
            Upload hero {slot}
            <input
              type="file"
              disabled={uploading}
              accept={
                slot === "image"
                  ? "image/jpeg,image/png,image/webp"
                  : "video/mp4,video/webm,video/quicktime"
              }
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setError("");
                setUploading(true);
                try {
                  const asset = await upload(file);
                  if (asset)
                    patch({
                      [asset.mediaType === "video"
                        ? "heroVideoId"
                        : "heroImageId"]: asset.id,
                    });
                } catch (err) {
                  setError(
                    err instanceof Error ? err.message : "Upload failed",
                  );
                } finally {
                  setUploading(false);
                }
              }}
            />
          </label>
        </div>
        <p className="studio-help">
          Images up to 10 MB; videos up to 100 MB. Uploads are selected for
          preview and saved as pending brand media. Complete rights review
          before they can appear publicly.
        </p>
        {uploading && (
          <p role="status">Uploading to your ERP Cloudinary account…</p>
        )}
        {error && <p role="alert">{error}</p>}
      </div>
      <div className="studio-form-grid">
        {(["image", "video"] as const).map((type) => (
          <div className="studio-panel space-y-4" key={type}>
            <h3>{type === "image" ? "Hero image" : "Hero video"}</h3>
            <label className="studio-label">
              {type === "image" ? "Choose hero image" : "Choose hero video"}
              <select
                value={type === "image" ? site.heroImageId : site.heroVideoId}
                onChange={(e) =>
                  patch({
                    [type === "image" ? "heroImageId" : "heroVideoId"]:
                      e.target.value,
                  })
                }
              >
                <option value="">Use existing KhyatiGems brand {type}</option>
                {assets
                  .filter((a) => a.mediaType === type)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title} · {a.status}
                    </option>
                  ))}
              </select>
            </label>
            {(type === "image" ? image : video) && (
              <>
                <p className="studio-help">
                  Rights: {(type === "image" ? image : video)!.status}. Pending
                  media is visible only in private previews.
                </p>
                <button
                  onClick={() => review((type === "image" ? image : video)!)}
                >
                  Review selected {type} rights
                </button>
              </>
            )}
            {type === "image" ? (
              <>
                {range("heroImagePositionX", "Horizontal focal point")}
                {range("heroImagePositionY", "Vertical focal point")}
                {range("heroImageZoom", "Crop zoom", 2, 1, 0.05)}
              </>
            ) : (
              <>
                {range("heroVideoPositionX", "Video horizontal focal point")}
                {range("heroVideoPositionY", "Video vertical focal point")}
                <div className="studio-form-grid">
                  <label className="studio-label">
                    Start at (seconds)
                    <input
                      type="number"
                      min={0}
                      max={video?.duration || 3600}
                      step={0.1}
                      value={site.heroVideoStart}
                      onChange={(e) =>
                        patch({ heroVideoStart: Number(e.target.value) })
                      }
                    />
                  </label>
                  <label className="studio-label">
                    End at (seconds)
                    <input
                      type="number"
                      min={0}
                      max={video?.duration || 3600}
                      step={0.1}
                      value={site.heroVideoEnd}
                      onChange={(e) =>
                        patch({ heroVideoEnd: Number(e.target.value) })
                      }
                    />
                  </label>
                </div>
                <p className="studio-help">
                  An end of 0 plays to the original end. A selected end advances
                  to the next hero slide. Sound-on autoplay depends on the
                  visitor’s browser.
                </p>
                {site.heroVideoEnd > 0 &&
                  site.heroVideoEnd <= site.heroVideoStart && (
                    <p role="alert">Video end must be after the start.</p>
                  )}
              </>
            )}
          </div>
        ))}
      </div>
      <div className="studio-panel space-y-4">
        <div className="studio-section-heading">
          <div>
            <h3>Crop and placement preview</h3>
            <p>
              Preview uses the original media with display adjustments; no
              colour or specimen details are altered.
            </p>
          </div>
          <div className="studio-toolbar">
            {["desktop", "mobile"].map((d) => (
              <button
                key={d}
                aria-pressed={d === device}
                onClick={() => setDevice(d)}
              >
                {d === "desktop" ? "Desktop crop" : "Mobile crop"}
              </button>
            ))}
          </div>
        </div>
        <div className="studio-hero-preview-grid">
          {["image", "video"].map((type) => (
            <figure key={type}>
              <div
                className="studio-hero-crop"
                style={{
                  aspectRatio: device === "desktop" ? "16 / 9" : "3 / 4",
                  maxWidth: device === "mobile" ? 300 : undefined,
                }}
              >
                {type === "image" ? (
                  <img
                    src={image?.url || "/media/hero-sapphire.webp"}
                    alt={image?.alt || "KhyatiGems brand image crop preview"}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: `${site.heroImagePositionX}% ${site.heroImagePositionY}%`,
                      transform: `scale(${site.heroImageZoom})`,
                    }}
                  />
                ) : (
                  <video
                    key={video?.url}
                    controls
                    playsInline
                    muted
                    src={video?.url || "/media/khyatigems-brand-film.mp4"}
                    poster={video?.posterUrl || "/media/brand-film-poster.jpg"}
                    onLoadedMetadata={(e) => {
                      if (site.heroVideoStart)
                        e.currentTarget.currentTime = Math.min(
                          site.heroVideoStart,
                          e.currentTarget.duration,
                        );
                    }}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: `${site.heroVideoPositionX}% ${site.heroVideoPositionY}%`,
                    }}
                  />
                )}
              </div>
              <figcaption className="studio-help">
                {type === "image" ? "Main hero image" : "Hero video"} · Private
                preview
              </figcaption>
            </figure>
          ))}
        </div>
        <div className="studio-toolbar">
          <button
            onClick={() =>
              patch({
                heroImagePositionX: 50,
                heroImagePositionY: 50,
                heroImageZoom: 1,
                heroVideoPositionX: 50,
                heroVideoPositionY: 50,
                heroVideoStart: 0,
                heroVideoEnd: 0,
              })
            }
          >
            Reset display adjustments
          </button>
          <label className="studio-label">
            Image slide duration (seconds)
            <input
              type="number"
              min={5}
              max={30}
              step={0.5}
              value={site.heroSlideSeconds}
              onChange={(e) =>
                patch({ heroSlideSeconds: Number(e.target.value) })
              }
            />
          </label>
        </div>
      </div>
      <div className="studio-panel space-y-4">
        <h3>Additional slideshow images · {site.heroGalleryIds.length}/5</h3>
        <p className="studio-help">
          Selected images replace the default final brand slide. They follow the
          main image in the order selected.
        </p>
        <div className="studio-feature-picks">
          {assets
            .filter((a) => a.mediaType === "image" && a.id !== site.heroImageId)
            .map((a) => (
              <label key={a.id}>
                <input
                  type="checkbox"
                  checked={site.heroGalleryIds.includes(a.id)}
                  disabled={
                    !site.heroGalleryIds.includes(a.id) &&
                    site.heroGalleryIds.length >= 5
                  }
                  onChange={(e) =>
                    patch({
                      heroGalleryIds: e.target.checked
                        ? [...site.heroGalleryIds, a.id]
                        : site.heroGalleryIds.filter((id) => id !== a.id),
                    })
                  }
                />
                <img src={a.url} alt="" width={60} height={45} loading="lazy" />
                <span>
                  {a.title}
                  <small>{a.status}</small>
                </span>
              </label>
            ))}
        </div>
      </div>
    </section>
  );
}
