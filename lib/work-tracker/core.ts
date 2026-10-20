import { z } from "zod";

export const platforms = ["ERP", "EBAY", "ETSY", "AMAZON"] as const;
export const activities = ["LISTING_PREPARATION", "LISTING_CREATION", "SEO", "IMAGES", "INVENTORY", "ORDERS", "CUSTOMER_SERVICE", "SYNCHRONIZATION", "TROUBLESHOOTING", "OTHER"] as const;
export const fields = z.object({
  platform: z.enum(platforms), activityType: z.enum(activities),
  description: z.string().max(500).default(""), sku: z.string().max(150).nullable().optional(),
  marketplaceListingId: z.string().max(150).nullable().optional(), notes: z.string().max(4000).nullable().optional(),
});
export const startSchema = fields.extend({ requestId: z.string().uuid() }).strict();
export const correctionSchema = fields.partial().extend({
  startedAt: z.iso.datetime().optional(), endedAt: z.iso.datetime().optional(), revision: z.number().int().nonnegative(),
}).strict();
export const targetSchema = z.object({ platform: z.enum(platforms), period: z.enum(["DAILY", "WEEKLY"]), targetMinutes: z.number().int().min(1).max(10080) }).strict().refine(value => value.period !== "DAILY" || value.targetMinutes <= 1440, { path: ["targetMinutes"], message: "A daily target cannot exceed 1,440 minutes" });

// Deliberate allowlist, including only seller/www hosts rather than arbitrary subdomains.
const ebay = ["ebay.com", "ebay.co.uk", "ebay.de", "ebay.fr", "ebay.it", "ebay.es", "ebay.ca", "ebay.com.au", "ebay.in"];
const amazon = ["amazon.com", "amazon.in", "amazon.co.uk", "amazon.de", "amazon.fr", "amazon.it", "amazon.es", "amazon.ca", "amazon.com.au", "amazon.co.jp", "amazon.ae"];
export function classifyDomain(host: string, erpHost = "erp.khyatigems.com"): typeof platforms[number] | null {
  if (host === erpHost) return "ERP";
  if (host === "etsy.com" || host === "www.etsy.com" || host === "sell.etsy.com") return "ETSY";
  if (ebay.some(d => [d, `www.${d}`, `sellerhub.${d}`].includes(host))) return "EBAY";
  if (amazon.some(d => [d, `www.${d}`, `sellercentral.${d}`].includes(host))) return "AMAZON";
  return null;
}
export const eventSchema = z.object({
  id: z.string().uuid(), platform: z.enum(platforms), domain: z.string().min(1).max(253).regex(/^[a-z0-9.-]+$/),
  eventType: z.enum(["ACTIVE", "IDLE", "TAB_SWITCH", "WINDOW_FOCUS", "WINDOW_BLUR"]),
  occurredAt: z.iso.datetime(), startedAt: z.iso.datetime().optional(),
  activityType: z.enum(activities), classificationOverride: z.boolean().default(false),
}).strict();
export const eventsSchema = z.object({ events: z.array(eventSchema).min(1).max(100) }).strict();

export class TrackerError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export type Span = { start: number; end: number };
export function occupy(occupied: Span[], span: Span) {
  const sorted = [...occupied, span].sort((a, b) => a.start - b.start);
  occupied.length = 0;
  for (const s of sorted) { const last = occupied[occupied.length - 1]; if (last && s.start <= last.end) last.end = Math.max(last.end, s.end); else occupied.push({ ...s }); }
}
export function subtract(span: Span, occupied: Span[]): Span[] {
  let result = [span];
  for (const block of occupied) result = result.flatMap(s => block.end <= s.start || block.start >= s.end ? [s] :
    [{ start: s.start, end: Math.min(s.end, block.start) }, { start: Math.max(s.start, block.end), end: s.end }].filter(p => p.end > p.start));
  return result;
}
export function seconds(spans: Span[]) { return Math.floor(spans.reduce((n, s) => n + Math.max(0, s.end - s.start), 0) / 1000); }
export function validRange(start: Date, end: Date, now = new Date(), maxDays = 366) {
  if (!Number.isFinite(+start) || !Number.isFinite(+end) || +end <= +start || +end > +now || +end - +start > maxDays * 86400000) throw new TrackerError("Invalid time range or future timestamp");
}
export function dayKey(time: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(time);
  return ["year", "month", "day"].map(k => parts.find(p => p.type === k)!.value).join("-");
}
export function weekKey(day: string) {
  const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7); return d.toISOString().slice(0, 10);
}
export function dateBoundary(day: string, timeZone: string) {
  const center = +new Date(`${day}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(center) || new Date(center).toISOString().slice(0, 10) !== day) throw new TrackerError("Invalid date");
  let low = center - 36 * 3600000, high = center + 36 * 3600000;
  while (low < high) { const mid = Math.floor((low + high) / 2); if (dayKey(mid, timeZone) < day) low = mid + 1; else high = mid; }
  return new Date(low).toISOString();
}
// Locate the next local date boundary; this also handles 23/25-hour DST days.
export function splitDays(span: Span, timeZone: string): (Span & { day: string })[] {
  const result = []; let start = span.start;
  while (start < span.end) {
    const day = dayKey(start, timeZone); let end = span.end;
    if (dayKey(end - 1, timeZone) !== day) {
      let low = start + 1, high = end;
      while (low < high) { const mid = Math.floor((low + high) / 2); if (dayKey(mid, timeZone) === day) low = mid + 1; else high = mid; }
      end = low;
    }
    result.push({ start, end, day }); start = end;
  }
  return result;
}
