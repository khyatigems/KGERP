"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Toaster as SonnerToaster, toast, useSonner, type ToastT, type ToasterProps } from "sonner";
import { companionRuntime, COMPANION_TOASTER_ID, isMarketplaceSyncToast } from "@/lib/companion-runtime";

/** Reconcile long-running promises that started before the companion was toggled. */
export function FeedbackToaster(props: ToasterProps) {
  const active = useSyncExternalStore(companionRuntime.subscribe, companionRuntime.getSnapshot, companionRuntime.getServerSnapshot);
  const { toasts } = useSonner();
  useEffect(() => {
    const liveIds = new Set(toast.getToasts().map(item => item.id));
    for (const item of toasts) {
      if (!liveIds.has(item.id)) continue;
      if (isMarketplaceSyncToast(item.id, item.className)) continue;
      const target = active ? COMPANION_TOASTER_ID : undefined;
      if (item.toasterId === target || item.toasterId && item.toasterId !== COMPANION_TOASTER_ID) continue;
      const options = { ...item, toasterId: target };
      if (item.jsx) toast.custom(() => item.jsx as React.ReactElement, options);
      else {
        const show = item.type && item.type in methods ? methods[item.type as keyof typeof methods] : toast.message;
        show(item.title, options);
      }
    }
  }, [active, toasts]);
  return <SonnerToaster {...props} />;
}
const methods = { success: toast.success, error: toast.error, info: toast.info, warning: toast.warning, loading: toast.loading, normal: toast.message, default: toast.message, action: toast.message } satisfies Record<string, (title: ToastT["title"], options: ToastT) => string | number>;
