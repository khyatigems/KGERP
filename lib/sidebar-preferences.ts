export const SIDEBAR_COLLAPSED_COOKIE = "khyatigems-sidebar-collapsed";
export const SIDEBAR_GROUPS_COOKIE = "khyatigems-sidebar-groups";
export const SIDEBAR_GROUPS_STORAGE_KEY = "khyatigems-sidebar-groups";
export const SIDEBAR_COLLAPSED_STORAGE_KEY = SIDEBAR_COLLAPSED_COOKIE;

export const SIDEBAR_GROUP_IDS = [
  "website",
  "overview",
  "catalog",
  "marketplaces",
  "sell-flow",
  "buy-partners",
  "fulfill",
  "insight-admin",
] as const;

/** Parse a cookie value or the legacy JSON localStorage value deterministically. */
export function parseSidebarExpandedGroups(value: string | null | undefined): string[] {
  if (value == null) return [...SIDEBAR_GROUP_IDS];

  let requested: unknown;
  try {
    const decoded = decodeURIComponent(value);
    requested = decoded.trimStart().startsWith("[") ? JSON.parse(decoded) : decoded.split(",");
  } catch {
    return [...SIDEBAR_GROUP_IDS];
  }

  if (!Array.isArray(requested) || requested.some((id) => typeof id !== "string")) {
    return [...SIDEBAR_GROUP_IDS];
  }

  const selected = new Set(requested);
  return SIDEBAR_GROUP_IDS.filter((id) => selected.has(id));
}
