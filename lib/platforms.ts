export type PlatformKey = string;

export type PlatformConfigEntry = {
  label?: string;
  logoUrl?: string | null;
  active?: boolean;
};

export type NormalizedPlatformConfigEntry = PlatformConfigEntry & {
  code: PlatformKey;
  label: string;
  logoUrl: string | null;
  active: boolean;
  allowLogo: boolean;
  order: number;
};

export const CORE_PLATFORMS: Array<{ code: PlatformKey; label: string; allowLogo: boolean }> = [
  { code: "MANUAL", label: "Offline / Walk-in", allowLogo: false },
  { code: "AMAZON", label: "Amazon", allowLogo: true },
  { code: "ETSY", label: "Etsy", allowLogo: true },
  { code: "EBAY", label: "eBay", allowLogo: true },
  { code: "FACEBOOK", label: "Facebook", allowLogo: true },
  { code: "WHATSAPP", label: "WhatsApp", allowLogo: true },
];

const CORE_PLATFORM_ORDER = CORE_PLATFORMS.map((platform) => platform.code);

function toTitleCase(input: string): string {
  return input
    .replace(/[_\-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");
}

export function formatPlatformCode(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
}

export function normalizePlatformConfig(raw: unknown): Record<string, PlatformConfigEntry> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return normalizePlatformConfig(parsed);
    } catch {
      return {};
    }
  }
  if (Array.isArray(raw)) {
    return raw.reduce<Record<string, PlatformConfigEntry>>((acc, entry) => {
      if (!entry || typeof entry !== "object") return acc;
      const code = "code" in entry && typeof entry.code === "string" ? entry.code : undefined;
      if (!code) return acc;
      const normalizedCode = formatPlatformCode(code);
      acc[normalizedCode] = {
        label: typeof (entry as any).label === "string" ? (entry as any).label : undefined,
        logoUrl: typeof (entry as any).logoUrl === "string" ? (entry as any).logoUrl : undefined,
        active: typeof (entry as any).active === "boolean" ? (entry as any).active : undefined,
      };
      return acc;
    }, {});
  }
  if (typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    return Object.entries(record).reduce<Record<string, PlatformConfigEntry>>((acc, [key, value]) => {
      if (!key) return acc;
      const normalizedCode = formatPlatformCode(key);
      if (!normalizedCode) return acc;
      if (!value || typeof value !== "object") {
        acc[normalizedCode] = {};
        return acc;
      }
      const val = value as Record<string, unknown>;
      acc[normalizedCode] = {
        label: typeof val.label === "string" && val.label.trim() ? val.label.trim() : undefined,
        logoUrl: typeof val.logoUrl === "string" && val.logoUrl.trim() ? val.logoUrl.trim() : undefined,
        active: typeof val.active === "boolean" ? val.active : undefined,
      };
      return acc;
    }, {});
  }
  return {};
}

export function mergePlatformConfig(raw: unknown): Record<string, NormalizedPlatformConfigEntry> {
  const normalized = normalizePlatformConfig(raw);
  const result: Record<string, NormalizedPlatformConfigEntry> = {};
  let orderCounter = CORE_PLATFORM_ORDER.length;

  CORE_PLATFORMS.forEach((platform, index) => {
    const entry = normalized[platform.code] || {};
    result[platform.code] = {
      code: platform.code,
      label: entry.label || platform.label,
      logoUrl: platform.allowLogo ? entry.logoUrl || null : null,
      active: entry.active ?? true,
      allowLogo: platform.allowLogo,
      order: index,
    };
  });

  Object.entries(normalized).forEach(([code, entry]) => {
    if (result[code]) return;
    result[code] = {
      code,
      label: entry.label || toTitleCase(code),
      logoUrl: entry.logoUrl || null,
      active: entry.active ?? true,
      allowLogo: true,
      order: orderCounter++,
    };
  });

  return Object.fromEntries(
    Object.values(result)
      .sort((a, b) => a.order - b.order)
      .map((entry) => [entry.code, entry])
  );
}

export function serializePlatformConfig(config: Record<string, NormalizedPlatformConfigEntry>): Record<string, PlatformConfigEntry> {
  return Object.fromEntries(
    Object.entries(config).map(([code, entry]) => [code, { label: entry.label, logoUrl: entry.logoUrl || undefined, active: entry.active }])
  );
}

export function getPlatformLabel(code: string, config?: Record<string, PlatformConfigEntry>): string {
  const normalizedCode = formatPlatformCode(code);
  if (!normalizedCode) return "";
  const merged = mergePlatformConfig(config || {});
  return merged[normalizedCode]?.label || toTitleCase(normalizedCode);
}

export function listActivePlatforms(config: Record<string, NormalizedPlatformConfigEntry>): Array<NormalizedPlatformConfigEntry> {
  return Object.values(config)
    .filter((entry) => entry.active)
    .sort((a, b) => a.order - b.order);
}

export function isLogoAllowed(code: string): boolean {
  const normalizedCode = formatPlatformCode(code);
  const defaultMatch = CORE_PLATFORMS.find((platform) => platform.code === normalizedCode);
  return defaultMatch ? defaultMatch.allowLogo : true;
}
