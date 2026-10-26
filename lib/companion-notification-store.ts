"use client";

import type { CompanionNotice } from "@/lib/companion";

type Controls = { hasMore?: boolean; unreadCount?: number; loadingMore?: boolean; refresh?: () => void; loadMore?: () => void };
type Snapshot = { items: CompanionNotice[]; status: "loading" | "ready" | "error" } & Controls;
const initial: Snapshot = { items: [], status: "loading" };
let snapshot = initial;
const listeners = new Set<() => void>();
export function publishCompanionNotifications(items: CompanionNotice[], status: Snapshot["status"] = "ready", controls: Controls = {}) {
  snapshot = { items, status, ...controls };
  listeners.forEach(listener => listener());
}
export function acknowledgeCompanionNotice(id: string) {
  const count = snapshot.items.filter(item => (id === "all" || item.id === id) && !item.readAt).length;
  snapshot = { ...snapshot, unreadCount: Math.max(0, (snapshot.unreadCount ?? count) - count), items: snapshot.items.map(item => id === "all" || item.id === id ? { ...item, readAt: item.readAt || new Date().toISOString() } : item) };
  listeners.forEach(listener => listener());
}
export const companionNotificationStore = {
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  getSnapshot: () => snapshot,
  getServerSnapshot: () => initial,
};
