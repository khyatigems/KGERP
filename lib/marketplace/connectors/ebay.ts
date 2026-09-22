import { httpJson, bearerAuth, httpRequest, HttpError } from "@/lib/marketplace/http";
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
  "https://api.ebay.com/oauth/api_scope",
  "https://api.ebay.com/oauth/api_scope/sell.inventory",
  "https://api.ebay.com/oauth/api_scope/sell.inventory.readonly",
  "https://api.ebay.com/oauth/api_scope/sell.fulfillment",
  "https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly",
  "https://api.ebay.com/oauth/api_scope/sell.account",
  "https://api.ebay.com/oauth/api_scope/sell.account.readonly",
  "https://api.ebay.com/oauth/api_scope/sell.marketing",
  "https://api.ebay.com/oauth/api_scope/sell.marketing.readonly",
  "https://api.ebay.com/oauth/api_scope/sell.listing",
  "https://api.ebay.com/oauth/api_scope/sell.listing.read",
  "https://api.ebay.com/oauth/api_scope/sell.finances",
  "https://api.ebay.com/oauth/api_scope/sell.reputation",
  "https://api.ebay.com/oauth/api_scope/sell.reputation.readonly",
  "https://api.ebay.com/oauth/api_scope/commerce.identity.readonly",
  "https://api.ebay.com/oauth/api_scope/commerce.notification.subscription",
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
    findingBase: sandbox ? "https://svcs.sandbox.ebay.com" : "https://svcs.ebay.com",
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

  private getHeaders(token: string): Record<string, string> {
    return {
      ...bearerAuth(token),
      Accept: "application/json",
      "Accept-Language": "en-US",
      "Content-Language": "en-US",
    };
  }

  private async getSellerId(): Promise<string> {
    const token = await this.getAccessToken();
    const { apiBase } = bases();
    try {
      const data = await httpJson<any>(
        `${apiBase}/sell/account/v1/user`,
        { headers: this.getHeaders(token) }
      );
      return data?.userId || "";
    } catch (err) {
      console.error("[ebay] Failed to get seller ID:", err);
      return "";
    }
  }

  async fetchListings(params: ListingSyncParams = {}): Promise<NormalizedListing[]> {
    const sellerId = await this.getSellerId();
    if (!sellerId) {
      console.warn("[ebay] Could not determine seller ID, skipping listing sync");
      return [];
    }

    const pageSize = params.limit && params.limit > 0 ? Math.min(params.limit, 50) : 50;
    const page = Math.floor((params.offset || 0) / pageSize) + 1;

    const { findingBase } = bases();
    const url = new URL(`${findingBase}/services/search/FindingAPI/v1`);
    url.searchParams.set("OPERATION-NAME", "findItemsAdvanced");
    url.searchParams.set("SERVICE-VERSION", "1.0.0");
    url.searchParams.set("SECURITY-APPNAME", this.clientId);
    url.searchParams.set("GLOBAL-ID", "EBAY-US");
    url.searchParams.set("RESPONSE-DATA-FORMAT", "JSON");
    url.searchParams.set("REST-PAYLOAD", "");
    url.searchParams.set("sellerId", sellerId);
    url.searchParams.set("paginationInput.entriesPerPage", String(pageSize));
    url.searchParams.set("paginationInput.pageNumber", String(page));

    const data = await httpJson<any>(url.toString(), { method: "GET" });

    const result = data?.findItemsAdvancedResponse?.[0]?.searchResult?.[0];
    const items: any[] = result?.item || [];
    const totalCount = Number(result?.["@count"] || 0);

    console.log(`[ebay] Finding API: seller=${sellerId}, page=${page}, items=${totalCount}`);

    return items.map((item: any) => this.normalizeFindingItem(item));
  }

  private normalizeFindingItem(item: any): NormalizedListing {
    const price = item?.currentPrice?.[0];
    const condition = item?.condition?.[0];
    const images: string[] = [];
    if (item?.galleryURL?.[0]) images.push(item.galleryURL[0]);
    if (item?.pictureURLSuperSize?.[0]) images.push(item.pictureURLSuperSize[0]);

    return {
      marketplace: "EBAY",
      listingId: String(item?.itemId?.[0] || ""),
      listingSku: item?.sku?.[0] ? String(item.sku[0]) : null,
      title: item?.title?.[0] ? String(item.title[0]) : null,
      description: null,
      price: price?.__value__ != null ? Number(price.__value__) : null,
      currency: price?.__currencyId__ ? String(price.__currencyId__) : null,
      quantity: item?.quantity?.[0] != null ? Number(item.quantity[0]) : null,
      status: item?.listingStatus?.[0] ? String(item.listingStatus[0]) : null,
      listingUrl: item?.viewItemURL?.[0] ? String(item.viewItemURL[0]) : null,
      category: item?.primaryCategory?.[0]?.categoryName?.[0]
        ? String(item.primaryCategory[0].categoryName[0])
        : null,
      images,
      attributes: condition?.[0]?.conditionDisplayName?.[0]
        ? { Condition: String(condition[0].conditionDisplayName[0]) }
        : {},
      views: item?.hitCount?.[0] != null ? Number(item.hitCount[0]) : null,
      favorites: item?.watchCount?.[0] != null ? Number(item.watchCount[0]) : null,
      orders: item?.sellingStatus?.[0]?.quantitySold?.[0] != null
        ? Number(item.sellingStatus[0].quantitySold[0])
        : null,
      raw: item,
    };
  }

  async fetchOrders(params: OrderSyncParams = {}): Promise<NormalizedOrder[]> {
    const token = await this.getAccessToken();
    const headers = this.getHeaders(token);
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
