import { defaults } from "./api-client.js";
async function refresh() {
 const data = await chrome.storage.local.get(["settings", "active", "queue", "lastError", "lastSync"]);
 const settings = { ...defaults, ...data.settings };
 document.getElementById("status").textContent = settings.enabled ? data.active ? "Automatically tracking the active marketplace" : "Waiting for an eligible marketplace tab" : "Tracking paused";
 document.getElementById("queue").textContent = `${data.queue?.length || 0} pending records · Last sync: ${data.lastSync || "never"}`;
 const readyCount = (data.queue || []).filter(record => Date.parse(record.occurredAt) <= Date.now() - (settings.idleSeconds * 1000 + 90000)).length;
 const syncMessage = document.getElementById("syncStatus");
 syncMessage.textContent = !settings.token ? "Connect the extension to your ERP to upload activity." : readyCount ? `${readyCount} records ready to upload automatically.` : data.queue?.length ? "Recent activity is still in the idle safety buffer. It uploads automatically when eligible." : "Ready records sync automatically while Chrome is running.";
 document.getElementById("error").textContent = data.lastError || "";
}
document.getElementById("settings").onclick = () => chrome.runtime.openOptionsPage();
for (const button of document.querySelectorAll("[data-action]")) button.onclick = async () => {
 button.disabled = true;
 try { const result = await chrome.runtime.sendMessage({ action: button.dataset.action, platform: "AUTO", activityType: "OTHER" }); await refresh(); document.getElementById("message").textContent = result.message || ""; if (result.error) document.getElementById("error").textContent = result.error; }
 catch (e) { document.getElementById("error").textContent = e.message; } finally { button.disabled = false; }
};
await refresh();
