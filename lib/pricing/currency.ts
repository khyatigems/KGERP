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
] as const;

export type CurrencyCode = (typeof CURRENCY_CODES)[number];

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
