"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { COMPANION_PREFERENCES_EVENT, companionSchema, type CompanionPreferences } from "@/lib/companion";
import { companionDesktopViewport, publishCompanionVisibility, registerCompanionVisibility } from "@/lib/companion-visibility";
import { saveCompanionPreferences } from "@/app/(dashboard)/settings/companion/actions";

const Companion = dynamic(() => import("./companion").then(module => module.Companion), { ssr: false });

export function CompanionHost({ initialPreferences, allowedModules, userId }: {
  initialPreferences: CompanionPreferences; allowedModules: string[]; userId: string;
}) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const desktop = useSyncExternalStore(companionDesktopViewport.subscribe, companionDesktopViewport.getSnapshot, companionDesktopViewport.getServerSnapshot);
  const preferencesRef = useRef(preferences);
  useEffect(() => { preferencesRef.current = preferences; }, [preferences]);
  useEffect(() => { setPreferences(initialPreferences); }, [initialPreferences]);
  useEffect(() => {
    const update = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.userId !== userId) return;
      const parsed = companionSchema.safeParse(detail.preferences);
      if (parsed.success) setPreferences(parsed.data);
    };
    window.addEventListener(COMPANION_PREFERENCES_EVENT, update);
    return () => window.removeEventListener(COMPANION_PREFERENCES_EVENT, update);
  }, [userId]);
  useEffect(() => {
    let disposed = false;
    const unregister = registerCompanionVisibility(async enabled => {
      const previous = preferencesRef.current.enabled;
      const next = { ...preferencesRef.current, enabled };
      const update = (value: CompanionPreferences) => {
        if (disposed) return;
        preferencesRef.current = value;
        setPreferences(value);
        window.dispatchEvent(new CustomEvent(COMPANION_PREFERENCES_EVENT, { detail: { userId, preferences: value, source: "visibility" } }));
      };
      update(next);
      try {
        const result = await saveCompanionPreferences(next);
        if (result.error || !result.preferences) {
          update({ ...preferencesRef.current, enabled: previous });
          return { error: result.error || "Could not save companion visibility." };
        }
        update(result.preferences);
        return {};
      } catch {
        update({ ...preferencesRef.current, enabled: previous });
        return { error: "Could not save companion visibility. Please try again." };
      }
    });
    return () => { disposed = true; unregister(); };
  }, [userId]);
  useEffect(() => { publishCompanionVisibility(preferences.enabled, desktop); }, [preferences.enabled, desktop, userId]);
  return preferences.enabled && desktop ? <Companion key={userId} preferences={preferences} allowedModules={allowedModules} userId={userId} /> : null;
}
