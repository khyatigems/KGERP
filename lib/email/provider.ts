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

function defaultProviderName(): string {
  return process.env.EMAIL_PROVIDER || "noop";
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
registerEmailProvider(new ZohoMailConnector());
