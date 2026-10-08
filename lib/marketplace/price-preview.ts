export function calculateDiscountedInr(
  listingPrice: number,
  inrPerUnit: number,
  discountPercent: number
): number | null {
  if (
    !Number.isFinite(listingPrice) ||
    listingPrice <= 0 ||
    !Number.isFinite(inrPerUnit) ||
    inrPerUnit <= 0 ||
    !Number.isFinite(discountPercent) ||
    discountPercent < 0 ||
    discountPercent >= 100
  ) {
    return null;
  }

  return listingPrice * inrPerUnit * (1 - discountPercent / 100);
}

export function isBelowMinimumPrice(salePriceInr: number | null, mspInr: number | null): boolean | null {
  if (salePriceInr === null || mspInr === null || !Number.isFinite(salePriceInr) || !Number.isFinite(mspInr)) {
    return null;
  }
  return salePriceInr < mspInr;
}
