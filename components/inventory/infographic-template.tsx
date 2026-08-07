"use client";

import type { InfographicData, InfographicTheme, InfographicSize } from "@/lib/infographic-generator";
import { INFOGRAPHIC_SIZES } from "@/lib/infographic-generator";
import { GemstoneBackground } from "@/components/infographic/gemstone-backgrounds";

interface InfographicTemplateProps {
  data: InfographicData;
  theme: InfographicTheme;
  size?: InfographicSize;
  background?: string;
}

const themeColors = {
  dark: {
    bg: "#0C0C0C",
    card: "#161616",
    cardBorder: "#2A2824",
    cardHighlight: "#1C1A17",
    text: "#F5F3EF",
    textSecondary: "#C8C4BC",
    textMuted: "#7A7670",
    accent: "#D4A853",
    accentLight: "#E8C878",
    accentDim: "rgba(212,168,83,0.10)",
    accentGlow: "rgba(212,168,83,0.18)",
    specBg: "#1A1816",
    specBorder: "#2A2824",
    imageBg: "#1A1816",
    imageBorder: "#2A2824",
    divider: "#2A2824",
    topBarBg: "linear-gradient(135deg, rgba(212,168,83,0.06) 0%, rgba(212,168,83,0) 100%)",
    bottomBarBg: "linear-gradient(135deg, rgba(212,168,83,0) 0%, rgba(212,168,83,0.04) 100%)",
  },
  light: {
    bg: "#FAFAF8",
    card: "#FFFFFF",
    cardBorder: "#E8E6E1",
    cardHighlight: "#F8F7F4",
    text: "#1A1A1A",
    textSecondary: "#4A4A4A",
    textMuted: "#9A9A9A",
    accent: "#B8860B",
    accentLight: "#D4A853",
    accentDim: "rgba(184,134,11,0.06)",
    accentGlow: "rgba(184,134,11,0.10)",
    specBg: "#F5F4F0",
    specBorder: "#E8E6E1",
    imageBg: "#F0EFEB",
    imageBorder: "#D8D6D1",
    divider: "#E8E6E1",
    topBarBg: "linear-gradient(135deg, rgba(184,134,11,0.04) 0%, rgba(184,134,11,0) 100%)",
    bottomBarBg: "linear-gradient(135deg, rgba(184,134,11,0) 0%, rgba(184,134,11,0.03) 100%)",
  },
};

type LayoutConfig = {
  isVertical: boolean;
  padding: string;
  topBarPadding: string;
  bottomBarPadding: string;
  logoHeight: number;
  logoFallbackSize: number;
  logoFallbackFont: number;
  skuFontSize: number;
  skuPadding: string;
  titleFontSize: number;
  imageMaxSize: number;
  imageBorderRadius: number;
  imageGap: number;
  specGap: string;
  specPadding: string;
  specLabelFont: number;
  specValueFont: number;
  certFontSize: number;
  certPadding: string;
  certIconSize: number;
  footerFontSize: number;
  glowTop: number;
  glowRight: number;
  glowWidth: number;
  glowHeight: number;
};

const layoutConfigs: Record<string, LayoutConfig> = {
  landscape: {
    isVertical: false,
    padding: "20px 36px",
    topBarPadding: "14px 36px",
    bottomBarPadding: "12px 36px",
    logoHeight: 48,
    logoFallbackSize: 48,
    logoFallbackFont: 20,
    skuFontSize: 14,
    skuPadding: "8px 20px",
    titleFontSize: 38,
    imageMaxSize: 480,
    imageBorderRadius: 16,
    imageGap: 32,
    specGap: "8px 16px",
    specPadding: "12px 16px",
    specLabelFont: 10,
    specValueFont: 20,
    certFontSize: 14,
    certPadding: "10px 20px",
    certIconSize: 16,
    footerFontSize: 11,
    glowTop: -200,
    glowRight: -200,
    glowWidth: 520,
    glowHeight: 520,
  },
  square: {
    isVertical: true,
    padding: "18px 24px",
    topBarPadding: "12px 24px",
    bottomBarPadding: "10px 24px",
    logoHeight: 40,
    logoFallbackSize: 40,
    logoFallbackFont: 17,
    skuFontSize: 13,
    skuPadding: "7px 16px",
    titleFontSize: 30,
    imageMaxSize: 440,
    imageBorderRadius: 14,
    imageGap: 16,
    specGap: "6px 10px",
    specPadding: "10px 12px",
    specLabelFont: 9,
    specValueFont: 19,
    certFontSize: 13,
    certPadding: "8px 16px",
    certIconSize: 14,
    footerFontSize: 10,
    glowTop: -140,
    glowRight: -140,
    glowWidth: 400,
    glowHeight: 400,
  },
  portrait: {
    isVertical: true,
    padding: "20px 28px",
    topBarPadding: "14px 28px",
    bottomBarPadding: "10px 28px",
    logoHeight: 42,
    logoFallbackSize: 42,
    logoFallbackFont: 18,
    skuFontSize: 13,
    skuPadding: "7px 16px",
    titleFontSize: 32,
    imageMaxSize: 480,
    imageBorderRadius: 16,
    imageGap: 18,
    specGap: "6px 12px",
    specPadding: "10px 14px",
    specLabelFont: 9,
    specValueFont: 19,
    certFontSize: 13,
    certPadding: "8px 18px",
    certIconSize: 14,
    footerFontSize: 10,
    glowTop: -160,
    glowRight: -160,
    glowWidth: 440,
    glowHeight: 440,
  },
  wide: {
    isVertical: false,
    padding: "14px 36px",
    topBarPadding: "10px 36px",
    bottomBarPadding: "8px 36px",
    logoHeight: 36,
    logoFallbackSize: 36,
    logoFallbackFont: 15,
    skuFontSize: 12,
    skuPadding: "6px 14px",
    titleFontSize: 28,
    imageMaxSize: 360,
    imageBorderRadius: 14,
    imageGap: 28,
    specGap: "6px 14px",
    specPadding: "8px 10px",
    specLabelFont: 8,
    specValueFont: 16,
    certFontSize: 12,
    certPadding: "7px 14px",
    certIconSize: 14,
    footerFontSize: 10,
    glowTop: -100,
    glowRight: -100,
    glowWidth: 340,
    glowHeight: 340,
  },
  hd: {
    isVertical: false,
    padding: "28px 48px",
    topBarPadding: "20px 48px",
    bottomBarPadding: "16px 48px",
    logoHeight: 54,
    logoFallbackSize: 54,
    logoFallbackFont: 22,
    skuFontSize: 15,
    skuPadding: "10px 24px",
    titleFontSize: 44,
    imageMaxSize: 520,
    imageBorderRadius: 20,
    imageGap: 44,
    specGap: "10px 24px",
    specPadding: "14px 18px",
    specLabelFont: 11,
    specValueFont: 22,
    certFontSize: 15,
    certPadding: "10px 22px",
    certIconSize: 18,
    footerFontSize: 13,
    glowTop: -220,
    glowRight: -220,
    glowWidth: 600,
    glowHeight: 600,
  },
};

function GemIcon({ color, size = 13 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h12l4 6-10 13L2 9z" />
      <path d="M11 3l-1.5 6L2 9" />
      <path d="M13 3l1.5 6L22 9" />
      <path d="M2 9h20" />
    </svg>
  );
}

function DiamondIcon({ color, size = 13 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41L13.7 2.71a2.41 2.41 0 0 0-3.41 0z" />
      <path d="M12 2v20" />
    </svg>
  );
}

function PaletteIcon({ color, size = 13 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r="2.5" />
      <circle cx="19" cy="11.5" r="2.5" />
      <circle cx="6" cy="12.5" r="2.5" />
      <circle cx="10" cy="18.5" r="2.5" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  );
}

function ScissorsIcon({ color, size = 13 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
  );
}

function EyeIcon({ color, size = 13 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function FlaskIcon({ color, size = 13 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6" />
      <path d="M10 3v7.4a2 2 0 0 1-.6 1.4L4 16.2a2 2 0 0 0-.6 1.4V20a2 2 0 0 0 2 2h13.2a2 2 0 0 0 2-2v-2.4a2 2 0 0 0-.6-1.4l-5.4-4.4a2 2 0 0 1-.6-1.4V3" />
    </svg>
  );
}

function MapPinIcon({ color, size = 13 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function ScaleIcon({ color, size = 13 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v17" />
      <path d="M5 8l7-5 7 5" />
      <path d="M3 13l2-5 3 2" />
      <path d="M16 13l2-5 3 2" />
      <path d="M1 13h6l1.5 7h7l1.5-7h6" />
    </svg>
  );
}

function RulerIcon({ color, size = 13 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.4 2.4 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0z" />
      <path d="M14.5 12.5l2-2" />
      <path d="M11.5 9.5l2-2" />
      <path d="M8.5 6.5l2-2" />
      <path d="M17.5 15.5l2-2" />
    </svg>
  );
}

function CertIcon({ color, size = 15 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="7" />
      <path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12" />
      <path d="M10 9h4" />
      <path d="M12 7v4" />
    </svg>
  );
}

function ShieldIcon({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

const specIcons: Record<string, (color: string, size?: number) => React.ReactNode> = {
  GEM_TYPE: (c, s) => <GemIcon color={c} size={s} />,
  COLOR: (c, s) => <PaletteIcon color={c} size={s} />,
  SHAPE: (c, s) => <DiamondIcon color={c} size={s} />,
  CUT: (c, s) => <ScissorsIcon color={c} size={s} />,
  TRANSPARENCY: (c, s) => <EyeIcon color={c} size={s} />,
  TREATMENT: (c, s) => <FlaskIcon color={c} size={s} />,
  ORIGIN: (c, s) => <MapPinIcon color={c} size={s} />,
  WEIGHT: (c, s) => <ScaleIcon color={c} size={s} />,
  DIMENSIONS: (c, s) => <RulerIcon color={c} size={s} />,
};

export function InfographicTemplate({ data, theme, size, background = "none" }: InfographicTemplateProps) {
  const c = themeColors[theme];
  const sz = size || INFOGRAPHIC_SIZES[0];
  const l = layoutConfigs[sz.id] || layoutConfigs.landscape;
  const isVertical = l.isVertical;

  const specs = [
    { label: "GEM TYPE", value: data.gemType, icon: "GEM_TYPE" },
    { label: "COLOR", value: data.color, icon: "COLOR" },
    { label: "SHAPE", value: data.shape, icon: "SHAPE" },
    { label: "CUT", value: data.cut, icon: "CUT" },
    { label: "TRANSPARENCY", value: data.transparency, icon: "TRANSPARENCY" },
    { label: "TREATMENT", value: data.treatment, icon: "TREATMENT" },
    { label: "ORIGIN", value: data.origin, icon: "ORIGIN" },
    {
      label: "WEIGHT",
      value:
        data.weightValue != null
          ? `${data.weightValue} ${data.weightUnit || ""}${data.weightRatti ? ` (${data.weightRatti} Ratti)` : ""}`
          : null,
      icon: "WEIGHT",
    },
  ].filter((s) => s.value);

  if (data.dimensionsMm) {
    specs.push({ label: "DIMENSIONS", value: data.dimensionsMm, icon: "DIMENSIONS" });
  }

  const displaySpecs = specs.slice(0, 8);
  const labName = data.certificateLab || data.certifications?.[0] || null;

  const imageBlock = (
    <div
      style={{
        width: isVertical ? "100%" : l.imageMaxSize + 20,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {data.image ? (
        <div
          style={{
            width: l.imageMaxSize,
            height: isVertical ? l.imageMaxSize * 0.65 : "100%",
            borderRadius: l.imageBorderRadius,
            overflow: "hidden",
            background: c.imageBg,
            border: `1.5px solid ${c.imageBorder}`,
            boxShadow: `0 0 60px ${c.accentDim}, 0 20px 50px rgba(0,0,0,${theme === "dark" ? "0.5" : "0.15"})`,
            position: "relative",
          }}
        >
          <img
            src={data.image}
            alt={data.itemName}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: l.imageBorderRadius,
              boxShadow: `inset 0 0 40px ${c.accentDim}`,
              pointerEvents: "none",
            }}
          />
        </div>
      ) : (
        <div
          style={{
            width: l.imageMaxSize,
            height: isVertical ? l.imageMaxSize * 0.65 : "100%",
            borderRadius: l.imageBorderRadius,
            background: c.imageBg,
            border: `1.5px dashed ${c.cardBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <GemIcon color={c.textMuted} size={40} />
          <div style={{ fontSize: 13, color: c.textMuted, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            No Image
          </div>
        </div>
      )}
    </div>
  );

  const specsBlock = (
    <div style={{ flex: isVertical ? undefined : 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
      {/* Item name */}
      <div style={{ marginBottom: isVertical ? 12 : 22 }}>
        <h1
          style={{
            fontSize: l.titleFontSize,
            fontWeight: 800,
            lineHeight: 1.15,
            color: c.text,
            margin: 0,
            letterSpacing: "-0.03em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {data.itemName}
        </h1>
        <div
          style={{
            width: l.titleFontSize * 1.4,
            height: 2.5,
            borderRadius: 2,
            background: `linear-gradient(90deg, ${c.accent} 0%, transparent 100%)`,
            marginTop: 8,
          }}
        />
      </div>

      {/* Spec grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: l.specGap,
        }}
      >
        {displaySpecs.map((spec) => (
          <div
            key={spec.label}
            style={{
              padding: l.specPadding,
              borderRadius: 10,
              background: c.specBg,
              border: `1px solid ${c.specBorder}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
              <span style={{ display: "flex", alignItems: "center" }}>
                {specIcons[spec.icon]?.(c.accent, l.specLabelFont + 3)}
              </span>
              <span
                style={{
                  fontSize: l.specLabelFont,
                  fontWeight: 700,
                  color: c.textMuted,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                {spec.label}
              </span>
            </div>
            <div
              style={{
                fontSize: l.specValueFont,
                fontWeight: 700,
                color: c.text,
                lineHeight: 1.2,
              }}
            >
              {String(spec.value)}
            </div>
          </div>
        ))}
      </div>

      {/* Lab Certified badge */}
      {labName && (
        <div style={{ marginTop: isVertical ? 12 : 16, paddingTop: isVertical ? 10 : 14, borderTop: `1px solid ${c.divider}` }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: l.certPadding,
              borderRadius: 8,
              background: c.accentDim,
              border: `1.5px solid ${c.accent}`,
              fontSize: l.certFontSize,
              fontWeight: 700,
              color: c.accent,
              letterSpacing: "0.03em",
            }}
          >
            <CertIcon color={c.accent} size={l.certIconSize} />
            LAB CERTIFIED — {labName}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div
      data-infographic
      style={{
        width: sz.width,
        height: sz.height,
        position: "relative",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        background: c.bg,
        color: c.text,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Gemstone background */}
      <GemstoneBackground background={background} theme={theme} width={sz.width} height={sz.height} />

      {/* Ambient glow */}
      <div
        style={{
          position: "absolute",
          top: l.glowTop,
          right: l.glowRight,
          width: l.glowWidth,
          height: l.glowHeight,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${c.accentGlow} 0%, transparent 65%)`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: l.glowTop * 0.6,
          left: l.glowRight * -1.2,
          width: l.glowWidth * 0.6,
          height: l.glowHeight * 0.6,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${c.accentDim} 0%, transparent 65%)`,
          pointerEvents: "none",
        }}
      />

      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: l.topBarPadding,
          borderBottom: `1px solid ${c.divider}`,
          background: c.topBarBg,
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {data.logoUrl ? (
            <img
              src={data.logoUrl}
              alt="Logo"
              style={{ height: l.logoHeight, width: "auto", objectFit: "contain" }}
            />
          ) : (
            <div
              style={{
                width: l.logoFallbackSize,
                height: l.logoFallbackSize,
                borderRadius: 10,
                background: c.card,
                border: `1.5px solid ${c.cardBorder}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              <div style={{ fontSize: l.logoFallbackFont, fontWeight: 800, color: c.accent, letterSpacing: -1 }}>
                KG
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            padding: l.skuPadding,
            borderRadius: 8,
            background: c.accentDim,
            border: `1.5px solid ${c.accent}`,
            color: c.accent,
            fontSize: l.skuFontSize,
            fontWeight: 700,
            letterSpacing: "0.08em",
            fontFamily: '"SF Mono", "Cascadia Code", "Consolas", monospace',
          }}
        >
          {data.sku}
        </div>
      </div>

      {/* Main content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: isVertical ? "column" : "row",
          padding: l.padding,
          gap: l.imageGap,
          position: "relative",
          zIndex: 1,
        }}
      >
        {isVertical ? (
          <>
            {imageBlock}
            {specsBlock}
          </>
        ) : (
          <>
            {imageBlock}
            {specsBlock}
          </>
        )}
      </div>

      {/* Bottom bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          padding: l.bottomBarPadding,
          borderTop: `1px solid ${c.divider}`,
          background: c.bottomBarBg,
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <ShieldIcon color={c.accent} size={l.footerFontSize + 1} />
          <span
            style={{
              fontSize: l.footerFontSize,
              color: c.textMuted,
              letterSpacing: "0.06em",
              fontWeight: 600,
            }}
          >
            KhyatiGems™ — AUTHENTICATED
          </span>
        </div>
      </div>
    </div>
  );
}
