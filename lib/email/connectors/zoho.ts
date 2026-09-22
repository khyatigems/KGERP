import { httpJson } from "@/lib/marketplace/http";
import {
  saveZohoOAuthTokens,
  loadZohoOAuthTokens,
} from "@/lib/email/oauth";
import type { EmailProvider, EmailMessage, EmailSendResult, InboundEmail } from "@/lib/email/types";

const SCOPES = "ZohoMail.accounts.ALL,ZohoMail.messages.ALL";

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

  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret && this.redirectUri);
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
    const data = await httpJson<Record<string, any>>(TOKEN_URL, {
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
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null,
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
    const data = await httpJson<Record<string, any>>(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    await saveZohoOAuthTokens({
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null,
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
      const fromAddress = this.fromAddress || account.primaryEmailAddress;
      if (!fromAddress) {
        return { status: "FAILED", error: "No valid From address (set ZOHO_MAIL_FROM or use the account's primary email)" };
      }

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
    console.log("[zoho] inbox accountId:", accountId);

    const data = await httpJson<{ data?: Array<Record<string, any>> }>(
      `${MAIL_API}/accounts/${accountId}/messages/view?start=1&limit=${limit}`,
      { headers }
    );

    console.log(
      "[zoho] inbox raw count:",
      data?.data?.length,
      "first keys:",
      data?.data?.[0] ? Object.keys(data.data[0]).join(",") : "none"
    );

    return (data.data || []).map((m) => ({
      providerMessageId: m.messageId ? String(m.messageId) : "",
      from: m.fromAddress ? String(m.fromAddress) : "",
      subject: m.subject ? String(m.subject) : "(no subject)",
      textBody: m.content ? String(m.content) : null,
      htmlBody: null,
      receivedAt: m.receivedTime ? new Date(m.receivedTime) : new Date(),
      references: [],
    }));
  }
}
