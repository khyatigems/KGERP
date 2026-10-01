import crypto from "node:crypto";
import { httpJson, bearerAuth } from "@/lib/marketplace/http";
import { prisma } from "@/lib/prisma";
import type { MarketplaceConnector, MarketplaceOAuthResult, MarketplaceConnectionContext, EtsyOAuthAppProfile, MarketplaceOAuthContext } from "@/lib/marketplace/connector";
import type {
  NormalizedListing,
  NormalizedOrder,
  NormalizedOrderItem,
  ListingSyncParams,
  OrderSyncParams,
} from "@/lib/marketplace/types";
import { getValidAccessToken, updateTokens, isEncryptionReady } from "@/lib/marketplace/oauth";

const API_BASE = "https://openapi.etsy.com";
const AUTH_URL = "https://www.etsy.com/oauth/connect";
const TOKEN_URL = "https://api.etsy.com/v3/public/oauth/token";
const SCOPES = "listings_r transactions_r shops_r";
const ETSY_APP_PROFILES: EtsyOAuthAppProfile[] = [
  "ETSY_SELLER_LEGACY",
  "ETSY_SECONDARY",
  "ETSY_PERSONAL",
  "ETSY_COMMERCIAL",
];

export interface EtsyAppCredentials {
  clientId: string;
  sharedSecret: string;
  redirectUri: string;
}

function env(name: string): string {
  return (process.env[name] || "").trim();
}

/** Unknown/missing legacy values deliberately resolve to the existing app. */
export function normalizeEtsyAppProfile(value: unknown): EtsyOAuthAppProfile {
  return ETSY_APP_PROFILES.includes(value as EtsyOAuthAppProfile)
    ? value as EtsyOAuthAppProfile
    : "ETSY_SELLER_LEGACY";
}

export function isEtsyAppProfile(value: unknown): value is EtsyOAuthAppProfile {
  return typeof value === "string" && ETSY_APP_PROFILES.includes(value as EtsyOAuthAppProfile);
}

/**
 * App credentials are process configuration, never connection data. Personal
 * and Commercial profiles are intentionally unavailable until approved
 * credentials are explicitly added; silently falling back would be unsafe.
 */
export function resolveEtsyCredentials(profile: EtsyOAuthAppProfile): EtsyAppCredentials {
  if (profile === "ETSY_SELLER_LEGACY") {
    return {
      clientId: env("ETSY_CLIENT_ID") || env("ETSY_API_KEY") || env("ETSY_KEYSTRING"),
      sharedSecret: env("ETSY_SHARED_SECRET") || env("ETSY_API_SECRET"),
      redirectUri: env("ETSY_REDIRECT_URI"),
    };
  }
  if (profile === "ETSY_SECONDARY") {
    return {
      clientId: env("ETSY_SECONDARY_CLIENT_ID"),
      sharedSecret: env("ETSY_SECONDARY_SHARED_SECRET"),
      redirectUri: env("ETSY_SECONDARY_REDIRECT_URI"),
    };
  }
  throw new Error(`${profile} has no configured Etsy credential set.`);
}

export async function isEtsyProfileConfigured(profile: EtsyOAuthAppProfile): Promise<boolean> {
  try {
    const credentials = resolveEtsyCredentials(profile);
    return Boolean(credentials.clientId && credentials.sharedSecret && credentials.redirectUri);
  } catch {
    return false;
  }
}

function moneyValue(money: any): number | null {
  if (!money) return null;
  const amount = Number(money.amount);
  const divisor = Number(money.divisor) || 1;
  if (!Number.isFinite(amount)) return null;
  return amount / divisor;
}

function moneyCurrency(money: any): string | null {
  return money?.currency_code ? String(money.currency_code) : null;
}

function usableSku(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const sku = String(value).trim();
  return sku || null;
}

/**
 * Etsy keeps a listing SKU on an inventory product, rather than on the
 * listing itself. A legacy direct `sku` is also accepted because saved API
 * payloads and older responses can use that shape.
 */
export function etsyListingSku(listing: any): string | null {
  const directValues = Array.isArray(listing?.sku) ? listing.sku : [listing?.sku];
  for (const value of directValues) {
    const direct = usableSku(value && typeof value === "object" ? value.sku : value);
    if (direct) return direct;
  }

  const products = listing?.inventory?.products;
  if (Array.isArray(products)) {
    for (const product of products) {
      const productSku = usableSku(product?.sku);
      if (productSku) return productSku;
      for (const offering of Array.isArray(product?.offerings) ? product.offerings : []) {
        const offeringSku = usableSku(offering?.sku);
        if (offeringSku) return offeringSku;
      }
    }
  }

  // Some Etsy integrations serialize product inventory directly on `products`.
  for (const product of Array.isArray(listing?.products) ? listing.products : []) {
    const productSku = usableSku(product?.sku);
    if (productSku) return productSku;
  }

  // Our product descriptions also carry the ERP SKU. Only use an explicitly
  // labelled value so normal prose can never be accidentally mapped.
  const description = typeof listing?.description === "string"
    ? listing.description.replace(/<[^>]*>/g, " ")
    : "";
  const labelledSku = description.match(/\bSKU\s*(?:No\.?|Number|Code)?\s*[:#-]\s*([A-Za-z0-9][A-Za-z0-9._/-]{2,80})\b/i);
  return labelledSku?.[1] || null;
}

export function etsyListingImages(listing: any): string[] {
  const candidates = Array.isArray(listing?.images)
    ? listing.images
    : Array.isArray(listing?.Images)
      ? listing.Images
      : [];
  return candidates
    .map((image: any) => image?.url_fullxfull || image?.url_570xN || image?.url_170x135 || image?.url || "")
    .filter((url: unknown): url is string => typeof url === "string" && url.length > 0);
}

function base64Url(input: Buffer): string {
  return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function generateCodeVerifier(): string {
  return base64Url(crypto.randomBytes(48));
}

function codeChallengeFromVerifier(verifier: string): string {
  return base64Url(crypto.createHash("sha256").update(verifier).digest());
}

async function storePkceVerifier(state: string, verifier: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key: `etsy_pkce_${state}` },
    create: { key: `etsy_pkce_${state}`, value: verifier },
    update: { value: verifier },
  });
}

async function consumePkceVerifier(state: string): Promise<string | null> {
  const row = await prisma.setting.findUnique({ where: { key: `etsy_pkce_${state}` } });
  if (!row?.value) return null;
  await prisma.setting.delete({ where: { key: `etsy_pkce_${state}` } }).catch(() => {});
  return row.value;
}

export class EtsyConnector implements MarketplaceConnector {
  readonly platform = "ETSY" as const;

  private credentials(profile: EtsyOAuthAppProfile): EtsyAppCredentials {
    const credentials = resolveEtsyCredentials(profile);
    if (!credentials.clientId || !credentials.sharedSecret || !credentials.redirectUri) {
      throw new Error(`${profile} is not configured with Etsy client credentials.`);
    }
    return credentials;
  }

  async isConfigured(): Promise<boolean> {
    return isEtsyProfileConfigured("ETSY_SELLER_LEGACY");
  }

  async getAuthorizationUrl(state: string, context?: MarketplaceOAuthContext): Promise<string> {
    const profile = normalizeEtsyAppProfile(context?.appProfile);
    const credentials = this.credentials(profile);
    const verifier = generateCodeVerifier();
    const challenge = codeChallengeFromVerifier(verifier);
    await storePkceVerifier(state, verifier);
    const params = new URLSearchParams({
      response_type: "code",
      redirect_uri: credentials.redirectUri,
      scope: SCOPES,
      client_id: credentials.clientId,
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
    });
    return `${AUTH_URL}?${params.toString()}`;
  }

  async exchangeAuthorizationCode(code: string, state?: string, context?: MarketplaceOAuthContext): Promise<MarketplaceOAuthResult> {
    if (!(await isEncryptionReady())) {
      throw new Error("Secret encryption key is not configured; cannot store Etsy tokens.");
    }
    const verifier = state ? await consumePkceVerifier(state) : null;
    if (!verifier) throw new Error("Missing or already-used Etsy PKCE verifier.");
    const profile = normalizeEtsyAppProfile(context?.appProfile);
    const credentials = this.credentials(profile);
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: credentials.clientId,
      redirect_uri: credentials.redirectUri,
      code,
    });
    body.set("code_verifier", verifier);

    const data = await httpJson<Record<string, any>>(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const tokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null,
      scope: SCOPES,
    };
    const externalAccountId = String(tokens.accessToken.split(".")[0] || "").trim();
    if (!externalAccountId) throw new Error("Etsy did not return an account ID in the OAuth token.");
    const shops = await this.getUserShops(tokens.accessToken, this.getHeaders(tokens.accessToken, credentials));
    return {
      externalAccountId,
      accountName: externalAccountId,
      tokens,
      shops: shops
        .filter((shop) => shop?.shop_id)
        .map((shop) => ({ externalShopId: String(shop.shop_id), name: String(shop.shop_name || shop.shop_id) })),
    };
  }

  private async getAccessToken(connectionId: string): Promise<string> {
    const profile = await this.getConnectionProfile(connectionId);
    return getValidAccessToken(connectionId, (tokens) =>
      this.refreshAccessToken(connectionId, tokens.refreshToken!, tokens.scope, profile)
    );
  }

  private async getConnectionProfile(connectionId: string): Promise<EtsyOAuthAppProfile> {
    const connection = await prisma.marketplaceConnection.findUnique({
      where: { id: connectionId },
      select: { marketplace: true, oauthAppProfile: true },
    });
    if (!connection || connection.marketplace !== "ETSY") throw new Error("Etsy connection was not found.");
    return normalizeEtsyAppProfile(connection.oauthAppProfile);
  }

  private async refreshAccessToken(connectionId: string, refreshToken: string, scope: string | null | undefined, profile: EtsyOAuthAppProfile): Promise<string> {
    const credentials = this.credentials(profile);
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: credentials.clientId,
      refresh_token: refreshToken,
    });
    const data = await httpJson<Record<string, any>>(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    await updateTokens(connectionId, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null,
      scope: data.scope || scope || SCOPES,
    });
    return data.access_token;
  }

  private getHeaders(token: string, credentials: EtsyAppCredentials): Record<string, string> {
    const apiKey = `${credentials.clientId}:${credentials.sharedSecret}`;
    return {
      ...bearerAuth(token),
      "x-api-key": apiKey,
      Accept: "application/json",
    };
  }

  /** Resolve the authenticating user's shop(s). Returns an array regardless of shape. */
  private async getUserShops(token: string, headers: Record<string, string>): Promise<any[]> {
    const userId = String(token.split(".")[0] || "").trim();
    const url = userId
      ? `${API_BASE}/v3/application/users/${userId}/shops`
      : `${API_BASE}/v3/application/shops`;
    const data = await httpJson<any>(url, { headers }).catch((e) => {
      const err = e as { message?: string; body?: unknown };
      console.error("[etsy] getUserShops failed:", err.message, err.body ? JSON.stringify(err.body) : "");
      throw new Error(`Unable to load Etsy shops: ${err.message || "Marketplace API request failed"}`);
    });
    if (Array.isArray(data?.results)) return data.results;
    if (data?.shop_id) return [data];
    return [];
  }

  async fetchListings(params: ListingSyncParams, context: MarketplaceConnectionContext): Promise<NormalizedListing[]> {
    const token = await this.getAccessToken(context.connectionId);
    const headers = this.getHeaders(token, this.credentials(await this.getConnectionProfile(context.connectionId)));
    const pageSize = params.limit && params.limit > 0 ? Math.min(params.limit, 100) : 100;
    const offset = params.offset || 0;
    const data = await httpJson<{ results?: any[]; count?: number }>(
      `${API_BASE}/v3/application/shops/${encodeURIComponent(context.externalShopId)}/listings?state=active&includes=Images,Inventory&limit=${pageSize}&offset=${offset}`,
      { headers }
    );
    return (data.results || []).map((listing) => ({
      ...this.normalizeListing(listing),
      marketplaceShopId: context.shopId,
      externalShopId: context.externalShopId,
      shopName: context.shopName,
    }));
  }

  private normalizeListing(listing: any): NormalizedListing {
    const sku = etsyListingSku(listing);
    const images = etsyListingImages(listing);

    return {
      marketplace: "ETSY",
      listingId: listing?.listing_id ? String(listing.listing_id) : "",
      listingSku: sku,
      title: listing?.title ? String(listing.title) : null,
      description: listing?.description ? String(listing.description) : null,
      price: moneyValue(listing?.price),
      currency: moneyCurrency(listing?.price),
      quantity: listing?.quantity != null ? Number(listing.quantity) : null,
      status: listing?.state ? String(listing.state) : null,
      listingUrl: listing?.url ? String(listing.url) : null,
      category: listing?.taxonomy_id ? String(listing.taxonomy_id) : null,
      images,
      attributes: {},
      views: null,
      favorites: listing?.num_favorers != null ? Number(listing.num_favorers) : null,
      orders: null,
      raw: listing,
    };
  }

  async fetchOrders(params: OrderSyncParams, context: MarketplaceConnectionContext): Promise<NormalizedOrder[]> {
    const token = await this.getAccessToken(context.connectionId);
    const headers = this.getHeaders(token, this.credentials(await this.getConnectionProfile(context.connectionId)));
    const pageSize = params.limit && params.limit > 0 ? Math.min(params.limit, 100) : 50;
    const offset = params.offset || 0;

    const receipts = await httpJson<{ results?: any[] }>(
      `${API_BASE}/v3/application/shops/${encodeURIComponent(context.externalShopId)}/receipts?limit=${pageSize}&offset=${offset}`,
      { headers }
    );
    return Promise.all((receipts.results || []).map(async (receipt) => {
      const imagesByListing = await this.getReceiptListingImages(
        context.externalShopId,
        receipt?.receipt_id,
        headers
      ).catch(() => new Map<string, string>());
      return {
        ...this.normalizeOrder(receipt, imagesByListing),
        marketplaceShopId: context.shopId,
        externalShopId: context.externalShopId,
        shopName: context.shopName,
      };
    }));
  }

  /** Etsy receipt transactions do not consistently include images. Load the
   * listing association for the receipt so each synced order item has one. */
  private async getReceiptListingImages(
    shopId: string,
    receiptId: unknown,
    headers: Record<string, string>
  ): Promise<Map<string, string>> {
    const id = String(receiptId || "").trim();
    if (!id) return new Map();
    const data = await httpJson<{ results?: any[] }>(
      `${API_BASE}/v3/application/shops/${encodeURIComponent(shopId)}/receipts/${encodeURIComponent(id)}/listings?includes=Images&limit=100`,
      { headers }
    );
    const result = new Map<string, string>();
    await Promise.all((data.results || []).map(async (listing) => {
      try {
        if (listing?.listing_id == null) return;
        const listingId = String(listing.listing_id);
        // getListingsByShopReceipt does not guarantee expanded image payloads.
        // Fetch the image resource directly so receipt thumbnails are reliable.
        let image = etsyListingImages(listing)[0];
        if (!image) {
          const imageData = await httpJson<{ results?: any[] }>(
            `${API_BASE}/v3/application/listings/${encodeURIComponent(listingId)}/images?limit=1`,
            { headers }
          );
          image = etsyListingImages({ images: imageData.results })[0];
        }
        if (image) result.set(listingId, image);
      } catch (error) {
        // One unavailable/deleted listing must not hide images for the rest of
        // the receipt. The order itself remains safe to sync.
        console.warn("[etsy] Could not load an order item image:", error);
      }
    }));
    return result;
  }

  private normalizeOrder(receipt: any, imagesByListing = new Map<string, string>()): NormalizedOrder {
    const items: NormalizedOrderItem[] = (receipt?.transactions || []).map((tx: any) => ({
      itemId: tx?.transaction_id ? String(tx.transaction_id) : null,
      sku: tx?.sku ? String(tx.sku) : null,
      title: tx?.title ? String(tx.title) : null,
      quantity: Number(tx?.quantity || 1),
      unitPrice: moneyValue(tx?.price),
      currency: moneyCurrency(tx?.price),
      // Retain the image on the item payload; MarketplaceOrderItem already
      // persists raw source metadata and needs no schema migration for this.
      raw: { ...tx, imageUrl: imagesByListing.get(String(tx?.listing_id || "")) || tx?.image_url || null },
    }));

    return {
      marketplace: "ETSY",
      orderId: receipt?.receipt_id ? String(receipt.receipt_id) : "",
      orderNumber: receipt?.receipt_id ? String(receipt.receipt_id) : null,
      status: receipt?.status ? String(receipt.status) : null,
      buyerName: receipt?.name ? String(receipt.name) : null,
      buyerEmail: receipt?.buyer_email ? String(receipt.buyer_email) : null,
      buyerCountry: receipt?.country_iso ? String(receipt.country_iso) : null,
      buyerCity: receipt?.city ? String(receipt.city) : null,
      buyerState: receipt?.state ? String(receipt.state) : null,
      buyerZip: receipt?.zip ? String(receipt.zip) : null,
      trackingCode: receipt?.shipments?.[0]?.tracking_code
        ? String(receipt.shipments[0].tracking_code)
        : receipt?.tracking_code ? String(receipt.tracking_code) : null,
      carrier: receipt?.shipments?.[0]?.carrier_name
        ? String(receipt.shipments[0].carrier_name)
        : receipt?.carrier_name ? String(receipt.carrier_name) : null,
      orderTotal: moneyValue(receipt?.grandtotal),
      currency: moneyCurrency(receipt?.grandtotal),
      orderDate: receipt?.created_timestamp ? new Date(receipt.created_timestamp * 1000) : null,
      items,
      raw: receipt,
    };
  }
}
