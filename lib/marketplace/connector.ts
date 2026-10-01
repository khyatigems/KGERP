import type {
  MarketplacePlatform,
  NormalizedListing,
  NormalizedOrder,
  ListingSyncParams,
  OrderSyncParams,
  MarketplaceShopIdentity,
} from "./types";
import type { StoredOAuthTokens } from "./oauth";

export type EtsyOAuthAppProfile =
  | "ETSY_SELLER_LEGACY"
  | "ETSY_SECONDARY"
  | "ETSY_PERSONAL"
  | "ETSY_COMMERCIAL";

export interface MarketplaceOAuthContext {
  appProfile?: EtsyOAuthAppProfile;
}

export interface MarketplaceConnectionContext {
  connectionId: string;
  shopId: string;
  externalShopId: string;
  shopName: string;
}

export interface MarketplaceOAuthResult {
  externalAccountId: string;
  accountName: string;
  tokens: StoredOAuthTokens;
  shops: MarketplaceShopIdentity[];
}

export interface MarketplaceConnector {
  readonly platform: MarketplacePlatform;
  /** Whether required server-side credentials are configured. */
  isConfigured(): Promise<boolean>;
  /** Build the OAuth authorization URL for a new connection. */
  getAuthorizationUrl(state: string, context?: MarketplaceOAuthContext): Promise<string>;
  /** Exchange an authorization code for tokens and persist them (server-side only). */
  exchangeAuthorizationCode(code: string, state?: string, context?: MarketplaceOAuthContext): Promise<MarketplaceOAuthResult>;
  /** Fetch normalized listings (idempotent read; no ERP writes). */
  fetchListings(params: ListingSyncParams, context: MarketplaceConnectionContext): Promise<NormalizedListing[]>;
  /** Fetch normalized orders (idempotent read; no ERP writes). */
  fetchOrders(params: OrderSyncParams, context: MarketplaceConnectionContext): Promise<NormalizedOrder[]>;
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
