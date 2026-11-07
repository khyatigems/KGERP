/** Existing persistence keys remain unchanged; presentation can group terminal updates. */
export function businessStoryKey(eventKey: string) {
  return eventKey.startsWith("report-export:") ? eventKey.replace(/:(completed|failed)$/, "") : eventKey;
}
export const inventoryCreatedEventKey = (id: string) => `inventory-created:${id}`;
export const saleCreatedEventKey = (id: string) => `sale-created:${id}`;
const feedbackIdentities = new Map<string | number, string>();
/** Only identifiers are retained here. Executable actions remain in transient feedback. */
export function associateFeedbackEvent(toastId: string | number, eventKey: string) {
  feedbackIdentities.set(toastId, eventKey);
  if (feedbackIdentities.size > 200) feedbackIdentities.delete(feedbackIdentities.keys().next().value!);
}
export function feedbackEventKey(toastId: string | number) {
  return feedbackIdentities.get(toastId) || String(toastId);
}

export function clearFeedbackEvent(toastId: string | number) { feedbackIdentities.delete(toastId); }
