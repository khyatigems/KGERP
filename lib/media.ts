import { DEFAULT_PLACEHOLDER_IMAGE } from "@/lib/constants";

export function resolveMediaUrl(
  media?: { mediaUrl?: string }[],
  options?: { forPdf?: boolean }
) {
  if (media && media.length > 0 && media[0]?.mediaUrl) {
    return media[0].mediaUrl;
  }

  // PDF-safe absolute URL
  if (options?.forPdf) {
    const baseUrl = process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    // Ensure placeholder doesn't start with / if we are appending to base url that might not have it or might...
    // But usually base url has no trailing slash, and placeholder has leading slash.
    return `${baseUrl}${DEFAULT_PLACEHOLDER_IMAGE}`;
  }

  // ERP UI local fallback
  return DEFAULT_PLACEHOLDER_IMAGE;
}
