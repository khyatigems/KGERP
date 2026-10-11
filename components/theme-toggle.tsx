"use client";
import { Check, Gem, Laptop, LayoutDashboard, Moon, Palette, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useWorkspaceAppearance } from "@/components/workspace-appearance-provider";
import { WORKSPACE_PALETTES } from "@/lib/workspace-appearance";
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { appearance, updateAppearance } = useWorkspaceAppearance();
  return <Popover><PopoverTrigger asChild><Button variant="outline" size="icon" aria-label="Appearance settings"><Palette className="h-4 w-4"/></Button></PopoverTrigger>
    <PopoverContent align="end" className="w-[min(23rem,calc(100vw-2rem))] space-y-5 rounded-2xl p-5">
      <div><h2 className="font-semibold">Workspace appearance</h2><p className="mt-1 text-xs text-muted-foreground">Clear surfaces, gemstone accents, and lightweight motion.</p></div>
      <section aria-label="Color mode"><h3 className="mb-2 text-xs font-medium">Color mode</h3><div className="grid grid-cols-3 gap-2">{([{ value: "light", label: "Light", Icon: Sun }, { value: "dark", label: "Dark", Icon: Moon }, { value: "system", label: "System", Icon: Laptop }] as const).map(({ value, label, Icon }) => <Button key={value} size="sm" variant={theme === value ? "default" : "outline"} aria-pressed={theme === value} onClick={() => setTheme(value)}><Icon className="mr-1 h-3.5 w-3.5"/>{label}</Button>)}</div></section>
      <section aria-label="Workspace palette"><h3 className="mb-2 text-xs font-medium">Gemstone palette</h3><div className="grid grid-cols-3 gap-2">{WORKSPACE_PALETTES.map(palette => <button key={palette.id} type="button" aria-pressed={appearance.palette === palette.id} onClick={() => updateAppearance({ palette: palette.id })} className={`appearance-choice rounded-xl border p-3 text-center text-xs ${appearance.palette === palette.id ? "border-primary bg-primary/5" : "border-border"}`}><span className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${palette.color}18`, color: palette.color }}><Gem className="h-5 w-5"/></span>{palette.label}{appearance.palette === palette.id && <Check className="mx-auto mt-1 h-3 w-3 text-primary"/>}</button>)}</div></section>
      <section aria-label="Dashboard view"><h3 className="mb-2 text-xs font-medium">Dashboard view</h3><div className="grid grid-cols-2 gap-2">{([{ value: "trading", label: "Gemstone trading", description: "Stock, channels, invoices & activity", Icon: Gem }, { value: "classic", label: "Business overview", description: "Business health, trends & daily work", Icon: LayoutDashboard }] as const).map(({ value, label, description, Icon }) => <button key={value} type="button" aria-pressed={appearance.dashboardView === value} onClick={() => updateAppearance({ dashboardView: value })} className={`appearance-choice rounded-xl border p-3 text-left ${appearance.dashboardView === value ? "border-primary bg-primary/5" : "border-border"}`}><Icon className="mb-2 h-5 w-5 text-primary"/><b className="block text-xs font-medium">{label}</b><span className="mt-1 block text-[11px] text-muted-foreground">{description}</span></button>)}</div></section>
      <label className="flex items-center justify-between gap-3 border-t pt-4"><span><span className="block text-xs font-medium">Subtle transitions</span><span className="mt-1 block text-[11px] text-muted-foreground">Brief motion; respects your device’s reduced-motion setting.</span></span><Switch checked={appearance.motion} onCheckedChange={motion => updateAppearance({ motion })} aria-label="Enable subtle transitions"/></label>
      <p className="text-[11px] text-muted-foreground">Palette saves to your account. Dashboard view and motion are remembered on this device.</p>
    </PopoverContent>
  </Popover>;
}
