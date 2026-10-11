"use client";

import type { InfographicTheme } from "@/lib/infographic-generator";

interface BackgroundProps {
  theme: InfographicTheme;
  width: number;
  height: number;
}

function DiamondFacets({ theme, width, height }: BackgroundProps) {
  const isDark = theme === "dark";
  const stroke = isDark ? "rgba(212,168,83,0.15)" : "rgba(184,134,11,0.12)";
  const strokeBright = isDark ? "rgba(212,168,83,0.25)" : "rgba(184,134,11,0.18)";
  const cx = width / 2;
  const cy = height / 2;

  const facets: string[] = [];
  const count = 18;
  const maxR = Math.max(width, height) * 0.8;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const r = maxR * (0.4 + (((i * 7 + 3) % 11) / 11) * 0.6);
    const x2 = cx + Math.cos(angle) * r;
    const y2 = cy + Math.sin(angle) * r;
    facets.push(`M${cx},${cy} L${x2},${y2}`);
  }

  const diamonds: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + 0.5;
    const dist = 80 + (((i * 5 + 2) % 9) / 9) * 160;
    const dcx = cx + Math.cos(angle) * dist;
    const dcy = cy + Math.sin(angle) * dist;
    const s = 30 + (((i * 3 + 1) % 7) / 7) * 40;
    diamonds.push(
      `M${dcx},${dcy - s} L${dcx + s * 0.6},${dcy} L${dcx},${dcy + s} L${dcx - s * 0.6},${dcy} Z`
    );
  }

  const centerS = 60;
  const centerDiamond = `M${cx},${cy - centerS} L${cx + centerS * 0.6},${cy} L${cx},${cy + centerS} L${cx - centerS * 0.6},${cy} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ position: "absolute", top: 0, left: 0, zIndex: 0 }}
    >
      <path d={facets.join(" ")} fill="none" stroke={stroke} strokeWidth="1.2" />
      <path d={diamonds.join(" ")} fill="none" stroke={strokeBright} strokeWidth="1.5" />
      <path d={centerDiamond} fill="none" stroke={strokeBright} strokeWidth="1.8" />
    </svg>
  );
}

function CrystalLattice({ theme, width, height }: BackgroundProps) {
  const isDark = theme === "dark";
  const stroke = isDark ? "rgba(212,168,83,0.12)" : "rgba(184,134,11,0.10)";
  const strokeBright = isDark ? "rgba(212,168,83,0.22)" : "rgba(184,134,11,0.16)";

  const hexR = 48;
  const hexH = hexR * Math.sqrt(3);
  const cols = Math.ceil(width / (hexR * 1.5)) + 2;
  const rows = Math.ceil(height / hexH) + 2;

  const paths: string[] = [];
  const brightPaths: string[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const hx = col * hexR * 1.5;
      const hy = row * hexH + (col % 2 === 1 ? hexH / 2 : 0);
      const dist = Math.sqrt((hx - width / 2) ** 2 + (hy - height / 2) ** 2);
      const maxDist = Math.sqrt((width / 2) ** 2 + (height / 2) ** 2);
      const norm = dist / maxDist;
      const isCenter = norm < 0.4;

      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        return `${hx + hexR * Math.cos(a)},${hy + hexR * Math.sin(a)}`;
      }).join(" ");

      if (isCenter) {
        brightPaths.push(`M${pts.replace(/ /g, " L")} Z`);
      } else {
        paths.push(`M${pts.replace(/ /g, " L")} Z`);
      }
    }
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ position: "absolute", top: 0, left: 0, zIndex: 0 }}
    >
      <path d={paths.join(" ")} fill="none" stroke={stroke} strokeWidth="1.2" />
      <path d={brightPaths.join(" ")} fill="none" stroke={strokeBright} strokeWidth="1.5" />
    </svg>
  );
}

function PrismaticLight({ theme, width, height }: BackgroundProps) {
  const isDark = theme === "dark";
  const stroke = isDark ? "rgba(212,168,83,0.12)" : "rgba(184,134,11,0.09)";
  const strokeBright = isDark ? "rgba(212,168,83,0.20)" : "rgba(184,134,11,0.15)";

  const rays: string[] = [];
  const count = 14;
  for (let i = 0; i < count; i++) {
    const x1 = (i / count) * width * 0.7;
    const x2 = x1 + width * 0.4;
    rays.push(`M${x1},0 L${x2},${height}`);
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ position: "absolute", top: 0, left: 0, zIndex: 0 }}
    >
      <defs>
        <linearGradient id="prismatic-fade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={isDark ? "rgba(212,168,83,0.12)" : "rgba(184,134,11,0.09)"} />
          <stop offset="50%" stopColor={isDark ? "rgba(212,168,83,0.04)" : "rgba(184,134,11,0.03)"} />
          <stop offset="100%" stopColor={isDark ? "rgba(212,168,83,0.10)" : "rgba(184,134,11,0.07)"} />
        </linearGradient>
      </defs>
      <path d={rays.join(" ")} fill="none" stroke={stroke} strokeWidth="2" />
      <rect x="0" y="0" width={width} height={height} fill="url(#prismatic-fade)" />
    </svg>
  );
}

export function GemstoneBackground({
  background,
  theme,
  width,
  height,
}: BackgroundProps & { background: string }) {
  switch (background) {
    case "diamond":
      return <DiamondFacets theme={theme} width={width} height={height} />;
    case "crystal":
      return <CrystalLattice theme={theme} width={width} height={height} />;
    case "prismatic":
      return <PrismaticLight theme={theme} width={width} height={height} />;
    default:
      return null;
  }
}
