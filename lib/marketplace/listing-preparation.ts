export type EbayProductTemplate = "LOOSE_GEMSTONE" | "JEWELRY";

export const EBAY_TEMPLATE_CATEGORY_PATHS: Record<EbayProductTemplate, string> = {
  LOOSE_GEMSTONE: "Jewelry & Watches > Loose Diamonds & Gemstones > Loose Gemstones",
  JEWELRY: "Jewelry & Watches > Fashion Jewelry > Bracelets & Charms",
};

export type EbayInventoryAspectSource = {
  category?: string | null;
  gemType?: string | null;
  stoneType?: string | null;
  color?: string | null;
  colorName?: string | null;
  shape?: string | null;
  clarity?: string | null;
  clarityGrade?: string | null;
  cut?: string | null;
  cutGrade?: string | null;
  treatment?: string | null;
  origin?: string | null;
  originCountry?: string | null;
  weightValue?: number | null;
  weightUnit?: string | null;
  carats?: number | null;
  pieces?: number | null;
  braceletType?: string | null;
  standardSize?: string | null;
  beadSizeMm?: number | null;
  beadCount?: number | null;
  brandName?: string | null;
};

export function isEbayCertificationAuthorityAspect(aspectName: string): boolean {
  const normalized = aspectName.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return [
    "certification",
    "certification authority",
    "certifying authority",
    "certification laboratory",
    "certifying laboratory",
    "certification lab",
    "certifying lab",
  ].includes(normalized);
}

export function isSensitiveEbayCertificateAspect(aspectName: string): boolean {
  return /certific/i.test(aspectName) && !isEbayCertificationAuthorityAspect(aspectName);
}

export function suggestEbayInventoryAspect(
  aspectName: string,
  item: EbayInventoryAspectSource
): string | null {
  const aspect = aspectName.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (isEbayCertificationAuthorityAspect(aspectName)) return "GCI";
  if (/certificat/.test(aspect)) return null;
  if (aspect === "gemstone type" || aspect === "main stone") return item.gemType || item.stoneType || null;
  if (aspect === "country of origin" || aspect === "materials sourced from") return item.originCountry || item.origin || null;
  if (aspect === "gemstone shape" || aspect === "main stone shape" || aspect === "shape") return item.shape || null;
  if (aspect === "gemstone color" || aspect === "main stone color" || aspect === "color") return item.colorName || item.color || null;
  if (aspect === "gemstone treatment" || aspect === "main stone treatment") return item.treatment || null;
  if (aspect === "gemstone clarity grade" || aspect === "clarity" || aspect === "clarity grade") return item.clarityGrade || item.clarity || null;
  if (aspect === "cut grade") return item.cutGrade || item.cut || null;
  if (aspect === "brand") return item.brandName || null;
  if (aspect === "style") return item.braceletType || null;
  if (aspect === "type" && /bracelet/i.test(item.category || "")) return "Bracelet";
  if (aspect === "number of pieces") {
    return item.pieces != null && item.pieces > 0 ? String(item.pieces) : null;
  }
  if (aspect === "unit quantity") return "1";
  if (aspect === "weight carats" || aspect === "weight in carats") {
    if (item.carats != null && item.carats > 0) return String(item.carats);
    if (item.weightValue != null && item.weightValue > 0 && /carat|cts?\b/i.test(item.weightUnit || "")) {
      return String(item.weightValue);
    }
  }
  if (aspect === "item length" && item.standardSize) return item.standardSize;
  if (aspect === "main stone" && item.gemType) return item.gemType;
  if (aspect === "material") return item.stoneType || item.gemType || null;
  return null;
}

export function inferEbayProductTemplate(category: string): EbayProductTemplate | null {
  if (/bracelet|bead/i.test(category)) return "JEWELRY";
  if (/loose gemstone|gemstone|loose diamond/i.test(category)) return "LOOSE_GEMSTONE";
  return null;
}

export function resolveEbayCondition(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "new") return "NEW";
  if (normalized === "new other" || normalized === "new other (see details)") return "NEW_OTHER";
  if (normalized === "new with defects") return "NEW_WITH_DEFECTS";
  if (normalized === "manufacturer refurbished") return "MANUFACTURER_REFURBISHED";
  if (normalized === "seller refurbished") return "SELLER_REFURBISHED";
  if (normalized === "very good") return "USED_VERY_GOOD";
  if (normalized === "good") return "USED_GOOD";
  if (normalized === "acceptable") return "USED_ACCEPTABLE";
  if (normalized === "for parts or not working") return "FOR_PARTS_OR_NOT_WORKING";
  return null;
}
