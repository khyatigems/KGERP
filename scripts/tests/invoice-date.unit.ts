import { normalizeDateToUtcNoon } from "@/lib/date";
import { getInvoiceDisplayDate } from "@/lib/invoice-date";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function run() {
  const selected = new Date("2026-03-11T00:00:00.000Z");
  const normalized = normalizeDateToUtcNoon(selected);

  assert(normalized.getUTCFullYear() === 2026, "Year must be preserved");
  assert(normalized.getUTCMonth() === 2, "Month must be preserved (March)");
  assert(normalized.getUTCDate() === 11, "Date must be preserved (11)");
  assert(normalized.getUTCHours() === 12, "Hour must be normalized to 12:00 UTC");

  const display = getInvoiceDisplayDate({ invoiceDate: normalized, createdAt: new Date("2026-03-16T00:00:00.000Z") });
  assert(display.getTime() === normalized.getTime(), "Display date must prefer invoiceDate over createdAt");
}

run();
console.log("invoice-date.unit.ts passed");

