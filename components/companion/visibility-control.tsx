"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { companionVisibility, toggleCompanionVisibility } from "@/lib/companion-visibility";

export function CompanionVisibilityControl() {
  const state = useSyncExternalStore(companionVisibility.subscribe, companionVisibility.getSnapshot, companionVisibility.getServerSnapshot);
  if (!state.available) return null;
  const Icon = state.enabled ? EyeOff : Eye;
  return <section aria-label="Companion visibility" className="space-y-2 rounded-xl border bg-primary/5 p-3">
    <div className="flex items-center justify-between"><h3 className="text-xs font-medium">ERP companion</h3><Link href="/settings/companion" className="text-[11px] text-primary underline underline-offset-4">Customize</Link></div>
    <Button type="button" size="sm" variant="outline" className="w-full" disabled={!state.desktop || state.pending} aria-label={state.enabled ? "Hide companion" : "Show companion"} onClick={() => void toggleCompanionVisibility()}><Icon className="mr-2 size-3.5" />{state.pending ? "Saving…" : !state.desktop ? "Hidden on small screens" : state.enabled ? "Hide companion" : "Show companion"}</Button>
    <p className="text-[11px] leading-4 text-muted-foreground">{state.desktop ? "Saves immediately to your account. Toasts and the bell work normally when hidden." : "Available on screens at least 1024px wide and 600px tall. Toasts and the bell work normally here; your desktop preference is kept."}</p>
    {state.error && <p role="alert" className="text-xs text-destructive">{state.error}</p>}
  </section>;
}
