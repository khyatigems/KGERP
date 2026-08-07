"use client";

import * as React from "react";
import { Moon, Sun, Sparkles } from "lucide-react";
import { useTheme } from "next-themes";
import {
  getThemePaletteVariables,
  RUNTIME_PALETTE_VARIABLES,
  THEME_PALETTES,
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
  if (enabled) {
    root.dataset.premium = "true";
  } else {
    delete root.dataset.premium;
  }
}

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { setTheme } = useTheme();
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
        // Local preference remains available when the user is offline.
      });
  }, []);

  const selectPalette = (nextPalette: ThemePalette) => {
    setPalette(nextPalette);
    window.localStorage.setItem("khyatigems-theme-palette", nextPalette);
    applyPalette(nextPalette);
    fetch("/api/user/theme", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ palette: nextPalette }),
    }).catch(() => {});
  };

  const togglePremium = () => {
    const next = !premium;
    setPremium(next);
    window.localStorage.setItem("khyatigems-premium-mode", String(next));
    applyPremium(next);
    fetch("/api/user/theme", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ premium: next }),
    }).catch(() => {});
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          System
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={togglePremium} className="gap-2">
          <Sparkles className="h-4 w-4" />
          <span className="flex-1">Premium Mode</span>
          <span
            className={`ml-2 h-5 w-9 rounded-full transition-colors relative ${
              premium ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                premium ? "translate-x-4" : ""
              }`}
            />
          </span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Color Palette</DropdownMenuLabel>
        {THEME_PALETTES.map((option) => (
          <DropdownMenuItem key={option.id} onClick={() => selectPalette(option.id)}>
            <span
              aria-hidden="true"
              className="mr-2 h-3 w-3 rounded-full border border-current/20"
              style={{ backgroundColor: option.swatch }}
            />
            <span className="flex-1">{option.label}</span>
            {palette === option.id && <span aria-label="Selected">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
