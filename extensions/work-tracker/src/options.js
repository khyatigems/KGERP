import { defaults, validateSettings } from "./api-client.js";
const config = { ...defaults, ...(await chrome.storage.local.get("settings")).settings };
for (const key of ["erpUrl", "token", "idleSeconds"]) document.getElementById(key).value = config[key];
document.getElementById("settings").onsubmit = async event => {
  event.preventDefault();
  document.getElementById("error").textContent = "";
  try {
    const settings = validateSettings({ ...config, erpUrl: document.getElementById("erpUrl").value, token: document.getElementById("token").value.trim(), idleSeconds: Number(document.getElementById("idleSeconds").value) });
    const configuredUrl = new URL(settings.erpUrl);
    const origin = `${configuredUrl.protocol}//${configuredUrl.hostname}/*`;
    if (!await chrome.permissions.request({ origins: [origin] })) throw new Error("ERP host permission was not granted");
    const result = await chrome.runtime.sendMessage({ action: "configure", settings }); if (result.error) throw new Error(result.error);
    document.getElementById("message").textContent = "Saved. Use Start in the popup to begin tracking.";
  } catch (e) { document.getElementById("error").textContent = e.message; }
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
