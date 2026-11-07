"use client";
export function publishNotificationReview() {
  window.dispatchEvent(new Event("erp:notification-read"));
  try { localStorage.setItem("erp:notification-review", String(Date.now())); } catch { /* Optional cross-tab refresh. */ }
}
export async function reviewNotifications(input: { id?: string; ids?: string[]; all?: boolean; action?: "read" | "acknowledge" | "snooze"; minutes?: number }) {
  const response = await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  if (!response.ok) throw new Error("Could not update notification. Please try again.");
  publishNotificationReview();
}
