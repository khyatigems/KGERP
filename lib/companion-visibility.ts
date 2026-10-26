"use client";

// Match the ERP's desktop navigation breakpoint and exclude short windows.
export const COMPANION_DESKTOP_QUERY = "(min-width: 1024px) and (min-height: 600px)";
export const companionDesktopViewport = {
  getSnapshot: () => window.matchMedia(COMPANION_DESKTOP_QUERY).matches,
  getServerSnapshot: () => false,
  subscribe(listener: () => void) {
    const query = window.matchMedia(COMPANION_DESKTOP_QUERY);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  },
};

type Visibility = { available: boolean; enabled: boolean; desktop: boolean; pending: boolean; error: string };
type Toggle = (enabled: boolean) => Promise<{ error?: string }>;
const initial: Visibility = { available: false, enabled: false, desktop: false, pending: false, error: "" };
let snapshot = initial;
let toggle: Toggle | null = null;
const listeners = new Set<() => void>();
function publish(next: Visibility) {
  if (Object.keys(next).every(key => next[key as keyof Visibility] === snapshot[key as keyof Visibility])) return;
  snapshot = next;
  listeners.forEach(listener => listener());
}
export const companionVisibility = {
  getSnapshot: () => snapshot,
  getServerSnapshot: () => initial,
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
};

export function registerCompanionVisibility(handler: Toggle) {
  toggle = handler;
  return () => {
    if (toggle !== handler) return;
    toggle = null;
    publish(initial);
  };
}
export function publishCompanionVisibility(enabled: boolean, desktop: boolean) {
  publish({ ...snapshot, available: true, enabled, desktop });
}
export async function toggleCompanionVisibility() {
  const handler = toggle;
  if (!handler || !snapshot.available || !snapshot.desktop || snapshot.pending) return;
  const previous = snapshot.enabled;
  publish({ ...snapshot, enabled: !previous, pending: true, error: "" });
  try {
    const result = await handler(!previous);
    if (toggle !== handler) return;
    publish({ ...snapshot, enabled: result.error ? previous : !previous, pending: false, error: result.error || "" });
  } catch {
    if (toggle === handler) publish({ ...snapshot, enabled: previous, pending: false, error: "Could not save companion visibility. Please try again." });
  }
}
