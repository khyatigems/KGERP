export const defaults = { erpUrl: "https://erp.khyatigems.com", token: "", idleSeconds: 300, enabled: false, activityType: "OTHER", platform: "AUTO" };
export function erpOrigin(value) {
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/" || (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))) throw new Error("Use an HTTPS ERP origin (HTTP allowed only on localhost)");
  return url.origin;
}
export function validateSettings(settings) {
  const origin = erpOrigin(settings.erpUrl);
  if (!Number.isInteger(settings.idleSeconds) || settings.idleSeconds < 60 || settings.idleSeconds > 1800) throw new Error("Idle threshold must be 60–1800 seconds");
  if (!/^kgwt_[A-Za-z0-9_-]{43}$/.test(settings.token)) throw new Error("Paste a personal Work Tracker credential from the ERP");
  return { ...settings, erpUrl: origin };
}
async function erpFetch(config, path, options, fetcher) {
  try {
    return await fetcher(`${erpOrigin(config.erpUrl)}/api/work-tracker/${path}`, { ...options, credentials: "omit", redirect: "error", signal: AbortSignal.timeout(15000) });
  } catch (cause) {
    throw new Error(`Cannot reach ${erpOrigin(config.erpUrl)} (${cause.message || "network error"}). Check that this ERP address opens in Chrome and the extension has site access. If the ERP address changed, use Repair ERP address in extension Settings. Pending activity is preserved.`, { cause });
  }
}
export async function sendEvents(settings, events, fetcher = fetch) {
  const response = await erpFetch(settings, "activity-events", { method: "POST", headers: { Authorization: `Bearer ${settings.token}`, "Content-Type": "application/json" }, body: JSON.stringify({ events }) }, fetcher);
  if (!response.ok) { const error = new Error(`Sync failed (${response.status}); check credentials, server and queued event age`); error.status = response.status; throw error; }
  const result = await response.json();
  if (!Array.isArray(result.accepted)) throw new Error("Unexpected ERP response");
  const requested = new Set(events.map(event => event.id));
  if (result.accepted.some(id => typeof id !== "string" || !requested.has(id))) throw new Error("ERP returned an invalid event acknowledgement");
  return [...new Set(result.accepted)];
}
export async function checkConnection(settings, fetcher = fetch) {
  const config = validateSettings(settings);
  const response = await erpFetch(config, "sensor-status", { headers: { Authorization: `Bearer ${config.token}` } }, fetcher);
  if (!response.ok) {
    const error = new Error(response.status === 401 ? "Credential expired or revoked. Reconnect this browser from ERP." : `Connection failed (${response.status}). Check the ERP address and server.`);
    error.status = response.status; throw error;
  }
  const result = await response.json();
  if (result.connected !== true) throw new Error("This ERP does not support the sensor connection check. Update the ERP first.");
  return result;
}
