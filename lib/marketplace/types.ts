export type MarketplacePlatform = "EBAY" | "ETSY" | "AMAZON";

export const MARKETPLACE_PLATFORMS: MarketplacePlatform[] = ["EBAY", "ETSY", "AMAZON"];

export function normalizePlatform(value: string | null | undefined): MarketplacePlatform | null {
  const normalized = String(value || "").trim().toUpperCase();
  if ((MARKETPLACE_PLATFORMS as string[]).includes(normalized)) {
    return normalized as MarketplacePlatform;
  }
  return null;
}

export type ListingSyncStatus =
  | "PENDING"
  | "SYNCED"
  | "MISMATCH"
  | "UNKNOWN_SKU"
  | "SKIPPED"
  | "FAILED";

export interface NormalizedListing {
  marketplace: MarketplacePlatform;
  listingId: string;
  listingSku: string | null;
  shopName?: string | null;
  title: string | null;
  description: string | null;
  price: number | null;
  currency: string | null;
  quantity: number | null;
  status: string | null;
  listingUrl: string | null;
  category: string | null;
  images: string[];
  attributes: Record<string, string>;
  views?: number | null;
  favorites?: number | null;
  orders?: number | null;
  raw: unknown;
}

export interface NormalizedOrderItem {
  itemId: string | null;
  sku: string | null;
  title: string | null;
  quantity: number;
  unitPrice: number | null;
  currency: string | null;
  raw: unknown;
}

export interface NormalizedOrder {
  marketplace: MarketplacePlatform;
  orderId: string;
  orderNumber: string | null;
  shopName?: string | null;
  status: string | null;
  buyerName?: string | null;
  buyerEmail?: string | null;
  buyerCountry?: string | null;
  buyerCity?: string | null;
  buyerState?: string | null;
  buyerZip?: string | null;
  trackingCode?: string | null;
  carrier?: string | null;
  orderTotal: number | null;
  currency: string | null;
  orderDate: Date | null;
  items: NormalizedOrderItem[];
  raw: unknown;
}

export interface SyncCursor {
  from?: string;
  limit?: number;
  offset?: number;
}

export interface ListingSyncParams extends SyncCursor {}

export interface OrderSyncParams extends SyncCursor {}
