"use client";

import { useEffect, useState } from "react";

// Theme hue mapping (primary color hue in degrees)
// Based on the oklch hue values in globals.css
const themeHues: Record<string, number> = {
  // Default (emerald) - green hue ~160
  emerald: 160,
  "emerald-crystal": 160,
  // Ocean - blue hue ~222
  ocean: 222,
  // Royal - purple hue ~292
  royal: 292,
  "amethyst-prism": 292,
  // Sand - yellow/gold hue ~72
  sand: 72,
  "citrine-gold": 72,
  // Rose - red hue ~8
  rose: 8,
  "ruby-luxe": 8,
  // Obsidian - dark blue hue ~250
  obsidian: 250,
  "sapphire-facet": 255,
  "aurora-prism": 190,
  // Default fallback
  default: 160,
};

const BASE_HUE = 160; // Green (what the animations are designed in)

export function useThemeHue(): number {
  const [hueRotation, setHueRotation] = useState(0);

  useEffect(() => {
    const updateHue = () => {
      const html = document.documentElement;
      const palette = html.dataset.palette || "default";
      const themeHue = themeHues[palette] || BASE_HUE;
      const rotation = themeHue - BASE_HUE;
      setHueRotation(rotation);
    };

    updateHue();

    // Listen for theme changes
    const observer = new MutationObserver(updateHue);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-palette", "class"],
    });

    return () => observer.disconnect();
  }, []);

  return hueRotation;
}

export function getThemeHueRotation(palette: string): number {
  const themeHue = themeHues[palette] || BASE_HUE;
  return themeHue - BASE_HUE;
}