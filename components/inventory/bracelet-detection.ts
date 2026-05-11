import type { CodeRow } from "./inventory-form.types";

const BRACELET_TOKENS = ["bracelet", "bracelets", "bangle", "bangles", "mala"];
const BRACELET_CODES = ["BRA", "BRL", "BRC"];

export function isBraceletSelection(
  categoryName?: string | null,
  categoryCode?: string | null,
  gemType?: string | null,
  categories: CodeRow[] = []
) {
  const selectedCat = categories.find((c) => c.name === categoryName);
  const haystack = [
    categoryName,
    categoryCode,
    selectedCat?.name,
    selectedCat?.code,
    gemType,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (BRACELET_TOKENS.some((token) => haystack.includes(token))) return true;

  const normalizedCode = String(categoryCode || selectedCat?.code || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  return BRACELET_CODES.some((code) => normalizedCode.includes(code));
}
