export class HttpError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.body = body;
  }
}

export interface HttpRequestOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryOnStatus?: number[];
  timeoutMs?: number;
  minIntervalMs?: number;
}

const DEFAULT_RETRY_STATUS = [408, 425, 429, 500, 502, 503, 504];

const hostLastRequest: Record<string, number> = {};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hostFromUrl(raw: string): string {
  try {
    return new URL(raw).host;
  } catch {
    return raw;
  }
}

async function respectMinInterval(url: string, minIntervalMs: number): Promise<void> {
  if (minIntervalMs <= 0) return;
  const host = hostFromUrl(url);
  const last = hostLastRequest[host] || 0;
  const elapsed = Date.now() - last;
  if (elapsed < minIntervalMs) {
    await sleep(minIntervalMs - elapsed);
  }
  hostLastRequest[host] = Date.now();
}

/**
 * Minimal HTTP client for marketplace integrations with retry + exponential
 * backoff + per-host rate-limit spacing. Secrets are never logged.
 */
export async function httpRequest(
  url: string,
  init: RequestInit,
  options: HttpRequestOptions = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    baseDelayMs = 500,
    maxDelayMs = 15000,
    retryOnStatus = DEFAULT_RETRY_STATUS,
    timeoutMs = 30000,
    minIntervalMs = 0,
  } = options;

  await respectMinInterval(url, minIntervalMs);

  let attempt = 0;
  let lastError: unknown;

  while (attempt <= maxRetries) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) return response;

      if (retryOnStatus.includes(response.status) && attempt < maxRetries) {
        const retryAfter = Number(response.headers.get("retry-after") || 0);
        const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));
        let body: unknown;
        try {
          body = await response.json();
        } catch {
          body = await response.text().catch(() => undefined);
        }
        lastError = new HttpError(`HTTP ${response.status}`, response.status, body);
        await sleep(waitMs);
        attempt += 1;
        continue;
      }

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        body = await response.text().catch(() => undefined);
      }
      throw new HttpError(`HTTP ${response.status}`, response.status, body);
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof HttpError) throw error;
      if (attempt < maxRetries) {
        lastError = error;
        await sleep(Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt)));
        attempt += 1;
        continue;
      }
      throw error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("HTTP request failed");
}

export async function httpJson<T>(
  url: string,
  init: RequestInit,
  options: HttpRequestOptions = {}
): Promise<T> {
  const response = await httpRequest(url, init, options);
  return (await response.json()) as T;
}

export function bearerAuth(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}
