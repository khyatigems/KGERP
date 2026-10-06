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

export const THEME_PALETTE_OPTIONS = [
  THEME_PALETTES[0],
  THEME_PALETTES[7],
  THEME_PALETTES[8],
  THEME_PALETTES[9],
  THEME_PALETTES[10],
  THEME_PALETTES[11],
  THEME_PALETTES[6],
] as const;

export type ThemePalette = (typeof THEME_PALETTES)[number]["id"];

export function isThemePalette(value: unknown): value is ThemePalette {
  return THEME_PALETTES.some((palette) => palette.id === value);
}

export function getThemePaletteOptionId(palette: ThemePalette) {
  switch (palette) {
    case "ocean":
    case "aurora-prism":
      return "sapphire-facet";
    case "emerald":
      return "emerald-crystal";
    case "royal":
      return "amethyst-prism";
    case "sand":
      return "citrine-gold";
    case "rose":
      return "ruby-luxe";
    default:
      return palette;
  }
}

const RUNTIME_PALETTE_VARIABLES = [
  "--primary",
  "--primary-foreground",
  "--accent",
  "--accent-foreground",
  "--ring",
  "--sidebar-primary",
  "--sidebar-ring",
  "--chart-1",
  "--chart-2",
  "--chart-3",
  "--chart-4",
  "--chart-5",
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
    "--chart-1": swatch,
    "--chart-2": `color-mix(in srgb, ${swatch} 68%, #0f766e)`,
    "--chart-3": `color-mix(in srgb, ${swatch} 68%, #d97706)`,
    "--chart-4": `color-mix(in srgb, ${swatch} 68%, #7c3aed)`,
    "--chart-5": `color-mix(in srgb, ${swatch} 68%, #be123c)`,
  };
}

export { RUNTIME_PALETTE_VARIABLES };
