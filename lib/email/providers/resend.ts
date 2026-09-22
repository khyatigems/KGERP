import { httpRequest } from "@/lib/marketplace/http";
import type { EmailProvider, EmailMessage, EmailSendResult } from "@/lib/email/types";

function env(name: string): string {
  return (process.env[name] || "").trim();
}

function fromAddress(): string {
  return env("EMAIL_FROM") || env("RESEND_FROM") || "KhyatiGems <onboarding@resend.dev>";
}

/**
 * Resend transactional email provider (REST API via fetch — no SDK required).
 * Enable with EMAIL_PROVIDER=resend and set RESEND_API_KEY (+ EMAIL_FROM).
 */
export const resendEmailProvider: EmailProvider = {
  name: "resend",
  async send(message: EmailMessage): Promise<EmailSendResult> {
    const apiKey = env("RESEND_API_KEY");
    if (!apiKey) {
      return { status: "FAILED", error: "RESEND_API_KEY is not configured" };
    }

    const payload: Record<string, unknown> = {
      from: fromAddress(),
      to: [message.to],
      subject: message.subject,
      ...(message.html ? { html: message.html } : {}),
      ...(message.text ? { text: message.text } : {}),
      ...(message.cc?.length ? { cc: message.cc } : {}),
      ...(message.bcc?.length ? { bcc: message.bcc } : {}),
      ...(message.attachments?.length
        ? {
            attachments: message.attachments.map((a) => ({
              filename: a.fileName,
              content: a.content.toString("base64"),
            })),
          }
        : {}),
    };

    const response = await httpRequest("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json().catch(() => ({}))) as { id?: string; message?: string };

    if (!response.ok) {
      return { status: "FAILED", error: data.message || `Resend HTTP ${response.status}` };
    }

    return { status: "SENT", providerMessageId: data.id };
  },
};
