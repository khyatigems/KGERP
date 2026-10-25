import { defaults } from "./api-client.js";
let busy = false;
async function refresh() {
 const data = await chrome.storage.local.get(["settings", "active", "queue", "lastError", "lastSync"]);
 const settings = { ...defaults, ...data.settings };
 const toggle = document.getElementById("trackingToggle");
 // Enabled is the user's switch; active only means an eligible tab is counting now.
 toggle.textContent = settings.enabled ? "Disable automatic tracking" : "Enable automatic tracking";
 toggle.dataset.action = settings.enabled ? "pause" : "resume";
 toggle.classList.toggle("danger", !!settings.enabled);
 toggle.classList.toggle("primary", !settings.enabled);
 toggle.setAttribute("aria-pressed", String(!!settings.enabled));
 toggle.setAttribute("aria-busy", String(busy));
 toggle.disabled = busy || (!settings.enabled && !settings.token);
 toggle.title = !settings.enabled && !settings.token ? "Connect this browser from ERP Work Tracker first" : "";
 document.getElementById("browserName").textContent = settings.token ? `Browser: ${settings.browserName || "Check this browser in ERP to load its name"}` : "Connect this browser from ERP Work Tracker.";
 document.getElementById("status").textContent = settings.enabled ? data.active ? "Automatically tracking the active marketplace" : "Automatic tracking enabled - waiting for an eligible marketplace tab" : settings.token ? "Automatic tracking disabled" : "Browser not connected";
 document.getElementById("queue").textContent = `${data.queue?.length || 0} pending records - Last sync: ${data.lastSync || "never"}`;
 const readyCount = (data.queue || []).filter(record => Date.parse(record.occurredAt) <= Date.now() - (settings.idleSeconds * 1000 + 90000)).length;
 const syncMessage = document.getElementById("syncStatus");
 syncMessage.textContent = !settings.token ? "Connect the extension to your ERP to upload activity." : readyCount ? `${readyCount} records ready to upload automatically.` : data.queue?.length ? "Recent activity is still in the idle safety buffer. It uploads automatically when eligible." : "Ready records sync automatically while Chrome is running.";
 document.getElementById("error").textContent = data.lastError || "";
}
function showError(error) { document.getElementById("error").textContent = error.message || "Unable to update tracking"; }
document.getElementById("settings").onclick = () => chrome.runtime.openOptionsPage();
for (const button of document.querySelectorAll("[data-action]")) button.onclick = async () => {
 if (busy) return;
 busy = true;
 for (const control of document.querySelectorAll("[data-action]")) control.disabled = true;
 document.getElementById("message").textContent = "";
 let failure;
 try {
  let action = button.dataset.action;
  if (button.id === "trackingToggle") {
   const { settings = {} } = await chrome.storage.local.get("settings");
   action = settings.enabled ? "pause" : "resume";
  }
  const result = await chrome.runtime.sendMessage({ action, platform: "AUTO", activityType: "OTHER" });
  if (result?.error) throw new Error(result.error);
  if (!result?.ok) throw new Error("The extension did not confirm the change. Try again.");
  document.getElementById("message").textContent = result.message || "";
 } catch (error) { failure = error; }
 finally {
  busy = false;
  for (const control of document.querySelectorAll("[data-action]")) control.disabled = false;
  try { await refresh(); } catch (error) { failure = failure || error; }
  if (failure) showError(failure);
 }
};
// Keep an open popup current when tracking is changed in Settings or ERP.
chrome.storage.onChanged.addListener((changes, area) => {
 if (area === "local" && ["settings", "active", "queue", "lastError", "lastSync"].some(key => key in changes)) void refresh().catch(showError);
});
await refresh();
