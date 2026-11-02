export type PriceObservation = { price: number; currency: string; changedBy: string; changedAt: Date };

/** Seed the saved pre-sync price before replacing it, including legacy rows with no history. */
export function priceObservations(input: {
  previous?: { price: number | null; currency: string; observedAt: Date };
  latest?: { price: number; currency?: string | null };
  price: number | null;
  currency: string;
  source: string;
  now: Date;
}): PriceObservation[] {
  const result: PriceObservation[] = [];
  let latest = input.latest;
  const previous = input.previous;
  if (previous?.price != null && Number.isFinite(previous.price) && (!latest || latest.price !== previous.price || (latest.currency && latest.currency !== previous.currency))) {
    result.push({ price: previous.price, currency: previous.currency, changedBy: `${input.source}_BASELINE`, changedAt: new Date(Math.min(previous.observedAt.getTime(), input.now.getTime() - 1)) });
    latest = { price: previous.price, currency: previous.currency };
  }
  if (input.price != null && Number.isFinite(input.price) && (!latest || latest.price !== input.price || (latest.currency && latest.currency !== input.currency))) {
    result.push({ price: input.price, currency: input.currency, changedBy: input.source, changedAt: input.now });
  }
  return result;
}
