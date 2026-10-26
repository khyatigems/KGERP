"use client";

import { useId, useState, useTransition } from "react";
import { companionCharacters, companionDefaults, COMPANION_PREFERENCES_EVENT, type CompanionPreferences } from "@/lib/companion";
import { saveCompanionPreferences } from "@/app/(dashboard)/settings/companion/actions";
import { Button } from "@/components/ui/button";
import { Facet } from "./facet";

type Appearance = Pick<CompanionPreferences, "size" | "character">;
export function AppearancePicker({ value, onChange }: { value: Appearance; onChange: (value: Appearance) => void }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const sizeId = useId();
  return <div className="space-y-4">
    <div><div className="mb-3 flex items-center justify-between"><label htmlFor={sizeId} className="text-sm font-medium">Companion size <span className="ml-1 text-xs text-muted-foreground">{value.size}px</span></label><button type="button" onClick={() => onChange({ ...value, size: companionDefaults.size })} className="text-xs text-primary underline underline-offset-4">Reset size</button></div><input id={sizeId} aria-label="Companion size" type="range" min={48} max={144} step={8} value={value.size} onChange={event => onChange({ ...value, size: Number(event.target.value) })} className="w-full accent-primary" /><div className="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>Discreet</span><span>Companion</span><span>Expressive</span></div></div>
    <div><h3 className="text-sm font-medium">Choose your companion</h3><p className="mb-3 mt-1 text-xs text-muted-foreground">Five original gemstone companions. Hover or focus to say hello.</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Companion characters">{companionCharacters.map(character => <button key={character.id} type="button" aria-label={`Choose ${character.name}`} aria-pressed={value.character === character.id} onClick={() => onChange({ ...value, character: character.id })} onPointerEnter={() => setHovered(character.id)} onPointerLeave={() => setHovered(null)} onFocus={() => setHovered(character.id)} onBlur={() => setHovered(null)} className={`rounded-xl border p-3 text-center transition-colors ${value.character === character.id ? "border-primary bg-primary/10 ring-1 ring-primary/30" : "bg-background/40 hover:bg-muted"}`}><div className="mx-auto h-20 w-20"><Facet character={character.id} state={hovered === character.id ? "wink" : "idle"} /></div><span className="mt-1 block text-xs font-semibold">{character.name}</span><span className="mt-1 block text-[10px] leading-4 text-muted-foreground">{character.detail}</span></button>)}</div></div>
  </div>;
}

export function CompanionCustomization({ preferences, userId }: { preferences: CompanionPreferences; userId: string }) {
  const [draft, setDraft] = useState<Appearance>({ size: preferences.size, character: preferences.character });
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  return <section aria-label="Customize companion" className="space-y-4"><div className="mx-auto flex h-40 items-center justify-center rounded-xl bg-primary/5"><div style={{ width: draft.size, height: draft.size }}><Facet character={draft.character} state="happy" /></div></div><AppearancePicker value={draft} onChange={setDraft} /><p className="text-xs leading-5 text-muted-foreground">Smiles and winks when greeted. Settles into rest after a quiet minute. New activity wakes your companion.</p><Button disabled={pending} className="w-full" onClick={() => startTransition(async () => {
    setMessage("");
    try { const result = await saveCompanionPreferences({ ...preferences, ...draft }); if (result.error || !result.preferences) { setMessage(result.error || "Could not save appearance."); return; } window.dispatchEvent(new CustomEvent(COMPANION_PREFERENCES_EVENT, { detail: { userId, preferences: result.preferences } })); setMessage("Companion updated."); }
    catch { setMessage("Could not save appearance. Please try again."); }
  })}>{pending ? "Saving…" : "Apply companion"}</Button><p role="status" className="text-xs text-muted-foreground">{message}</p></section>;
}
