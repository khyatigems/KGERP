import crypto from "node:crypto";
import { httpJson, bearerAuth } from "@/lib/marketplace/http";
import { prisma } from "@/lib/prisma";
import type { MarketplaceConnector } from "@/lib/marketplace/connector";
import type {
  NormalizedListing,
  NormalizedOrder,
  NormalizedOrderItem,
  ListingSyncParams,
  OrderSyncParams,
} from "@/lib/marketplace/types";
import { loadTokens, saveTokens, isEncryptionReady } from "@/lib/marketplace/oauth";

const API_BASE = "https://openapi.etsy.com";
const AUTH_URL = "https://www.etsy.com/oauth/connect";
const TOKEN_URL = "https://api.etsy.com/v3/public/oauth/token";
const SCOPES = "listings_r transactions_r shops_r";

function env(name: string): string {
  return (process.env[name] || "").trim();
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

  private get clientId() {
    return env("ETSY_CLIENT_ID") || env("ETSY_API_KEY") || env("ETSY_KEYSTRING");
  }
  private get sharedSecret() {
    return env("ETSY_SHARED_SECRET") || env("ETSY_API_SECRET") || "";
  }
  private get redirectUri() {
    return env("ETSY_REDIRECT_URI");
  }

  async isConfigured(): Promise<boolean> {
    return Boolean(this.clientId && this.redirectUri);
  }

  getAuthorizationUrl(state: string): string {
    const verifier = generateCodeVerifier();
    const challenge = codeChallengeFromVerifier(verifier);
    void storePkceVerifier(state, verifier);
    const params = new URLSearchParams({
      response_type: "code",
      redirect_uri: this.redirectUri,
      scope: SCOPES,
      client_id: this.clientId,
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
    });
    return `${AUTH_URL}?${params.toString()}`;
  }

  async exchangeAuthorizationCode(code: string, state?: string): Promise<void> {
    if (!(await isEncryptionReady())) {
      throw new Error("Secret encryption key is not configured; cannot store Etsy tokens.");
    }
    const verifier = state ? await consumePkceVerifier(state) : null;
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      code,
    });
    if (verifier) body.set("code_verifier", verifier);

    const data = await httpJson<Record<string, any>>(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    await saveTokens(this.platform, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null,
      scope: SCOPES,
    });
  }

  private async getAccessToken(): Promise<string> {
    const tokens = await loadTokens(this.platform);
    if (!tokens?.accessToken) {
      throw new Error("Etsy is not connected. Complete OAuth first.");
    }
    if (tokens.expiresAt && new Date(tokens.expiresAt).getTime() - Date.now() > 5 * 60 * 1000) {
      return tokens.accessToken;
    }
    if (!tokens.refreshToken) {
      throw new Error("Etsy access token expired and no refresh token is available.");
    }
    return this.refreshAccessToken(tokens.refreshToken);
  }

  private async refreshAccessToken(refreshToken: string): Promise<string> {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: this.clientId,
      refresh_token: refreshToken,
    });
    const data = await httpJson<Record<string, any>>(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    await saveTokens(this.platform, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null,
      scope: SCOPES,
    });
    return data.access_token;
  }

  private async getHeaders(token: string): Promise<Record<string, string>> {
    const apiKey = this.sharedSecret ? `${this.clientId}:${this.sharedSecret}` : this.clientId;
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
      return {};
    });
    if (Array.isArray(data?.results)) return data.results;
    if (data?.shop_id) return [data];
    return [];
  }

  async fetchListings(params: ListingSyncParams = {}): Promise<NormalizedListing[]> {
    const token = await this.getAccessToken();
    const headers = await this.getHeaders(token);
    const pageSize = params.limit && params.limit > 0 ? Math.min(params.limit, 100) : 100;
    const offset = params.offset || 0;

    // Optional filter so only a specific shop is synced (e.g. ETSY_SHOP_NAME=KhyatiGemsOfficial).
    const targetShop = env("ETSY_SHOP_NAME").trim().toLowerCase();

    const shops = await this.getUserShops(token, headers);

    for (const shop of shops || []) {
      console.log(
        "[etsy] shop: id=", shop?.shop_id, "name=", shop?.shop_name, "userId=", shop?.user_id
      );
    }

    const listings: NormalizedListing[] = [];
    for (const shop of shops || []) {
      const shopId = shop?.shop_id ? String(shop.shop_id) : null;
      const shopName = String(shop?.shop_name || "").toLowerCase();
      if (!shopId) continue;
      if (targetShop && !shopName.includes(targetShop)) {
        console.log("[etsy] skipping shop", shopId, shopName, "target:", targetShop);
        continue;
      }
      const data = await httpJson<{ results?: any[]; count?: number }>(
        `${API_BASE}/v3/application/shops/${shopId}/listings?state=active&limit=${pageSize}&offset=${offset}`,
        { headers }
      );
      console.log(
        "[etsy] shop", shopId, shopName, "listings count:", data.results?.length, "count:", data.count,
        "sample:", (data.results || []).slice(0, 3).map((l) => `${l.listing_id} ${l.title}`)
      );
      for (const listing of data.results || []) {
        const normalized = this.normalizeListing(listing);
        normalized.shopName = shop?.shop_name ?? null;
        listings.push(normalized);
      }
    }
    return listings;
  }

  private normalizeListing(listing: any): NormalizedListing {
    const sku = Array.isArray(listing?.sku) && listing.sku.length > 0 ? String(listing.sku[0].sku) : null;
    const images = Array.isArray(listing?.images)
      ? listing.images.map((img: any) => img?.url_570xN || img?.url_fullxfull || "").filter(Boolean)
      : [];

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

  async fetchOrders(params: OrderSyncParams = {}): Promise<NormalizedOrder[]> {
    const token = await this.getAccessToken();
    const headers = await this.getHeaders(token);
    const pageSize = params.limit && params.limit > 0 ? Math.min(params.limit, 100) : 50;
    const offset = params.offset || 0;

    const shops = await this.getUserShops(token, headers);

    const orders: NormalizedOrder[] = [];
    for (const shop of shops || []) {
      const shopId = shop?.shop_id ? String(shop.shop_id) : null;
      if (!shopId) continue;
      const receipts = await httpJson<{ results?: any[] }>(
        `${API_BASE}/v3/application/shops/${shopId}/receipts?limit=${pageSize}&offset=${offset}`,
        { headers }
      ).catch(() => ({ results: [] as any[] }));
      for (const receipt of receipts.results || []) {
        const order = this.normalizeOrder(receipt);
        order.shopName = shop?.shop_name ?? null;
        orders.push(order);
      }
    }
    return orders;
  }

  private normalizeOrder(receipt: any): NormalizedOrder {
    const items: NormalizedOrderItem[] = (receipt?.transactions || []).map((tx: any) => ({
      itemId: tx?.transaction_id ? String(tx.transaction_id) : null,
      sku: tx?.sku ? String(tx.sku) : null,
      title: tx?.title ? String(tx.title) : null,
      quantity: Number(tx?.quantity || 1),
      unitPrice: moneyValue(tx?.price),
      currency: moneyCurrency(tx?.price),
      raw: tx,
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
      trackingCode: receipt?.shipments?.[0]?.tracking_code ? String(receipt.shipments[0].tracking_code) : null,
      carrier: receipt?.shipments?.[0]?.carrier_name ? String(receipt.shipments[0].carrier_name) : null,
      orderTotal: moneyValue(receipt?.grandtotal),
      currency: moneyCurrency(receipt?.grandtotal),
      orderDate: receipt?.created_timestamp ? new Date(receipt.created_timestamp * 1000) : null,
      items,
      raw: receipt,
    };
  }
}
