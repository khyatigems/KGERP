import { httpJson } from "@/lib/marketplace/http";
import {
  saveZohoOAuthTokens,
  loadZohoOAuthTokens,
} from "@/lib/email/oauth";
import type { EmailProvider, EmailMessage, EmailSendResult, InboundEmail } from "@/lib/email/types";

const SCOPES = "ZohoMail.accounts.ALL,ZohoMail.messages.ALL,ZohoMail.folders.READ";

// Zoho data center (accounts + mail API). Set ZOHO_DATACENTER=in for India,
// com (default), eu, com.au, jp, etc. Accounts must match the DC the client
// was created in, otherwise the token endpoint returns no access_token.
const ZOHO_DC = (process.env.ZOHO_DATACENTER || "com").trim().replace(/^\./, "") || "com";
const AUTH_URL = `https://accounts.zoho.${ZOHO_DC}/oauth/v2/auth`;
const TOKEN_URL = `https://accounts.zoho.${ZOHO_DC}/oauth/v2/token`;
const MAIL_API = `https://mail.zoho.${ZOHO_DC}/api`;

function env(name: string): string {
  return (process.env[name] || "").trim();
}

export function formatZohoFromAddress(address: string, displayName = "KhyatiGems"): string {
  const mailbox = address.match(/<([^<>]+)>/)?.[1]?.trim() || address.trim();
  const name = displayName.trim() || "KhyatiGems";
  const quotedName = name.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${quotedName}" <${mailbox}>`;
}

interface ZohoOAuthResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number | string;
  scope?: string;
  error?: string;
  error_description?: string;
}

interface ZohoInboundMessage {
  messageId?: unknown;
  fromAddress?: unknown;
  subject?: unknown;
  content?: unknown;
  summary?: unknown;
  receivedTime?: unknown;
  receivedtime?: unknown;
  inReplyTo?: unknown;
  references?: unknown;
  toAddress?: unknown;
  ccAddress?: unknown;
}

interface ZohoFolder {
  folderId?: unknown;
  folderName?: unknown;
  folderType?: unknown;
  name?: unknown;
}

export function resolveZohoInboxFolderId(folders: unknown): string | null {
  const values = Array.isArray(folders)
    ? folders
    : folders && typeof folders === "object" && !Array.isArray(folders)
      ? Object.values(folders as Record<string, unknown>).find(Array.isArray) as unknown[] | undefined
      : undefined;
  if (!values) return null;
  const inbox = values.find((entry: unknown) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
    const folder = entry as ZohoFolder;
    return [folder.folderName, folder.folderType, folder.name]
      .some((value) => typeof value === "string" && value.trim().toLowerCase() === "inbox");
  }) as ZohoFolder | undefined;
  return inbox && (typeof inbox.folderId === "string" || typeof inbox.folderId === "number")
    ? String(inbox.folderId)
    : null;
}

export function parseZohoTimestamp(value: unknown): Date | null {
  if (typeof value === "number" || (typeof value === "string" && /^\d+$/.test(value))) {
    const numeric = Number(value);
    const milliseconds = numeric < 100_000_000_000 ? numeric * 1000 : numeric;
    const date = new Date(milliseconds);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function zohoErrorDetails(body: unknown): string {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "";
  const record = body as Record<string, unknown>;
  const status = record.status && typeof record.status === "object" && !Array.isArray(record.status)
    ? record.status as Record<string, unknown>
    : {};
  const values = [
    record.code,
    record.error,
    status.code,
    record.description,
    record.message,
    status.description,
  ].filter((value): value is string | number => typeof value === "string" || typeof value === "number");
  const unique = [...new Set(values.map(String).map((value) => value.trim()).filter(Boolean))];
  return unique.length ? ` Zoho response: ${unique.join(" — ")}.` : "";
}

function readMessageContent(value: unknown): { textBody: string | null; htmlBody: string | null } {
  if (Array.isArray(value)) return readMessageContent(value[0]);
  if (typeof value === "string") {
    const content = value.trim();
    if (!content) return { textBody: null, htmlBody: null };
    if (/<(?:html|body|div|p|br|table|style|span)\b/i.test(content)) {
      return { textBody: null, htmlBody: content };
    }
    return { textBody: content, htmlBody: null };
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const html = record.htmlContent ?? record.htmlBody;
    const text = record.textContent ?? record.textBody;
    if (typeof html === "string" || typeof text === "string") {
      return { textBody: typeof text === "string" ? text : null, htmlBody: typeof html === "string" ? html : null };
    }
    return readMessageContent(record.content);
  }
  return { textBody: null, htmlBody: null };
}

function tokenExpiry(expiresIn: number | string | undefined): string | null {
  const seconds = Number(expiresIn);
  return Number.isFinite(seconds) && seconds > 0
    ? new Date(Date.now() + seconds * 1000).toISOString()
    : null;
}

/**
 * Zoho Mail integration (OAuth 2.0). Sends via the Zoho Mail REST API and can
 * poll the inbox for inbound replies. Tokens are stored encrypted server-side.
 */
export class ZohoMailConnector implements EmailProvider {
  readonly name = "zoho";

  private get clientId() {
    return env("ZOHO_CLIENT_ID");
  }
  private get clientSecret() {
    return env("ZOHO_CLIENT_SECRET");
  }
  private get redirectUri() {
    return env("ZOHO_REDIRECT_URI");
  }
  private get fromAddress() {
    return env("ZOHO_MAIL_FROM");
  }
  private get fromName() {
    return env("ZOHO_MAIL_FROM_NAME") || "KhyatiGems";
  }

  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret && this.redirectUri);
  }

  async getConnectedAccount(): Promise<{ email: string; accountId: string } | null> {
    if (!this.isConfigured()) return null;
    try {
      const token = await this.getAccessToken();
      const account = await this.getAccount(token);
      return { email: account.primaryEmailAddress, accountId: account.accountId };
    } catch {
      return null;
    }
  }

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      scope: SCOPES,
      client_id: this.clientId,
      response_type: "code",
      redirect_uri: this.redirectUri,
      access_type: "offline",
      prompt: "consent",
      state,
    });
    return `${AUTH_URL}?${params.toString()}`;
  }

  async exchangeAuthorizationCode(code: string): Promise<void> {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
      code,
    });
    const data = await httpJson<ZohoOAuthResponse>(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    console.log("[zoho] token response keys:", Object.keys(data));
    if (!data.access_token) {
      console.error("[zoho] unexpected token response:", JSON.stringify(data));
      throw new Error(
        `Zoho token exchange failed: ${data.error || "no access_token returned"}${data.error_description ? ` — ${data.error_description}` : ""}`
      );
    }
    await saveZohoOAuthTokens({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: tokenExpiry(data.expires_in),
      scope: data.scope,
    });
  }

  private async getAccessToken(): Promise<string> {
    const tokens = await loadZohoOAuthTokens();
    if (!tokens?.accessToken) {
      throw new Error("Zoho Mail is not connected. Complete OAuth first.");
    }
    if (tokens.expiresAt && new Date(tokens.expiresAt).getTime() - Date.now() > 5 * 60 * 1000) {
      return tokens.accessToken;
    }
    if (!tokens.refreshToken) {
      throw new Error("Zoho access token expired and no refresh token is available.");
    }
    return this.refreshAccessToken(tokens.refreshToken);
  }

  private async refreshAccessToken(refreshToken: string): Promise<string> {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
    });
    const data = await httpJson<ZohoOAuthResponse>(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!data.access_token) throw new Error("Zoho token refresh did not return an access token");
    await saveZohoOAuthTokens({
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: tokenExpiry(data.expires_in),
      scope: data.scope,
    });
    return data.access_token;
  }

  private async getHeaders(token: string): Promise<Record<string, string>> {
    return {
      Authorization: `Zoho-oauthtoken ${token}`,
      Accept: "application/json",
    };
  }

  private async getAccount(token: string): Promise<{ accountId: string; primaryEmailAddress: string }> {
    const data = await httpJson<{ data?: Array<{ accountId: string; primaryEmailAddress?: string }> }>(
      `${MAIL_API}/accounts`,
      { headers: await this.getHeaders(token) }
    );
    const account = data?.data?.[0];
    if (!account?.accountId) throw new Error("No Zoho Mail account found for this token");
    return { accountId: account.accountId, primaryEmailAddress: account.primaryEmailAddress || "" };
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    if (!this.isConfigured()) {
      return { status: "FAILED", error: "Zoho Mail client credentials not configured" };
    }

    try {
      const token = await this.getAccessToken();
      const headers = await this.getHeaders(token);
      const account = await this.getAccount(token);
      const accountId = account.accountId;
      const senderMailbox = this.fromAddress || account.primaryEmailAddress;
      if (!senderMailbox) {
        return { status: "FAILED", error: "No valid From address (set ZOHO_MAIL_FROM or use the account's primary email)" };
      }
      const fromAddress = formatZohoFromAddress(senderMailbox, this.fromName);

      const attachments: Array<{ storeName: string; attachmentPath: string; attachmentName: string }> = [];
      for (const a of message.attachments ?? []) {
        const form = new FormData();
        form.append("attach", new Blob([new Uint8Array(a.content)], { type: a.mimeType }), a.fileName);
        const up = await httpJson<{
          data?:
            | Array<{ storeName: string; attachmentName: string; attachmentPath: string }>
            | { storeName: string; attachmentName: string; attachmentPath: string };
        }>(`${MAIL_API}/accounts/${accountId}/messages/attachments?uploadType=multipart`, {
          method: "POST",
          headers,
          body: form,
        });
        const uploaded = Array.isArray(up?.data) ? up.data[0] : up?.data;
        if (uploaded?.storeName) {
          attachments.push({
            storeName: uploaded.storeName,
            attachmentPath: uploaded.attachmentPath,
            attachmentName: uploaded.attachmentName || a.fileName,
          });
        }
      }

      const payload: Record<string, unknown> = {
        fromAddress,
        toAddress: message.to,
        subject: message.subject,
        mailFormat: message.html ? "html" : "plaintext",
        content: message.html || message.text || "",
        ...(message.cc?.length ? { ccAddress: message.cc.join(",") } : {}),
        ...(message.bcc?.length ? { bccAddress: message.bcc.join(",") } : {}),
        ...(attachments.length ? { attachments } : {}),
      };

      console.log("[zoho] sending to", message.to, "attachments:", attachments.length);

      const data = await httpJson<{ data?: { messageId?: string } }>(
        `${MAIL_API}/accounts/${accountId}/messages`,
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      return { status: "SENT", providerMessageId: data?.data?.messageId || undefined };
    } catch (error) {
      const err = error as { message?: string; body?: unknown };
      const detail = err.body ? JSON.stringify(err.body) : "";
      console.error("[zoho] send failed:", err.message, detail);
      return {
        status: "FAILED",
        error: detail ? `${err.message} — ${detail}` : (err.message ?? String(error)),
      };
    }
  }

  async fetchInbox(limit = 50): Promise<InboundEmail[]> {
    const token = await this.getAccessToken();
    const headers = await this.getHeaders(token);
    const account = await this.getAccount(token);
    const accountId = account.accountId;
    let folderResponse: { data?: unknown };
    try {
      folderResponse = await httpJson<{ data?: unknown }>(
        `${MAIL_API}/accounts/${accountId}/folders`,
        { headers },
      );
    } catch (error) {
      const status = error && typeof error === "object" && "status" in error
        ? Number((error as { status?: unknown }).status)
        : 0;
      if (status === 401 || status === 403) {
        const details = error && typeof error === "object" && "body" in error
          ? zohoErrorDetails((error as { body?: unknown }).body)
          : "";
        throw new Error(
          `Zoho denied access to the folder list (HTTP ${status}). Reconnect Zoho Mail, approve the requested folders:READ permission, and try syncing again.${details}`,
        );
      }
      throw error;
    }
    const folderId = resolveZohoInboxFolderId(folderResponse.data);
    if (!folderId) {
      throw new Error("Zoho Mail did not return an Inbox folder for the connected account");
    }

    const data = await httpJson<{ data?: ZohoInboundMessage[] }>(
      `${MAIL_API}/accounts/${accountId}/messages/view?folderId=${encodeURIComponent(folderId)}&start=1&limit=${limit}`,
      { headers }
    );

    if (!Array.isArray(data.data)) {
      throw new Error("Zoho Mail returned an unexpected response while listing Inbox messages");
    }

    return Promise.all(data.data.map(async (m) => {
      let messageContent = readMessageContent(m.content);
      if (!messageContent.textBody && !messageContent.htmlBody) {
        messageContent = readMessageContent(m.summary);
      }
      let contentError: string | null = null;
      if ((!messageContent.textBody && !messageContent.htmlBody) && m.messageId) {
        try {
          const detail = await httpJson<{ data?: unknown }>(
            `${MAIL_API}/accounts/${accountId}/folders/${encodeURIComponent(folderId)}/messages/${encodeURIComponent(String(m.messageId))}/content`,
            { headers },
          );
          messageContent = readMessageContent(detail.data ?? detail);
        } catch (error) {
          console.error("[zoho] could not fetch inbound message content:", m.messageId, error);
          const details = error && typeof error === "object" && "body" in error
            ? zohoErrorDetails((error as { body?: unknown }).body)
            : "";
          contentError = `${error instanceof Error ? error.message : "Zoho message content could not be fetched"}${details}`.slice(0, 500);
        }
      }
      return {
        providerMessageId: m.messageId ? String(m.messageId) : "",
        messageId: m.messageId ? String(m.messageId) : "",
        from: m.fromAddress ? String(m.fromAddress) : "",
        cc: typeof m.ccAddress === "string"
          ? m.ccAddress
          : Array.isArray(m.ccAddress)
            ? m.ccAddress.map((address) => typeof address === "string" ? address : "").filter(Boolean).join(", ")
            : null,
        subject: m.subject ? String(m.subject) : "(no subject)",
        ...messageContent,
        contentError,
        receivedAt: parseZohoTimestamp(m.receivedTime ?? m.receivedtime),
        inReplyTo: typeof m.inReplyTo === "string" ? m.inReplyTo : null,
        references: Array.isArray(m.references) ? m.references.map(String) : [],
      };
    }));
  }
}
