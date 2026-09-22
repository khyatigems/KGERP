import { httpJson, bearerAuth } from "@/lib/marketplace/http";
import type { MarketplaceConnector } from "@/lib/marketplace/connector";
import type {
  NormalizedListing,
  NormalizedOrder,
  NormalizedOrderItem,
  ListingSyncParams,
  OrderSyncParams,
} from "@/lib/marketplace/types";
import {
  loadTokens,
  saveTokens,
  isEncryptionReady,
} from "@/lib/marketplace/oauth";

const SCOPES = [
  "https://api.ebay.com/oauth/api_scope/sell.inventory.readonly",
  "https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly",
].join(" ");

function env(name: string): string {
  return (process.env[name] || "").trim();
}

function isSandbox(): boolean {
  return env("EBAY_ENVIRONMENT").toLowerCase() !== "production";
}

function bases() {
  const sandbox = isSandbox();
  return {
    sandbox,
    authBase: sandbox ? "https://auth.sandbox.ebay.com" : "https://auth.ebay.com",
    apiBase: sandbox ? "https://api.sandbox.ebay.com" : "https://api.ebay.com",
  };
}

export class EbayConnector implements MarketplaceConnector {
  readonly platform = "EBAY" as const;

  private get clientId() {
    return env("EBAY_CLIENT_ID");
  }
  private get clientSecret() {
    return env("EBAY_CLIENT_SECRET");
  }
  private get ruName() {
    return env("EBAY_RU_NAME");
  }

  async isConfigured(): Promise<boolean> {
    return Boolean(this.clientId && this.clientSecret && this.ruName);
  }

  getAuthorizationUrl(state: string): string {
    const { authBase } = bases();
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: "code",
      redirect_uri: this.ruName,
      scope: SCOPES,
      state,
    });
    return `${authBase}/oauth2/authorize?${params.toString()}`;
  }

  async exchangeAuthorizationCode(code: string): Promise<void> {
    if (!(await isEncryptionReady())) {
      throw new Error("Secret encryption key is not configured; cannot store eBay tokens.");
    }
    const { apiBase } = bases();
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: this.ruName,
    });
    const basic = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
    const data = await httpJson<Record<string, any>>(
      `${apiBase}/identity/v1/oauth2/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${basic}`,
        },
        body: body.toString(),
      }
    );
    await saveTokens(this.platform, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null,
      scope: data.scope,
    });
  }

  private async getAccessToken(): Promise<string> {
    const tokens = await loadTokens(this.platform);
    if (!tokens?.accessToken) {
      throw new Error("eBay is not connected. Complete OAuth first.");
    }
    if (tokens.expiresAt && new Date(tokens.expiresAt).getTime() - Date.now() > 5 * 60 * 1000) {
      return tokens.accessToken;
    }
    if (!tokens.refreshToken) {
      throw new Error("eBay access token expired and no refresh token is available.");
    }
    return this.refreshAccessToken(tokens.refreshToken);
  }

  private async refreshAccessToken(refreshToken: string): Promise<string> {
    const { apiBase } = bases();
    const basic = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
    const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken });
    const data = await httpJson<Record<string, any>>(
      `${apiBase}/identity/v1/oauth2/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${basic}`,
        },
        body: body.toString(),
      }
    );
    await saveTokens(this.platform, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null,
      scope: data.scope,
    });
    return data.access_token;
  }

  private async getHeaders(token: string): Promise<Record<string, string>> {
    return {
      ...bearerAuth(token),
      Accept: "application/json",
      "Content-Language": "en-US",
    };
  }

  async fetchListings(params: ListingSyncParams = {}): Promise<NormalizedListing[]> {
    const token = await this.getAccessToken();
    const headers = await this.getHeaders(token);
    const { apiBase } = bases();

    const pageSize = params.limit && params.limit > 0 ? params.limit : 100;
    const offset = params.offset || 0;

    const inventory = await httpJson<{ inventoryItems?: any[] }>(
      `${apiBase}/sell/inventory/v1/inventory_item?limit=${pageSize}&offset=${offset}`,
      { headers }
    );

    const offers = await httpJson<{ offers?: any[] }>(
      `${apiBase}/sell/inventory/v1/offer?limit=${pageSize}&offset=0`,
      { headers }
    ).catch(() => ({ offers: [] as any[] }));

    const offerBySku = new Map<string, any>();
    for (const offer of offers.offers || []) {
      if (offer?.sku) offerBySku.set(String(offer.sku), offer);
    }

    const listings: NormalizedListing[] = [];
    for (const item of inventory.inventoryItems || []) {
      const sku = item?.sku ? String(item.sku) : null;
      const offer = sku ? offerBySku.get(sku) : undefined;
      listings.push(this.normalizeListing(item, offer));
    }
    return listings;
  }

  private normalizeListing(item: any, offer: any): NormalizedListing {
    const product = item?.product || {};
    const pricing = offer?.pricingSummary?.price || {};
    const listing = offer?.listing || {};
    const images = Array.isArray(product?.imageUrls) ? product.imageUrls.map(String) : [];
    const aspects = product?.aspects || {};
    const attributes: Record<string, string> = {};
    for (const key of Object.keys(aspects)) {
      const value = aspects[key];
      attributes[key] = Array.isArray(value) ? value.join(", ") : String(value ?? "");
    }

    return {
      marketplace: "EBAY",
      listingId: listing?.listingId ? String(listing.listingId) : (item?.sku ? String(item.sku) : ""),
      listingSku: item?.sku ? String(item.sku) : null,
      title: product?.title ? String(product.title) : null,
      description: product?.description ? String(product.description) : null,
      price: pricing?.value != null ? Number(pricing.value) : null,
      currency: pricing?.currency ? String(pricing.currency) : null,
      quantity: offer?.availableQuantity != null ? Number(offer.availableQuantity) : (item?.availability?.shipToLocationQuantity != null ? Number(item.availability.shipToLocationQuantity) : null),
      status: offer?.status ? String(offer.status) : null,
      listingUrl: listing?.listingUrl ? String(listing.listingUrl) : null,
      category: null,
      images,
      attributes,
      views: item?.soldQuantity != null || offer?.soldQuantity != null ? null : null,
      favorites: null,
      orders: offer?.soldQuantity != null ? Number(offer.soldQuantity) : (item?.soldQuantity != null ? Number(item.soldQuantity) : null),
      raw: { item, offer },
    };
  }

  async fetchOrders(params: OrderSyncParams = {}): Promise<NormalizedOrder[]> {
    const token = await this.getAccessToken();
    const headers = await this.getHeaders(token);
    const { apiBase } = bases();

    const pageSize = params.limit && params.limit > 0 ? params.limit : 50;
    const offset = params.offset || 0;
    const filter = params.from ? `creationdate:[${params.from}..]` : undefined;
    const query = new URLSearchParams({ limit: String(pageSize), offset: String(offset) });
    if (filter) query.set("filter", filter);

    const data = await httpJson<{ orders?: any[] }>(
      `${apiBase}/sell/fulfillment/v1/order?${query.toString()}`,
      { headers }
    );

    return (data.orders || []).map((order) => this.normalizeOrder(order));
  }

  private normalizeOrder(order: any): NormalizedOrder {
    const total = order?.pricingSummary?.total || {};
    const buyer = order?.buyer || {};
    const items: NormalizedOrderItem[] = (order?.lineItems || []).map((line: any) => ({
      itemId: line?.lineItemId ? String(line.lineItemId) : null,
      sku: line?.sku ? String(line.sku) : null,
      title: line?.title ? String(line.title) : null,
      quantity: Number(line?.quantity || 1),
      unitPrice: line?.unitPrice?.value != null ? Number(line.unitPrice.value) : null,
      currency: line?.unitPrice?.currency ? String(line.unitPrice.currency) : null,
      raw: line,
    }));

    return {
      marketplace: "EBAY",
      orderId: order?.orderId ? String(order.orderId) : "",
      orderNumber: order?.orderId ? String(order.orderId) : null,
      status: order?.orderFulfillmentStatus ? String(order.orderFulfillmentStatus) : null,
      buyerName: buyer?.username ? String(buyer.username) : null,
      buyerEmail: buyer?.email ? String(buyer.email) : null,
      orderTotal: total?.value != null ? Number(total.value) : null,
      currency: total?.currency ? String(total.currency) : null,
      orderDate: order?.creationDate ? new Date(order.creationDate) : null,
      items,
      raw: order,
    };
  }
}
