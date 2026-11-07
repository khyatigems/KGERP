"use client";

import { KHYRA } from "@/lib/khyra/identity";
import type { CompanionPose } from "@/lib/companion-avatar";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { saveCompanionPreferences } from "@/app/(dashboard)/settings/companion/actions";
import { COMPANION_PREFERENCES_EVENT, companionDefaults, type CompanionPreferences } from "@/lib/companion";
import { AppearancePicker } from "./appearance-picker";
import { Facet } from "./facet";

const toggles = [
  ["enabled", "Enable Khyra", "Show on desktop screens. Small screens automatically use normal toast and bell notifications."],
  ["greetings", "Welcome greeting", "A short greeting once per browser session."],
  ["notifications", "Automatic alerts", "Let your companion announce new ERP updates and action feedback while collapsed."],
  ["motivation", "Encouragement", "A quiet, optional reminder in the panel."],
  ["animations", "Subtle animations", "Always respects your device’s reduced-motion preference."],
  ["quiet", "Quiet mode", "No greeting, badge, action reactions or animation; open the panel when needed."],
] as const;

export function CompanionSettings({ initialPreferences, userId }: { initialPreferences: CompanionPreferences; userId: string }) {
  const [prefs, setPrefs] = useState(initialPreferences);
  const [message, setMessage] = useState("");
  const [previewPose, setPreviewPose] = useState<CompanionPose | undefined>();
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    const update = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.userId === userId) setPrefs(current => ({ ...current, dock: detail.preferences.dock, pinned: detail.preferences.pinned, character: detail.preferences.character, size: detail.preferences.size, framing: detail.preferences.framing ?? current.framing, poseMode: detail.preferences.poseMode ?? current.poseMode, flipped: detail.preferences.flipped ?? current.flipped, ...(detail.source === "visibility" ? { enabled: detail.preferences.enabled } : {}) }));
    };
    window.addEventListener(COMPANION_PREFERENCES_EVENT, update);
    return () => window.removeEventListener(COMPANION_PREFERENCES_EVENT, update);
  }, [userId]);
  function save() {
    setMessage("");
    startTransition(async () => {
      try {
        const result = await saveCompanionPreferences(prefs);
        if (result.error || !result.preferences) { setMessage(result.error || "Could not save preferences."); return; }
        window.dispatchEvent(new CustomEvent(COMPANION_PREFERENCES_EVENT, { detail: { userId, preferences: result.preferences } }));
        setMessage("Preferences saved.");
      } catch { setMessage("Could not save preferences. Please try again."); }
    });
  }
  return <div className="grid gap-6 md:grid-cols-[1fr_240px]">
    <fieldset disabled={pending} className="space-y-5 rounded-2xl border bg-card p-5">
      <legend className="sr-only">Companion preferences</legend>
      {toggles.map(([key, title, description]) => <div key={key} className="flex items-center justify-between gap-4"><label htmlFor={`facet-${key}`} className="cursor-pointer"><span className="text-sm font-medium">{title}</span><span className="mt-1 block text-xs text-muted-foreground">{description}</span></label><Switch id={`facet-${key}`} checked={prefs[key]} onCheckedChange={value => setPrefs(current => ({ ...current, [key]: value }))} /></div>)}
      <AppearancePicker value={prefs} onPosePreview={setPreviewPose} motionEnabled={prefs.animations && !prefs.quiet} onChange={appearance => setPrefs(current => ({ ...current, ...appearance }))} />
      <div className="grid gap-4 sm:grid-cols-2">

        <label className="space-y-2 text-sm">Screen position<select className="block w-full rounded-lg border bg-background p-2" value={prefs.position} onChange={e => setPrefs({ ...prefs, position: e.target.value as CompanionPreferences["position"], dock: null })}>{["bottom-right", "bottom-left", "top-right", "top-left"].map(value => <option key={value} value={value}>{value.replace("-", " ")}</option>)}</select></label>
        <label className="space-y-2 text-sm">Automatic ERP alert preference<select className="block w-full rounded-lg border bg-background p-2" value={prefs.severity} onChange={e => setPrefs({ ...prefs, severity: e.target.value as CompanionPreferences["severity"] })}><option value="all">All new updates</option><option value="attention">Warnings and errors only</option></select></label>
      </div>
      <fieldset className="space-y-3 rounded-xl border p-3"><legend className="px-1 text-sm font-medium">Quiet hours · this device’s local time</legend><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={prefs.quietHours.enabled} onChange={e => setPrefs(current => ({ ...current, quietHours: { ...current.quietHours, enabled: e.target.checked } }))} />Use quiet hours</label><div className="grid grid-cols-2 gap-3">{(["start", "end"] as const).map(key => <label key={key} className="text-xs">{key === "start" ? "From" : "Until"}<input type="time" aria-label={`Quiet hours ${key}`} value={prefs.quietHours[key]} onChange={e => setPrefs(current => ({ ...current, quietHours: { ...current.quietHours, [key]: e.target.value } }))} className="mt-1 block min-h-10 w-full rounded-lg border bg-background px-2" /></label>)}</div></fieldset>
      <fieldset className="space-y-2 rounded-xl border p-3"><legend className="px-1 text-sm font-medium">Silent categories</legend><p className="text-xs text-muted-foreground">Suppress Companion interruptions; saved history is retained.</p>{(["inventory", "marketplace", "reports", "sales", "other"] as const).map(category => <label key={category} className="flex min-h-9 items-center gap-2 text-sm"><input type="checkbox" checked={prefs.mutedCategories.includes(category)} onChange={e => setPrefs(current => ({ ...current, mutedCategories: e.target.checked ? [...current.mutedCategories, category] : current.mutedCategories.filter(value => value !== category) }))} />{category}</label>)}</fieldset>
      <p className="text-xs text-muted-foreground">Drag Khyra using her grip, or focus the grip and use arrow keys. The position is saved to your account. Choosing a screen corner resets a dragged position. All bell history and action feedback remain available in the panel; quiet mode controls interruptions.</p>
      <div className="flex flex-wrap gap-2 border-t pt-4"><Button onClick={save} disabled={pending}>{pending ? "Saving…" : "Save preferences"}</Button><Button variant="outline" onClick={() => { setPrefs({ ...companionDefaults }); setMessage("Defaults restored in this form. Save to apply."); }}>Restore defaults</Button></div>
      <p role="status" className="text-sm text-muted-foreground">{message}</p>
    </fieldset>
    <aside className="h-fit rounded-2xl border bg-primary/5 p-6 text-center"><div className="mx-auto flex h-40 items-center justify-center"><div style={{ width: prefs.size, height: prefs.size, transform: prefs.flipped ? "scaleX(-1)" : undefined }}><Facet character={prefs.character} state={prefs.quiet ? "sleeping" : "idle"} framing="adaptive" pose={previewPose} /></div></div><h2 className="font-semibold">Meet {KHYRA.name}</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">Four essential expressions respond to real business events. Drag Khyra directly to move her; hover leaves her expression unchanged. Your preferences follow your signed-in account, across browsers and sessions.</p><p className="mt-4 text-xs leading-5 text-muted-foreground">Uses existing ERP events. No AI service, new subscription, or additional polling.</p></aside>
  </div>;
}
