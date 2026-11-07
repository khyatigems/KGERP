"use client";

let active = false;
const listeners = new Set<() => void>();
export const companionRuntime = {
  getSnapshot: () => active,
  getServerSnapshot: () => false,
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
};
export function setCompanionActive(value: boolean) {
  if (active === value) return;
  active = value;
  listeners.forEach(listener => listener());
}
export function isMarketplaceSyncToast(id?: string | number, className?: string) {
  return String(id ?? "").startsWith("marketplace-sync-") || !!className?.includes("erp-marketplace-sync-toast");
}
export const COMPANION_TOASTER_ID = "erp-companion";
export function companionToastOptions<T extends { id?: string | number; className?: string; toasterId?: string }>(options: T): T {
  return active && !isMarketplaceSyncToast(options.id, options.className) ? { ...options, toasterId: COMPANION_TOASTER_ID } : options;
}
export const OPEN_COMPANION_EVENT = "erp:open-companion";

/** Explicit producer metadata for custom cards; callbacks stay in the existing toast. */
const operationMetadata = new Map<string | number, { type: "loading" | "success" | "error"; title: string; description: string }>();
export function setCompanionOperationMetadata(id: string | number, value: { type: "loading" | "success" | "error"; title: string; description: string }) {
  operationMetadata.delete(id); operationMetadata.set(id, value);
  if (operationMetadata.size > 100) operationMetadata.delete(operationMetadata.keys().next().value!);
}
export function companionOperationMetadata(id: string | number) { return operationMetadata.get(id); }
