"use client";

import { useEffect, useRef, useState } from "react";
import { toast, useSonner, type ToastT } from "sonner";
import { COMPANION_TOASTER_ID, setCompanionActive } from "@/lib/companion-runtime";

export type CompanionFeedback = ToastT & { receivedAt: string; read: boolean; revision: number };
let retained: { userId: string; items: CompanionFeedback[] } | null = null;
export function useCompanionFeedback(userId: string) {
  const { toasts } = useSonner();
  const [history, setHistory] = useState<CompanionFeedback[]>(() => retained?.userId === userId ? retained.items : []);
  useEffect(() => { retained = { userId, items: history }; }, [userId, history]);
  const revision = useRef(0);
  useEffect(() => {
    const existing = toast.getToasts().filter((item): item is ToastT => !("dismiss" in item));
    setHistory(current => [...existing.slice(-100).reverse().map(item => ({ ...item, receivedAt: new Date().toISOString(), read: false, revision: ++revision.current })), ...current.filter(item => !existing.some(active => active.id === item.id))].slice(0, 100));
    setCompanionActive(true);
    document.documentElement.dataset.companionOn = "true";
    return () => {
      setCompanionActive(false);
      delete document.documentElement.dataset.companionOn;
      toast.getToasts().forEach(item => {
        if (!("dismiss" in item) && item.toasterId === COMPANION_TOASTER_ID && item.type !== "loading") toast.dismiss(item.id);
      });
    };
  }, []);
  const seen = useRef(new Map<string | number, ToastT>());
  useEffect(() => {
    const activeIds = new Set(toasts.map(item => item.id));
    const removed = new Set([...seen.current.keys()].filter(id => !activeIds.has(id)));
    const updates = toasts.filter(item => seen.current.get(item.id) !== item);
    if (!updates.length && !removed.size) return;
    removed.forEach(id => seen.current.delete(id));
    updates.forEach(item => seen.current.set(item.id, item));
    setHistory(current => {
      const ids = new Set(updates.map(item => item.id));
      return [...updates.map(item => ({ ...item, receivedAt: new Date().toISOString(), read: false, revision: ++revision.current })), ...current.filter(item => !ids.has(item.id)).map(item => removed.has(item.id) ? { ...item, read: true } : item)].slice(0, 100);
    });
    // Sonner's unmounted companion toaster has no automatic expiry timer.
    // Explicitly retire overflow records while preserving promise/loading updates.
    if (toasts.length > 100) toasts.slice(100).filter(item => item.toasterId === COMPANION_TOASTER_ID && item.type !== "loading").forEach(item => { seen.current.delete(item.id); toast.dismiss(item.id); });
  }, [toasts]);
  const acknowledge = (id?: string | number) => {
    setHistory(current => current.map(item => id === undefined || item.id === id ? { ...item, read: true } : item));
    if (id !== undefined) toast.dismiss(id);
  };
  return { history, acknowledge };
}
