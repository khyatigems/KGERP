export const CURRENCY_CODES = [
  "INR",
  "USD",
  "EUR",
  "GBP",
  "AUD",
  "CAD",
  "SGD",
  "AED",
  "JPY",
  "CHF",
  "CNY",
  "HKD",
  "NZD",
  "SAR",
  "QAR",
  "KWD",
  "ZAR",
  "THB",
  "MYR",
] as const;

export type CurrencyCode = (typeof CURRENCY_CODES)[number];

export const CURRENCY_OPTIONS: ReadonlyArray<{ code: CurrencyCode; label: string }> = [
  { code: "INR", label: "INR (₹) - Indian Rupee" },
  { code: "USD", label: "USD ($) - US Dollar" },
  { code: "EUR", label: "EUR (€) - Euro" },
  { code: "GBP", label: "GBP (£) - British Pound" },
  { code: "AUD", label: "AUD ($) - Australian Dollar" },
  { code: "CAD", label: "CAD ($) - Canadian Dollar" },
  { code: "SGD", label: "SGD ($) - Singapore Dollar" },
  { code: "AED", label: "AED (د.إ) - UAE Dirham" },
  { code: "JPY", label: "JPY (¥) - Japanese Yen" },
  { code: "CHF", label: "CHF (Fr) - Swiss Franc" },
  { code: "CNY", label: "CNY (¥) - Chinese Yuan" },
  { code: "HKD", label: "HKD ($) - Hong Kong Dollar" },
  { code: "NZD", label: "NZD ($) - New Zealand Dollar" },
  { code: "SAR", label: "SAR (﷼) - Saudi Riyal" },
  { code: "QAR", label: "QAR (﷼) - Qatari Riyal" },
  { code: "KWD", label: "KWD (د.ك) - Kuwaiti Dinar" },
  { code: "ZAR", label: "ZAR (R) - South African Rand" },
  { code: "THB", label: "THB (฿) - Thai Baht" },
  { code: "MYR", label: "MYR (RM) - Malaysian Ringgit" },
];

/** Map of currency code -> amount of that currency for 1 INR (rateToInr is INR per 1 unit). */
export type CurrencyRates = Partial<Record<string, number>>;

/**
 * Convert an amount in `code` to INR using the given rate map.
 * `rateToInr` = how many INR one unit of `code` is worth (e.g. USD → 86).
 * Returns NaN when the code is not INR and no valid rate is configured,
 * so callers can fall back gracefully instead of using a silent magic number.
 */
export function toInr(
  amount: number,
  code: string | null | undefined,
  rates: CurrencyRates
): number {
  const value = Number(amount);
  if (!Number.isFinite(value)) return NaN;
  if (!code || code.toUpperCase() === "INR") return value;
  const rate = Number(rates?.[code.toUpperCase()]);
  if (!Number.isFinite(rate) || rate <= 0) return NaN;
  return value * rate;
}

/** Convert an INR amount to a target currency using the inverse rate. */
export function fromInr(
  amountInr: number,
  code: string | null | undefined,
  rates: CurrencyRates
): number {
  const value = Number(amountInr);
  if (!Number.isFinite(value)) return NaN;
  if (!code || code.toUpperCase() === "INR") return value;
  const rate = Number(rates?.[code.toUpperCase()]);
  if (!Number.isFinite(rate) || rate <= 0) return NaN;
  return value / rate;
}
