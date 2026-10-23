import { validateSettings, checkConnection } from "./api-client.js";
export function trustedErpSender(sender) {
 try {
  const url = new URL(sender.url);
  return url.origin === "https://erp.khyatigems.com" || (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname));
 } catch { return false; }
}
export async function connectFromErp(message, sender, old, queue, fetcher = fetch) {
 if (!trustedErpSender(sender)) throw new Error("Untrusted ERP origin");
 if (old.token) throw new Error("This profile already has a credential. Clear it in extension Settings before reconnecting.");
 if (queue.length) throw new Error("Sync or export and clear pending records before connecting.");
 if (message.erpUrl !== new URL(sender.url).origin) throw new Error("ERP origin mismatch");
 if (typeof message.browserName !== "string" || !message.browserName.trim() || message.browserName.length > 80) throw new Error("Invalid browser name");
 const next = validateSettings({ ...old, erpUrl: message.erpUrl, token: message.token, enabled: false, browserName: message.browserName.trim(), credentialId: message.credentialId });
 await checkConnection(next, fetcher);
 return next;
}
