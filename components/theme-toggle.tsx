"use client";
import { useState, type CSSProperties } from "react";
import { Check, Palette, RotateCcw } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useWorkspaceAppearance } from "@/components/workspace-appearance-provider";
import { DEFAULT_APPEARANCE, WORKSPACE_PALETTES, WORKSPACE_SURFACES, type WorkspaceAppearance } from "@/lib/workspace-appearance";
import { CompanionVisibilityControl } from "@/components/companion/visibility-control";

function Choices<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: readonly { value: T; label: string }[]; onChange: (value: T) => void;
}) {
  return <section aria-label={label}><h3 className="mb-2 text-xs font-medium">{label}</h3>
    <div className="flex flex-wrap gap-2">{options.map(option => <button key={option.value} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)} className={`appearance-choice flex min-h-9 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs ${value === option.value ? "border-primary bg-accent text-accent-foreground" : "border-border"}`}>{value === option.value && <Check className="h-3 w-3"/>}{option.label}</button>)}</div>
  </section>;
}

export function ThemeToggle({ instance = "desktop" }: { instance?: "desktop" | "mobile" }) {
  const panelId = `workspace-appearance-${instance}`;
  const { theme, systemTheme, setTheme } = useTheme();
  const { appearance, updateAppearance, ready } = useWorkspaceAppearance();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(appearance);
  const [mode, setMode] = useState("system");
  const patch = (value: Partial<WorkspaceAppearance>) => setDraft(current => ({ ...current, ...value }));
  const dark = mode === "dark" || mode === "dim" || (mode === "system" && systemTheme === "dark");
  const surface = WORKSPACE_SURFACES.find(item => item.id === draft.surface)!;
  const accent = dark ? ({ "sapphire-facet": "#9dbdff", "emerald-crystal": "#82d7b6", "amethyst-prism": "#c5aff2" }[draft.palette]) : ({ "sapphire-facet": "#465f83", "emerald-crystal": "#14775f", "amethyst-prism": "#7453b3" }[draft.palette]);
  const darkSurface = {
    slate: { background: "#0c1422", card: "#141e2e", sidebar: "#101a2a", dimBackground: "#282e38", dimCard: "#333b47", dimSidebar: "#252d38" },
    stone: { background: "#191815", card: "#24231f", sidebar: "#1e1d19", dimBackground: "#302e29", dimCard: "#3b3832", dimSidebar: "#2c2a25" },
    sage: { background: "#111c18", card: "#1a2922", sidebar: "#15231c", dimBackground: "#29332d", dimCard: "#333f37", dimSidebar: "#253028" },
  }[draft.surface];
  const preview = {
    "--preview-bg": dark ? mode === "dim" ? darkSurface.dimBackground : darkSurface.background : surface.background,
    "--preview-card": dark ? mode === "dim" ? darkSurface.dimCard : darkSurface.card : surface.card,
    "--preview-sidebar": draft.sidebar === "dark" ? "#202936" : dark ? mode === "dim" ? darkSurface.dimSidebar : darkSurface.sidebar : surface.sidebar,
    "--preview-text": dark ? "#edf1f8" : "#29313d", "--preview-accent": accent,
    fontSize: draft.textSize === "large" ? "14px" : "12px",
  } as CSSProperties;
  return <Popover open={open} onOpenChange={next => {
    if (next) { setDraft(appearance); setMode(theme || "system"); }
    setOpen(next);
  }}><PopoverTrigger asChild aria-controls={panelId}><Button variant="outline" size="icon" disabled={!ready} aria-label="Appearance settings"><Palette className="h-4 w-4"/></Button></PopoverTrigger>
    <PopoverContent id={panelId} aria-labelledby={`${panelId}-title`} align="end" collisionPadding={12} className="w-[min(27rem,calc(100vw-2rem))] max-h-[min(85dvh,50rem,var(--radix-popover-content-available-height))] overflow-y-auto rounded-2xl p-5">
      <div className="space-y-5">
        <div><h2 id={`${panelId}-title`} className="font-semibold">Workspace appearance</h2><p className="mt-1 text-xs text-muted-foreground">Preview your workspace, then apply your choices.</p></div>
        <CompanionVisibilityControl />
        <Choices label="Color mode" value={mode} options={[{ value: "light", label: "Soft Light" }, { value: "dim", label: "Dim" }, { value: "dark", label: "Dark" }, { value: "system", label: "System" }]} onChange={setMode}/>
        <Choices label="Surface palette" value={draft.surface} options={WORKSPACE_SURFACES.map(item => ({ value: item.id, label: item.label }))} onChange={surface => patch({ surface })}/>
        <Choices label="Gemstone accent" value={draft.palette} options={WORKSPACE_PALETTES.map(item => ({ value: item.id, label: item.label }))} onChange={palette => patch({ palette })}/>
        <Choices label="Sidebar style" value={draft.sidebar} options={[{ value: "matching", label: "Matching" }, { value: "dark", label: "Dark sidebar" }]} onChange={sidebar => patch({ sidebar })}/>
        <Choices label="Table density" value={draft.density} options={[{ value: "comfortable", label: "Comfortable" }, { value: "compact", label: "Compact" }]} onChange={density => patch({ density })}/>
        <Choices label="Text size" value={draft.textSize} options={[{ value: "standard", label: "Standard" }, { value: "large", label: "Large" }]} onChange={textSize => patch({ textSize })}/>
        <section aria-label="Appearance preview"><h3 className="mb-2 text-xs font-medium">Preview</h3>
          <div className="appearance-preview flex overflow-hidden rounded-xl border border-border" style={preview}>
            <div className="w-20 shrink-0 p-3" style={{ background: "var(--preview-sidebar)", color: dark || draft.sidebar === "dark" ? "#edf1f8" : "#29313d" }}><b>KG</b><div className="mt-5 space-y-3"><div>Overview</div><div>Stock</div><div>Invoices</div></div></div>
            <div className="min-w-0 flex-1 p-3"><div className="mb-3 font-semibold">Business overview</div>
              <div className="rounded-lg p-3" style={{ background: "var(--preview-card)" }}><span>Stock value</span><strong className="mt-1 block text-lg tabular-nums">₹12,48,500</strong></div>
              <div className="mt-3 overflow-hidden rounded-lg" style={{ background: "var(--preview-card)" }}>{["Invoice · 1042", "Stock · Emerald"].map((label, index) => <div key={label} className="flex justify-between gap-2 px-2" style={{ paddingBlock: draft.density === "compact" ? 6 : 12, background: index === 0 ? `color-mix(in srgb, ${accent} 14%, var(--preview-card))` : undefined }}><span>{label}</span><span>{index === 0 ? "Paid" : "In stock"}</span></div>)}</div>
              <div className="mt-3 rounded-md px-2 py-1 text-center" style={{ background: accent, color: dark ? "#102247" : "#fff" }}>New invoice</div>
            </div>
          </div>
        </section>
        <Choices label="Dashboard view" value={draft.dashboardView} options={[{ value: "trading", label: "Gemstone trading" }, { value: "classic", label: "Business overview" }]} onChange={dashboardView => patch({ dashboardView })}/>
        <label className="flex items-center justify-between gap-3"><span><span className="block text-xs font-medium">Subtle transitions</span><span className="text-[11px] text-muted-foreground">Respects your device’s reduced-motion setting.</span></span><Switch checked={draft.motion} onCheckedChange={motion => patch({ motion })} aria-label="Enable subtle transitions"/></label>
        <p className="text-[11px] text-muted-foreground">Gemstone accent saves to your account. Other choices are remembered on this device. System follows your device’s light or dark mode.</p>
        <div className="sticky bottom-0 flex flex-wrap justify-between gap-2 border-t bg-popover py-3"><Button size="sm" variant="ghost" onClick={() => { setDraft({ ...DEFAULT_APPEARANCE }); setMode("system"); }}><RotateCcw className="mr-1 h-3.5 w-3.5"/>Reset preview</Button><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button size="sm" onClick={() => { updateAppearance(draft); setTheme(mode); setOpen(false); }}>Apply</Button></div></div>
      </div>
    </PopoverContent>
  </Popover>;
}
