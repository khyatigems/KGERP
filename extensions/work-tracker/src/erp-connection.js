import { validateSettings, checkConnection } from "./api-client.js";
export function trustedErpSender(sender) {
 try {
  const url = new URL(sender.url);
  return url.origin === "https://erp.khyatigems.com" || (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname));
 } catch { return false; }
}
export async function connectionStatus(sender, settings, stored = {}, fetcher = fetch) {
 if (!trustedErpSender(sender)) throw new Error("Untrusted ERP origin");
 const base = { ok: true, protocol: 2, connected: false };
 if (settings.token && settings.erpUrl !== new URL(sender.url).origin) return { ...base, state: "other-erp" };
 const local = { pendingCount: stored.queue?.length || 0, enabled: !!settings.enabled, lastSync: stored.lastSync || null };
 if (!settings.token) return { ...base, ...local, state: "unconfigured" };
 try {
  const result = await checkConnection(settings, fetcher);
  if (!result.credential?.id || !result.credential?.name) return { ...base, ...local, state: "update-required" };
  return { ...base, ...local, connected: true, state: "connected", credentialId: result.credential.id, browserName: result.credential.name, expiresAt: result.credential.expiresAt };
 } catch (error) {
  return { ...base, ...local, state: error.status === 401 ? "invalid" : "unreachable" };
 }
}
export async function connectFromErp(message, sender, old, queue, fetcher = fetch) {
 if (!trustedErpSender(sender)) throw new Error("Untrusted ERP origin");
 if (message.erpUrl !== new URL(sender.url).origin) throw new Error("ERP origin mismatch");
 if (queue.length) throw new Error("Sync or export and clear pending records before connecting.");
 if (old.token) {
  if (old.enabled) throw new Error("Pause tracking in extension Settings before reconnecting.");
  const state = await connectionStatus(sender, old, { queue }, fetcher);
  if (state.state !== "invalid") throw new Error("This profile already has a connection. Check it from ERP or disconnect in extension Settings first.");
 }
 if (typeof message.browserName !== "string" || !message.browserName.trim() || message.browserName.length > 80) throw new Error("Invalid browser name");
 const next = validateSettings({ ...old, erpUrl: message.erpUrl, token: message.token, enabled: false });
 const result = await checkConnection(next, fetcher);
 if (result.credential?.id !== message.credentialId) throw new Error("ERP credential verification failed. Update ERP and retry.");
 return { ...next, browserName: result.credential.name, credentialId: result.credential.id };
}
