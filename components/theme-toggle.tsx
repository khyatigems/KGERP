"use client";

import * as React from "react";
import { Check, Laptop, Moon, Palette, Sparkles, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  getThemePaletteOptionId,
  getThemePaletteVariables,
  RUNTIME_PALETTE_VARIABLES,
  THEME_PALETTE_OPTIONS,
  isThemePalette,
  type ThemePalette,
} from "@/lib/theme-palettes";

function applyPalette(palette: ThemePalette) {
  const root = document.documentElement;
  root.dataset.palette = palette;
  const variables = getThemePaletteVariables(palette);
  for (const variable of RUNTIME_PALETTE_VARIABLES) {
    const value = variables[variable];
    if (value) root.style.setProperty(variable, value);
    else root.style.removeProperty(variable);
  }
}

function applyPremium(enabled: boolean) {
  const root = document.documentElement;
  if (enabled) root.dataset.premium = "true";
  else delete root.dataset.premium;
}

async function savePreference(body: { palette?: ThemePalette; premium?: boolean }) {
  try {
    const response = await fetch("/api/user/theme", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Theme preference could not be saved (HTTP ${response.status})`);
  } catch (error) {
    console.error("Failed to save theme preference:", error);
    toast.error("Theme updated on this device, but could not be saved to your account.");
  }
}

const themeModes = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Laptop },
] as const;

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const [palette, setPalette] = React.useState<ThemePalette>("default");
  const [premium, setPremium] = React.useState(false);

  React.useEffect(() => {
    const savedPalette = window.localStorage.getItem("khyatigems-theme-palette");
    const savedPremium = window.localStorage.getItem("khyatigems-premium-mode");
    const initialPalette = isThemePalette(savedPalette) ? savedPalette : "default";
    const initialPremium = savedPremium === "true";
    setPalette(initialPalette);
    setPremium(initialPremium);
    applyPalette(initialPalette);
    applyPremium(initialPremium);

    fetch("/api/user/theme")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { palette?: string; premium?: boolean } | null) => {
        if (data?.palette && isThemePalette(data.palette)) {
          setPalette(data.palette);
          window.localStorage.setItem("khyatigems-theme-palette", data.palette);
          applyPalette(data.palette);
        }
        if (data?.premium !== undefined) {
          setPremium(data.premium);
          window.localStorage.setItem("khyatigems-premium-mode", String(data.premium));
          applyPremium(data.premium);
        }
      })
      .catch(() => {
        // Keep the local preference when the account setting is unavailable.
      });
  }, []);

  const selectPalette = (nextPalette: ThemePalette) => {
    setPalette(nextPalette);
    window.localStorage.setItem("khyatigems-theme-palette", nextPalette);
    applyPalette(nextPalette);
    void savePreference({ palette: nextPalette });
  };

  const togglePremium = (enabled: boolean) => {
    setPremium(enabled);
    window.localStorage.setItem("khyatigems-premium-mode", String(enabled));
    applyPremium(enabled);
    void savePreference({ premium: enabled });
  };

  const selectedOption = getThemePaletteOptionId(palette);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Appearance settings">
          <Palette className="h-4 w-4 transition-transform duration-300 hover:rotate-12" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(21rem,calc(100vw-2rem))] overflow-hidden p-0">
        <div className="border-b border-border/70 bg-muted/20 px-4 py-3">
          <p className="text-sm font-semibold">Appearance</p>
          <p className="mt-0.5 text-xs text-muted-foreground">A calmer workspace, tuned to your preference.</p>
        </div>

        <div className="space-y-4 p-4">
          <section aria-label="Color mode">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Color mode</p>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted/60 p-1">
              {themeModes.map(({ value, label, icon: Icon }) => (
                <Button
                  key={value}
                  variant={theme === value ? "default" : "ghost"}
                  size="sm"
                  className="h-8 gap-1.5 px-2 text-xs transition-all duration-200"
                  onClick={() => setTheme(value)}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </Button>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Gemstone palettes</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">Curated accents for a coordinated interface and charts.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {THEME_PALETTE_OPTIONS.map((option) => {
                const selected = selectedOption === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => selectPalette(option.id)}
                    className={`group flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${
                      selected ? "border-primary/50 bg-primary/6 ring-1 ring-primary/20" : "border-border/70 hover:border-primary/30"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="relative h-5 w-5 shrink-0 rounded-full shadow-sm ring-1 ring-black/10 transition-transform duration-200 group-hover:scale-110"
                      style={{ background: `linear-gradient(135deg, ${option.swatch}, color-mix(in srgb, ${option.swatch} 45%, white))` }}
                    >
                      {selected && <Check className="absolute inset-0 m-auto h-3 w-3 text-white drop-shadow" />}
                    </span>
                    <span className="truncate text-[11px] font-medium">{option.label}</span>
                    {selected && <span className="sr-only">Selected</span>}
                  </button>
                );
              })}
            </div>
          </section>

          <div className="flex items-center gap-3 rounded-lg border border-primary/15 bg-linear-to-r from-primary/8 via-primary/3 to-transparent p-3 transition-colors duration-300">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4 transition-transform duration-500" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold">Premium finish</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">Glass surfaces and soft ambient depth</p>
            </div>
            <Switch checked={premium} onCheckedChange={togglePremium} aria-label="Enable premium finish" />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
