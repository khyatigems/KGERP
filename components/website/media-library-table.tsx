"use client";
import { useState } from "react";
import type { ImageAsset } from "@/lib/website/editorial/contract";
import { deliveryUrl } from "@/lib/website/editorial/media";
export function MediaLibraryTable({
  images,
  select,
  archive,
}: {
  images: ImageAsset[];
  select: (asset: ImageAsset) => void;
  archive: (asset: ImageAsset, restore?: boolean) => void;
}) {
  const [preview, setPreview] = useState<ImageAsset | null>(null);
  return (
    <div className="space-y-4">
      <div className="overflow-auto">
        <table>
          <caption className="p-3 text-left">
            Saved media and rights records · {images.length} assets
          </caption>
          <thead>
            <tr>
              <th>Preview</th>
              <th>Media</th>
              <th>Purpose / rights</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {images.map((a) => (
              <tr key={a.id}>
                <td style={{ width: 110 }}>
                  {(a.mediaType === "video" ? a.posterUrl : a.url) && (
                    <img
                      src={deliveryUrl(
                        a.mediaType === "video" ? a.posterUrl : a.url,
                        200,
                      )}
                      alt={a.alt || a.title}
                      width={90}
                      height={65}
                      style={{ objectFit: "contain", height: 65 }}
                      loading="lazy"
                    />
                  )}
                </td>
                <td>
                  <strong>{a.title}</strong>
                  <p className="studio-help">
                    {a.mediaType} · {a.width} × {a.height}
                  </p>
                  <small className="break-all">
                    {a.cloudinaryPublicId || a.id}
                  </small>
                </td>
                <td>
                  <span className="studio-chip">{a.status}</span>
                  <p className="studio-help">
                    {a.purpose === "brand"
                      ? "Brand media"
                      : "Specimen reference"}
                  </p>
                </td>
                <td>
                  <div className="studio-toolbar">
                    <button onClick={() => select(a)}>Edit rights</button>
                    <button onClick={() => setPreview(a)}>Preview media</button>
                    <button onClick={() => archive(a, a.status === "archived")}>
                      {a.status === "archived"
                        ? "Restore as pending"
                        : "Remove from library"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!images.length && <p className="p-5">No media match this filter.</p>}
      </div>
      <p className="studio-help">
        Removal archives unused records and preserves originals in Cloudinary.
        Used media must be removed from articles and website placements first.
        Archived records can be restored as pending.
      </p>
      {preview && (
        <div className="studio-panel space-y-3">
          <div className="studio-toolbar">
            <h3>{preview.title}</h3>
            <button onClick={() => setPreview(null)}>
              Close media preview
            </button>
          </div>
          {preview.mediaType === "video" ? (
            <video
              controls
              playsInline
              muted
              src={preview.url}
              poster={preview.posterUrl}
              style={{ maxWidth: "100%", maxHeight: 420 }}
            />
          ) : (
            <img
              src={deliveryUrl(preview.url, 1200)}
              alt={preview.alt}
              style={{ maxWidth: "100%", maxHeight: 420, objectFit: "contain" }}
            />
          )}
          <p>{preview.caption}</p>
        </div>
      )}
    </div>
  );
}
