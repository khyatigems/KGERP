const LIVE_STATUSES = new Set(["ACTIVE", "LISTED"]);
const CLOSED_STATUSES = new Set([
  "DRAFT",
  "INACTIVE",
  "EXPIRED",
  "EDIT",
  "SOLD",
  "SOLD_OUT",
  "ENDED",
  "COMPLETED",
  "REMOVED",
  "UNSOLD",
  "SCHEDULED",
  "CUSTOM",
]);

export const ACTIVE_MARKETPLACE_LISTING_STATUSES = ["ACTIVE", "LISTED"] as const;

export function normalizeMarketplaceListingStatus(status: string | null | undefined): string {
  return String(status || "").trim().toUpperCase();
}

/**
 * Listing sync must ingest live marketplace inventory only. Drafts, ended,
 * sold, and other seller-hub categories stay out of the ERP active set.
 */
export function isLiveMarketplaceListing(input: {
  status?: string | null;
  quantity?: number | null;
}): boolean {
  const status = normalizeMarketplaceListingStatus(input.status);
  if (CLOSED_STATUSES.has(status)) return false;
  if (input.quantity === 0) return false;
  return !status || LIVE_STATUSES.has(status);
}
