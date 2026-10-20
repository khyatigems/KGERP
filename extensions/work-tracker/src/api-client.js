export const defaults = { erpUrl: "https://erp.khyatigems.com", token: "", idleSeconds: 300, enabled: false, activityType: "OTHER", platform: "AUTO" };
export function validateSettings(settings) {
  const url = new URL(settings.erpUrl);
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/" || (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))) throw new Error("Use an HTTPS ERP origin (HTTP allowed only on localhost)");
  if (!Number.isInteger(settings.idleSeconds) || settings.idleSeconds < 60 || settings.idleSeconds > 1800) throw new Error("Idle threshold must be 60–1800 seconds");
  if (!/^kgwt_[A-Za-z0-9_-]{43}$/.test(settings.token)) throw new Error("Paste a personal Work Tracker credential from the ERP");
  return { ...settings, erpUrl: url.origin };
}
export async function sendEvents(settings, events, fetcher = fetch) {
  const response = await fetcher(`${settings.erpUrl}/api/work-tracker/activity-events`, { method: "POST", credentials: "omit", redirect: "error", headers: { Authorization: `Bearer ${settings.token}`, "Content-Type": "application/json" }, body: JSON.stringify({ events }), signal: AbortSignal.timeout(15000) });
  if (!response.ok) { const error = new Error(`Sync failed (${response.status}); check credentials, server and queued event age`); error.status = response.status; throw error; }
  const result = await response.json();
  if (!Array.isArray(result.accepted)) throw new Error("Unexpected ERP response");
  return result.accepted;
}
