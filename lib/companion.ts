import { z } from "zod";

export const companionSchema = z.object({
  enabled: z.boolean().default(false),
  character: z.enum(["emerald", "sapphire", "owl", "fox", "sprout"]).default("emerald"),
  size: z.number().int().min(48).max(144).default(80),
  position: z.enum(["bottom-right", "bottom-left", "top-right", "top-left"]).default("bottom-right"),
  greetings: z.boolean().default(true),
  notifications: z.boolean().default(true),
  motivation: z.boolean().default(false),
  animations: z.boolean().default(true),
  quiet: z.boolean().default(false),
  severity: z.enum(["all", "attention"]).default("all"),
  dock: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }).nullable().default(null),
  pinned: z.array(z.string().max(100)).max(8).default([]),
});
export type CompanionPreferences = z.infer<typeof companionSchema>;
export const companionCharacters = [
  { id: "emerald", name: "Facet", detail: "Emerald · calm and precise" },
  { id: "sapphire", name: "Azure", detail: "Sapphire · cool and focused" },
  { id: "owl", name: "Amara", detail: "Amethyst owl · quietly observant" },
  { id: "fox", name: "Ember", detail: "Amber fox · bright and curious" },
  { id: "sprout", name: "Jade", detail: "Crystal keeper · a fresh perspective" },
] as const;
export const companionDefaults = companionSchema.parse({});
export function parseCompanionPreferences(value?: string | null): CompanionPreferences {
  try { return companionSchema.parse(JSON.parse(value || "{}")); }
  catch { return { ...companionDefaults }; }
}
export const companionKey = (userId: string) => `companion:v1:${userId}`;
export { COMPANION_PREFERENCES_EVENT, COMPANION_FEEDBACK_EVENT } from "./companion-events";

export type CompanionNotice = {
  id: string; type: "info" | "success" | "warning" | "error";
  title: string; message: string; href: string | null; readAt: string | null; createdAt: string;
};
export function filterCompanionNotices(items: CompanionNotice[], filter: "all" | "unread" | "attention", query = "") {
  return items.filter(item => (filter !== "unread" || !item.readAt) && (filter !== "attention" || item.type === "warning" || item.type === "error") && `${item.title} ${item.message}`.toLowerCase().includes(query.toLowerCase()));
}
// Only local application paths may be opened from a persisted notification.
export function companionHref(value: string | null) {
  return value && /^\/(?!\/)/.test(value) && !/[\\\x00-\x20]/.test(value) ? value : null;
}
export const companionActions = [
  { href: "/inventory/new", label: "Add gemstone", permission: "inventory:create", context: "/inventory" },
  { href: "/inventory", label: "Open inventory", permission: "inventory:view", context: "/inventory" },
  { href: "/reports/missing-media", label: "Missing images & certificates", permission: "reports:view", context: "/inventory" },
  { href: "/reports/certificate-readiness", label: "Certificate readiness", permission: "reports:view", context: "/inventory" },
  { href: "/marketplace-orders", label: "Marketplace orders", permission: "listings:view", context: "/marketplace" },
  { href: "/settings/marketplace-connections", label: "Marketplace connections", permission: "settings:manage", context: "/marketplace" },
  { href: "/marketplace-sync-history", label: "Sync history", permission: "listings:view", context: "/marketplace" },
  { href: "/reports", label: "Reports", permission: "reports:view", context: "/reports" },
  { href: "/reports/receivables", label: "Outstanding receivables", permission: "reports:view", context: "/sales" },
  { href: "/reports/inventory-aging", label: "Aging inventory", permission: "reports:view", context: "/inventory" },
  { href: "/reports/ops", label: "Operational tasks", permission: "reports:view", context: "/" },
];
