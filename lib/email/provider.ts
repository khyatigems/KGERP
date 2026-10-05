import type { EmailProvider, EmailMessage, EmailSendResult } from "./types";
import { resendEmailProvider } from "./providers/resend";
import { ZohoMailConnector } from "./connectors/zoho";

const providers = new Map<string, EmailProvider>();

export function registerEmailProvider(provider: EmailProvider): void {
  providers.set(provider.name, provider);
}

export function getEmailProvider(name: string): EmailProvider | undefined {
  return providers.get(name);
}

export function listEmailProviders(): string[] {
  return Array.from(providers.keys());
}

function explicitProviderName(): string {
  return (process.env.EMAIL_PROVIDER || "").trim().toLowerCase();
}

function detectProviderName(): string | null {
  if (zohoProvider.isConfigured()) return zohoProvider.name;
  if ((process.env.RESEND_API_KEY || "").trim()) return resendEmailProvider.name;
  return null;
}

function defaultProviderName(): string {
  const explicit = explicitProviderName();
  if (explicit) return explicit;
  const detected = detectProviderName();
  if (detected) {
    warnOnce(
      `[email] EMAIL_PROVIDER is not set. Auto-selected "${detected}" from its configured credentials.`,
    );
    return detected;
  }
  warnOnce(
    "[email] EMAIL_PROVIDER is not set and no provider credentials were found (ZOHO_* / RESEND_API_KEY). " +
      "Emails will be logged as queued but NOT delivered. Set EMAIL_PROVIDER=zoho in your environment.",
  );
  return "noop";
}

const warned = new Set<string>();
function warnOnce(message: string): void {
  if (warned.has(message)) return;
  warned.add(message);
  console.warn(message);
}

export function resolveEmailProvider(): EmailProvider {
  const name = defaultProviderName();
  const provider = providers.get(name);
  if (!provider) {
    throw new Error(`Email provider "${name}" is not registered. Configure EMAIL_PROVIDER.`);
  }
  return provider;
}

/**
 * No-op provider used as a safe default during rollout. It records the send
 * attempt without delivering. Swap via EMAIL_PROVIDER once a real provider
 * (e.g. Resend or SMTP) is wired up.
 */
export const noopEmailProvider: EmailProvider = {
  name: "noop",
  async send(message: EmailMessage): Promise<EmailSendResult> {
    console.info("[email] noop provider (not delivered):", {
      to: message.to,
      subject: message.subject,
      attachments: message.attachments?.map((a) => a.fileName),
    });
    return { status: "QUEUED", providerMessageId: `noop_${Date.now()}` };
  },
};

registerEmailProvider(noopEmailProvider);
registerEmailProvider(resendEmailProvider);
const zohoProvider = new ZohoMailConnector();
registerEmailProvider(zohoProvider);
