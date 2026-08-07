export const THEME_PALETTES = [
  { id: "default", label: "Default", swatch: "#2563eb" },
  { id: "ocean", label: "Ocean Blue", swatch: "#0e7490" },
  { id: "emerald", label: "Emerald", swatch: "#047857" },
  { id: "royal", label: "Royal Amethyst", swatch: "#7c3aed" },
  { id: "sand", label: "Warm Sand", swatch: "#b7791f" },
  { id: "rose", label: "Rose Quartz", swatch: "#be5673" },
  { id: "obsidian", label: "Obsidian Diamond", swatch: "#64748b" },
  { id: "sapphire-facet", label: "Sapphire Facet", swatch: "#2563eb" },
  { id: "emerald-crystal", label: "Emerald Crystal", swatch: "#10b981" },
  { id: "amethyst-prism", label: "Amethyst Prism", swatch: "#a855f7" },
  { id: "ruby-luxe", label: "Ruby Luxe", swatch: "#be123c" },
  { id: "citrine-gold", label: "Citrine Gold", swatch: "#d97706" },
  { id: "aurora-prism", label: "Aurora Prism", swatch: "#0891b2" },
] as const;

export type ThemePalette = (typeof THEME_PALETTES)[number]["id"];

export function isThemePalette(value: unknown): value is ThemePalette {
  return THEME_PALETTES.some((palette) => palette.id === value);
}

const RUNTIME_PALETTE_VARIABLES = [
  "--primary",
  "--primary-foreground",
  "--accent",
  "--accent-foreground",
  "--ring",
  "--sidebar-primary",
  "--sidebar-ring",
] as const;

export function getThemePaletteVariables(palette: ThemePalette): Record<string, string> {
  if (palette === "default") return {};
  const swatch = THEME_PALETTES.find((option) => option.id === palette)?.swatch || "#2563eb";
  const softSwatch = `color-mix(in srgb, ${swatch} 14%, transparent)`;
  return {
    "--primary": swatch,
    "--primary-foreground": "#ffffff",
    "--accent": softSwatch,
    "--accent-foreground": swatch,
    "--ring": swatch,
    "--sidebar-primary": swatch,
    "--sidebar-ring": swatch,
  };
}

export { RUNTIME_PALETTE_VARIABLES };
