export type EtsyDraftAttribute = { propertyId?: string; valueId?: string; name?: string; value: string };

/** Even custom text/numeric values require the value_ids key. Etsy assigns their IDs. */
export function etsyPropertyForm(attribute: EtsyDraftAttribute): URLSearchParams {
  if (attribute.valueId && !/^[1-9]\d*$/.test(attribute.valueId)) throw new Error("Invalid Etsy attribute value ID.");
  return new URLSearchParams({ value_ids: attribute.valueId || "", values: attribute.value });
}
