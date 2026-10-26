import { defaults, validateSettings, checkConnection } from "./api-client.js";
const config = { ...defaults, ...(await chrome.storage.local.get("settings")).settings };
for (const key of ["erpUrl", "token", "idleSeconds"]) document.getElementById(key).value = config[key];
async function showStatus() {
  const { settings = config, queue = [], lastSync, lastError } = await chrome.storage.local.get(["settings", "queue", "lastSync", "lastError"]);
  document.getElementById("connectionStatus").textContent = `Saved ERP: ${settings.erpUrl}. Pending: ${queue.length}. Last upload: ${lastSync ? new Date(lastSync).toLocaleString() : "Never"}.${lastError ? ` ${lastError}` : ""}`;
}
await showStatus();
async function requestHost(erpUrl) {
  const url = new URL(erpUrl);
  if (!await chrome.permissions.request({ origins: [`${url.protocol}//${url.hostname}/*`] })) throw new Error("ERP host permission was not granted");
}
document.getElementById("repair").onclick = async () => {
  document.getElementById("error").textContent = "";
  document.getElementById("message").textContent = "Verifying the saved access at the ERP address…";
  try {
    const current = { ...defaults, ...(await chrome.storage.local.get("settings")).settings };
    const next = validateSettings({ ...current, erpUrl: document.getElementById("erpUrl").value });
    await requestHost(next.erpUrl);
    const result = await chrome.runtime.sendMessage({ action: "repairConnection", erpUrl: next.erpUrl });
    if (result.error) throw new Error(result.error);
    document.getElementById("message").textContent = `ERP address verified and saved. ${result.message || "Pending activity will sync automatically."}`;
  } catch (error) { document.getElementById("message").textContent = ""; document.getElementById("error").textContent = error.message; }
  await showStatus();
};
document.getElementById("sync").onclick = async () => {
  document.getElementById("error").textContent = "";
  const result = await chrome.runtime.sendMessage({ action: "sync" });
  document.getElementById("message").textContent = result.message || "";
  document.getElementById("error").textContent = result.error || "";
  await showStatus();
};
document.getElementById("settings").onsubmit = async event => {
  event.preventDefault();
  document.getElementById("error").textContent = "";
  try {
    const current = { ...defaults, ...(await chrome.storage.local.get("settings")).settings };
    const settings = validateSettings({ ...current, erpUrl: document.getElementById("erpUrl").value, token: document.getElementById("token").value.trim(), idleSeconds: Number(document.getElementById("idleSeconds").value) });
    const configuredUrl = new URL(settings.erpUrl);
    const origin = `${configuredUrl.protocol}//${configuredUrl.hostname}/*`;
    if (!await chrome.permissions.request({ origins: [origin] })) throw new Error("ERP host permission was not granted");
    const verified = await checkConnection(settings);
    if (verified.credential) { settings.browserName = verified.credential.name; settings.credentialId = verified.credential.id; }
    const result = await chrome.runtime.sendMessage({ action: "configure", settings }); if (result.error) throw new Error(result.error);
    document.getElementById("message").textContent = "Connected and saved. Open the extension popup and click Enable automatic tracking once.";
  } catch (e) { document.getElementById("error").textContent = e.message; }
};
document.getElementById("check").onclick = async () => {
  document.getElementById("error").textContent = "";
  document.getElementById("message").textContent = "Checking…";
  try {
    const current = { ...defaults, ...(await chrome.storage.local.get("settings")).settings };
    const verified = await checkConnection(current);
    document.getElementById("browserName").textContent = verified.credential?.name ? `Browser: ${verified.credential.name}` : "Saved connection verified. Check this browser from ERP to load its name.";
    document.getElementById("message").textContent = "Connected. The ERP accepts your saved credential. Activity appears after the idle safety buffer.";
  } catch (error) { document.getElementById("message").textContent = ""; document.getElementById("error").textContent = error.message; }
};
document.getElementById("export").onclick = async () => {
  const { queue = [] } = await chrome.storage.local.get("queue");
  const url = URL.createObjectURL(new Blob([JSON.stringify(queue, null, 2)], { type: "application/json" }));
  const link = document.createElement("a"); link.href = url; link.download = "work-tracker-pending.json"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
document.getElementById("clear").onclick = async () => {
  if (!confirm("Permanently discard all unsent time records and pause tracking? Export first if needed.")) return;
  await chrome.runtime.sendMessage({ action: "clearQueue" }); document.getElementById("message").textContent = "Queue cleared and tracking paused.";
};

document.getElementById("disconnect").onclick = async () => {
  const result = await chrome.runtime.sendMessage({ action: "disconnect" });
  if (result.error) document.getElementById("error").textContent = result.error;
  else location.reload();
};

document.getElementById("browserName").textContent = config.token ? `Browser: ${config.browserName || "Check saved connection to load its name"}` : "This Chrome profile is not connected yet.";
try {
  const url = new URL(config.erpUrl);
  if (url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) document.getElementById("erpLink").href = `${url.origin}/work-tracker`;
} catch { /* Keep the production ERP link */ }
