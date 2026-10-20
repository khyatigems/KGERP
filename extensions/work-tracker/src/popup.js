import { defaults } from "./api-client.js";
async function refresh() {
 const data = await chrome.storage.local.get(["settings", "active", "queue", "lastError", "lastSync"]);
 const settings = { ...defaults, ...data.settings };
 document.getElementById("status").textContent = settings.enabled ? data.active ? "Automatically tracking the active marketplace" : "Waiting: ERP, idle, unfocused or unsupported tab" : "Tracking paused";
 document.getElementById("queue").textContent = `${data.queue?.length || 0} pending records · Last sync: ${data.lastSync || "never"}`;
 document.getElementById("error").textContent = data.lastError || "";
}
document.getElementById("settings").onclick = () => chrome.runtime.openOptionsPage();
for (const button of document.querySelectorAll("[data-action]")) button.onclick = async () => {
 button.disabled = true;
 try { const result = await chrome.runtime.sendMessage({ action: button.dataset.action, platform: "AUTO", activityType: "OTHER" }); await refresh(); if (result.error) document.getElementById("error").textContent = result.error; }
 catch (e) { document.getElementById("error").textContent = e.message; } finally { button.disabled = false; }
};
await refresh();
