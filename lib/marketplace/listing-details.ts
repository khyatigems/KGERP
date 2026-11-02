import type { NormalizedListing } from "@/lib/marketplace/types";

export type ListingDetails = {
  images: string[];
  category?: string | null;
  startedAt?: string | null;
  endsAt?: string | null;
  updatedAt?: string | null;
  listingType?: string | null;
  tags?: string[];
  hasVariations?: boolean;
  viewsPeriod?: string | null;
  metricsUpdatedAt?: string | null;
  impressions?: number | null;
  metricsWarning?: string | null;
};

export function marketplaceImageUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const url = value.trim().replace(/&amp;/g, "&");
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : null;
  } catch { return url.startsWith("/") && !url.startsWith("//") ? url : null; }
}

/** Supports old XML, JSON-encoded XML, Etsy associations and normalized syncs. */
export function readListingDetails(raw: string | null): ListingDetails {
  let payload: unknown = raw;
  try { payload = JSON.parse(raw || "null"); } catch { /* Legacy plain XML. */ }
  if (typeof payload === "string") {
    return { images: [...payload.matchAll(/<(?:GalleryURL|PictureURL)(?:\s[^>]*)?>([\s\S]*?)<\/(?:GalleryURL|PictureURL)>/gi)]
      .map((match) => marketplaceImageUrl(match[1].replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, "$1")))
      .filter((url): url is string => Boolean(url)) };
  }
  if (!payload || typeof payload !== "object") return { images: [] };
  const data = payload as Record<string, unknown>;
  const saved = data._listing && typeof data._listing === "object" ? data._listing as ListingDetails : undefined;
  const images = saved?.images || data.images || data.Images;
  const urls = Array.isArray(images) ? images.flatMap((image) => {
    const candidate = typeof image === "string" ? image : image && typeof image === "object"
      ? ["url_fullxfull", "url_570xN", "url_170x135", "url"].map((key) => (image as Record<string, unknown>)[key]).find(Boolean) : null;
    const url = marketplaceImageUrl(candidate);
    return url ? [url] : [];
  }) : [];
  return { ...saved, images: [...new Set(urls)] };
}

export function listingSyncMetadata(listing: NormalizedListing, previous: string | null): string {
  const old = readListingDetails(previous);
  const raw = listing.raw && typeof listing.raw === "object" && !Array.isArray(listing.raw)
    ? listing.raw : { source: listing.raw };
  return JSON.stringify({ ...raw, _listing: {
    ...old, ...listing.details, category: listing.category ?? old.category,
    viewsPeriod: listing.details?.metricsWarning && old.viewsPeriod ? old.viewsPeriod : listing.details?.viewsPeriod ?? old.viewsPeriod,
    metricsWarning: listing.details?.metricsWarning && (old.metricsUpdatedAt || old.viewsPeriod)
      ? `${listing.details.metricsWarning} Showing last saved metrics where available.` : listing.details?.metricsWarning ?? null,
    images: listing.images.length ? listing.images : old.images,
  } });
}
