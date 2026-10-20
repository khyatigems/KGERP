import { z } from "zod";
import { dateBoundary, dayKey, weekKey } from "@/lib/work-tracker/core";

export const sections = ["executive", "inventory", "availability", "marketplaces", "listings", "orders", "revenue", "refunds", "completeness", "images", "certificates", "requiredFields", "sync", "comparisons", "actions", "exceptions", "coverage"] as const;
export const ruleNames = ["missingImages", "missingCertificates", "incompletePercent", "staleSyncHours", "revenueDeclinePercent", "zeroOrders", "failedListings", "inventoryInconsistencies"] as const;
const rule = z.object({ enabled: z.boolean(), warning: z.number().min(0).max(1000000), critical: z.number().min(0).max(1000000), severity: z.enum(["WARNING", "CRITICAL"]) }).strict().refine(r => r.critical >= r.warning, "Critical threshold must be at least warning threshold");
const recipient = z.object({ email: z.string().trim().email().max(254).transform(v => v.toLowerCase()), enabled: z.boolean() }).strict();
export const settingsSchema = z.object({
 enabled: z.boolean(), deliveryEnabled: z.boolean(), name: z.string().trim().min(1).max(100), timezone: z.string().max(80).refine(v => { try { dayKey(Date.now(), v); return true; } catch { return false; } }, "Invalid IANA timezone"),
 frequency: z.literal("WEEKLY"), day: z.number().int().min(0).max(6), time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/), period: z.enum(["PREVIOUS_CALENDAR_WEEK", "PREVIOUS_SEVEN_DAYS"]),
 scope: z.enum(["ALL_CONNECTED", "MARKETPLACES", "SHOPS"]), marketplaces: z.array(z.string().trim().min(1).max(40)).max(20), shopIds: z.array(z.string().max(100)).max(200),
 comparisons: z.boolean(), valuation: z.boolean(), detailedSkus: z.boolean(), syncHealth: z.boolean(), charts: z.boolean(), attachPdf: z.boolean(),
 recipients: z.array(recipient).min(1).max(30), subject: z.string().min(1).max(300).refine(v => !/[\r\n]/.test(v), "Subject cannot contain newlines"), body: z.string().min(1).max(8000),
 sections: z.record(z.enum(sections), z.boolean()), rules: z.record(z.enum(ruleNames), rule),
 requiredFields: z.array(z.enum(["itemName", "category", "gemType", "weight", "description", "price", "shape", "color"])).max(8),
 // Retained only for backward compatibility with previously persisted settings. Certificate reporting now mirrors Inventory > Missing Certification.
 certificateCategories: z.array(z.string().trim().min(1).max(100)).max(50), requiredFieldCategories: z.array(z.string().trim().min(1).max(100)).max(50),
 logo: z.enum(["COMPANY", "APPROVED_DEFAULT"]), footer: z.string().max(250), confidentiality: z.string().max(100),
 retentionDays: z.number().int().min(7).max(730), retryMinutes: z.array(z.number().int().min(1).max(1440)).min(1).max(8), maxAttempts: z.number().int().min(1).max(8),
 maxAttachmentMb: z.number().min(0.1).max(15), testRecipient: z.email().max(254),
}).strict().superRefine((s, ctx) => {
 const emails = s.recipients.map(r => r.email.toLowerCase()); if (new Set(emails).size !== emails.length) ctx.addIssue({ code: "custom", path: ["recipients"], message: "Duplicate recipient email addresses" });
 if (s.deliveryEnabled && !s.recipients.some(r => r.enabled)) ctx.addIssue({ code: "custom", path: ["recipients"], message: "Enable at least one recipient" });
 if (s.scope === "MARKETPLACES" && !s.marketplaces.length) ctx.addIssue({ code: "custom", path: ["marketplaces"], message: "Select a marketplace" });
 if (s.scope === "SHOPS" && !s.shopIds.length) ctx.addIssue({ code: "custom", path: ["shopIds"], message: "Select a shop" });
 const allowed = new Set(["period_start", "period_end", "company_name", "report_name", "orders", "revenue", "new_listings", "critical_issues", "run_id"]);
 for (const key of ["subject", "body"] as const) for (const match of s[key].matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g)) if (!allowed.has(match[1])) ctx.addIssue({ code: "custom", path: [key], message: `Unknown placeholder ${match[1]}` });
});
export type ReportSettings = z.infer<typeof settingsSchema>;
export const defaultSettings: ReportSettings = {
 enabled: false, deliveryEnabled: false, name: "Weekly Business Intelligence Report", timezone: "Asia/Kolkata", frequency: "WEEKLY", day: 1, time: "09:00", period: "PREVIOUS_CALENDAR_WEEK",
 scope: "ALL_CONNECTED", marketplaces: [], shopIds: [], comparisons: true, valuation: true, detailedSkus: false, syncHealth: true, charts: true, attachPdf: true,
 recipients: ["khyatipreciousgems@gmail.com", "akansh.kpgpl@gmail.com", "akansh.gautam@khyatigems.com"].map(email => ({ email, enabled: true })),
 subject: "Khyati Gems | Weekly Business Intelligence Report | {{period_start}}–{{period_end}}", body: "{{report_name}}\nReporting period: {{period_start}} to {{period_end}}\nOrders: {{orders}}\nRecorded order value: {{revenue}}\nConfirmed new listings: {{new_listings}}\nCritical alerts: {{critical_issues}}\n\nPlease review data coverage and action items in the report.",
 sections: Object.fromEntries(sections.map(s => [s, true])) as ReportSettings["sections"],
 rules: Object.fromEntries(ruleNames.map(key => [key, { enabled: true, warning: key === "staleSyncHours" ? 24 : key === "revenueDeclinePercent" ? 10 : key === "zeroOrders" ? 0 : 10, critical: key === "staleSyncHours" ? 72 : key === "revenueDeclinePercent" ? 30 : key === "zeroOrders" ? 0 : 25, severity: "WARNING" }])) as ReportSettings["rules"],
 requiredFields: ["itemName", "category", "weight", "description", "price"], certificateCategories: [], requiredFieldCategories: [], logo: "COMPANY",
 footer: "Khyati Precious Gems Private Limited | Internal business intelligence", confidentiality: "CONFIDENTIAL - INTERNAL USE", retentionDays: 90, retryMinutes: [1, 5, 15, 30], maxAttempts: 5, maxAttachmentMb: 10, testRecipient: "khyatipreciousgems@gmail.com",
};
export const settingsKey = "weekly_business_intelligence_settings";
export const shiftDay = (day: string, days: number) => new Date(+new Date(`${day}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
const clocks = new Map<string, Intl.DateTimeFormat>();
const clock = (date: Date, timezone: string) => { if (!clocks.has(timezone)) clocks.set(timezone, new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })); return clocks.get(timezone)!.format(date); };
// Resolve the first occurrence of the requested local clock time. On a DST gap,
// use the first valid minute after it; on a repeat, use the first occurrence.
export function scheduleOn(day: string, settings: Pick<ReportSettings, "time" | "timezone">) {
 const start = +new Date(dateBoundary(day, settings.timezone)), end = +new Date(dateBoundary(shiftDay(day, 1), settings.timezone));
 for (let t = start; t < end; t += 60000) if (clock(new Date(t), settings.timezone) >= settings.time) return new Date(t);
 return new Date(end - 60000);
}
export function scheduledSlot(settings: ReportSettings, now = new Date(), direction: "next" | "last" = "next") {
 const day = dayKey(+now, settings.timezone);
 for (let offset = 0; offset <= 7; offset++) {
  const candidate = shiftDay(day, direction === "next" ? offset : -offset);
  if (new Date(`${candidate}T12:00:00Z`).getUTCDay() !== settings.day) continue;
  const scheduled = scheduleOn(candidate, settings);
  if (direction === "next" ? +scheduled > +now : +scheduled <= +now) return scheduled;
 }
 throw new Error("Unable to resolve weekly schedule");
}
export function reportingPeriod(settings: ReportSettings, scheduled = new Date()) {
 const day = dayKey(+scheduled, settings.timezone), endDay = settings.period === "PREVIOUS_CALENDAR_WEEK" ? weekKey(day) : day, startDay = shiftDay(endDay, -7);
 return { start: new Date(dateBoundary(startDay, settings.timezone)), end: new Date(dateBoundary(endDay, settings.timezone)), startDay, endDay: shiftDay(endDay, -1), previousStart: new Date(dateBoundary(shiftDay(startDay, -7), settings.timezone)) };
}
export function percentChange(current: number, previous: number) { return previous === 0 ? null : (current - previous) / Math.abs(previous) * 100; }
export function retryAt(attempt: number, settings: ReportSettings, now = new Date(), random = Math.random) { return new Date(+now + settings.retryMinutes[Math.min(Math.max(0, attempt - 1), settings.retryMinutes.length - 1)] * 60000 * (0.9 + random() * 0.2)); }
export function template(text: string, values: Record<string, string>) { return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_, key: string) => values[key] || "Unavailable"); }
export const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
