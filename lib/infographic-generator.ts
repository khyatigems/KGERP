"use client";

import { toPng } from "html-to-image";
import { saveAs } from "file-saver";

export type InfographicTheme = "dark" | "light";

export type InfographicSize = {
  id: string;
  label: string;
  width: number;
  height: number;
  filename: string;
};

export type InfographicBackground = {
  id: string;
  label: string;
};

export const INFOGRAPHIC_SIZES: InfographicSize[] = [
  { id: "landscape", label: "Landscape", width: 1200, height: 630, filename: "landscape" },
  { id: "square", label: "Square", width: 1080, height: 1080, filename: "square" },
  { id: "portrait", label: "Portrait", width: 1080, height: 1350, filename: "portrait" },
  { id: "wide", label: "Wide", width: 1500, height: 500, filename: "wide" },
  { id: "hd", label: "HD", width: 1920, height: 1080, filename: "hd" },
];

export const INFOGRAPHIC_BACKGROUNDS: InfographicBackground[] = [
  { id: "none", label: "None (Clean)" },
  { id: "diamond", label: "Diamond Facets" },
  { id: "crystal", label: "Crystal Lattice" },
  { id: "prismatic", label: "Prismatic Light" },
];

export interface InfographicData {
  sku: string;
  itemName: string;
  image?: string | null;
  category?: string | null;
  gemType?: string | null;
  shape?: string | null;
  color?: string | null;
  cut?: string | null;
  transparency?: string | null;
  treatment?: string | null;
  origin?: string | null;
  weightValue?: number | null;
  weightUnit?: string | null;
  weightRatti?: number | null;
  dimensionsMm?: string | null;
  certifications?: string[];
  certificateLab?: string | null;
  logoUrl?: string | null;
  companyName?: string | null;
}

export async function generateInfographicPng(
  node: HTMLElement,
  sku: string,
  theme: InfographicTheme = "dark",
  size: InfographicSize = INFOGRAPHIC_SIZES[0]
): Promise<void> {
  const dataUrl = await toPng(node, {
    width: size.width,
    height: size.height,
    pixelRatio: 2,
    backgroundColor: theme === "dark" ? "#0C0C0C" : "#FAFAF8",
    cacheBust: true,
    style: {
      transform: "scale(1)",
      transformOrigin: "top left",
    },
  });

  const res = await fetch(dataUrl);
  const blob = await res.blob();
  saveAs(blob, `${sanitizeFilename(sku)}-infographic-${size.filename}-${theme}.png`);
}

function sanitizeFilename(sku: string): string {
  return sku.replace(/[^a-zA-Z0-9-_]/g, "-").replace(/-+/g, "-").toLowerCase();
}
