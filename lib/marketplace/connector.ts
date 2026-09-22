import type {
  MarketplacePlatform,
  NormalizedListing,
  NormalizedOrder,
  ListingSyncParams,
  OrderSyncParams,
} from "./types";

export interface MarketplaceConnector {
  readonly platform: MarketplacePlatform;
  /** Whether required server-side credentials are configured. */
  isConfigured(): Promise<boolean>;
  /** Build the OAuth authorization URL for a new connection. */
  getAuthorizationUrl(state: string): string;
  /** Exchange an authorization code for tokens and persist them (server-side only). */
  exchangeAuthorizationCode(code: string, state?: string): Promise<void>;
  /** Fetch normalized listings (idempotent read; no ERP writes). */
  fetchListings(params?: ListingSyncParams): Promise<NormalizedListing[]>;
  /** Fetch normalized orders (idempotent read; no ERP writes). */
  fetchOrders(params?: OrderSyncParams): Promise<NormalizedOrder[]>;
}

const registry = new Map<MarketplacePlatform, MarketplaceConnector>();

export function registerConnector(connector: MarketplaceConnector): void {
  registry.set(connector.platform, connector);
}

export function getConnector(platform: MarketplacePlatform): MarketplaceConnector | undefined {
  return registry.get(platform);
}

export function listConnectors(): MarketplaceConnector[] {
  return Array.from(registry.values());
}
