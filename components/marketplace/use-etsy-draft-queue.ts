"use client";
import { useCallback, useSyncExternalStore, type Dispatch, type SetStateAction } from "react";
import { z } from "zod";
import type { QueuedEtsyDraft } from "./etsy-draft-batch";

const key = "khyatigems-etsy-draft-queue-v1";
const queueSchema = z.array(z.object({ key: z.string(), sku: z.string(), title: z.string(), shop: z.string(), prices: z.string(), request: z.record(z.string(), z.unknown()), result: z.string().optional(), saved: z.boolean().optional(), failed: z.boolean().optional() })).max(25);
const empty: QueuedEtsyDraft[] = [];
let cached = empty;
let initialized = false;
const changed = "etsy-draft-queue-changed";
function snapshot() {
  if (!initialized && typeof window !== "undefined") {
    initialized = true;
    try { const parsed = queueSchema.safeParse(JSON.parse(sessionStorage.getItem(key) || "[]")); if (parsed.success) cached = parsed.data; } catch { /* In-memory queue remains usable. */ }
  }
  return cached;
}
function subscribe(listener: () => void) {
  window.addEventListener(changed, listener);
  return () => window.removeEventListener(changed, listener);
}
export function useEtsyDraftQueue() {
  const items = useSyncExternalStore(subscribe, snapshot, () => empty);
  const setItems: Dispatch<SetStateAction<QueuedEtsyDraft[]>> = useCallback((update) => {
    cached = typeof update === "function" ? update(snapshot()) : update;
    initialized = true;
    try { sessionStorage.setItem(key, JSON.stringify(cached)); } catch { /* In-memory queue remains usable. */ }
    window.dispatchEvent(new Event(changed));
  }, []);
  return [items, setItems] as const;
}
