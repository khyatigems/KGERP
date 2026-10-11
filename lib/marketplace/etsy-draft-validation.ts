export const ETSY_WHEN_MADE_OPTIONS = [
  ["MADE_TO_ORDER", "Made to order"], ["2020_2026", "2020–2026"],
  ["2010_2019", "2010–2019"], ["2007_2009", "2007–2009"],
  ["2000_2006", "2000–2006"], ["1990s", "1990–1999"],
  ["1980s", "1980–1989"], ["1970s", "1970–1979"],
  ["1960s", "1960–1969"], ["1950s", "1950–1959"],
  ["1940s", "1940–1949"], ["1930s", "1930–1939"],
  ["1920s", "1920–1929"], ["1910s", "1910–1919"],
  ["1900s", "1900–1909"], ["1800s", "1800–1899"],
  ["1700s", "1700–1799"], ["before_1700", "Before 1700"],
  ["before_2007", "Before 2007"],
] as const;

export function etsyDraftValidationErrors(input: { title: string; whenMade: string; tags: string[]; price?: number; whoMade?: string; isSupply?: boolean }) {
  const errors: string[] = [];
  if (input.whoMade === "ANOTHER_COMPANY_OR_PERSON" && input.isSupply === false && ["made_to_order", "2020_2026", "2010_2019", "2007_2009"].includes(input.whenMade.toLowerCase())) {
    errors.push("Etsy cannot accept a modern finished product made by another company. For loose gemstones intended for jewelry making, select Supply or tool. Keep the actual maker and age accurate.");
  }
  const title = input.title.trim().normalize("NFC");
  if (!title || title.length > 140) errors.push("Etsy titles must contain 1–140 characters.");
  if (/[^\p{L}\p{Nd}\p{P}\p{Sm}\p{Zs}™©®]/u.test(title) || /[$^`]/u.test(title)) {
    errors.push("Etsy titles contain unsupported characters. Remove emojis, $, ^, and backticks.");
  }
  if (["%", ":", "&", "+"].some((character) => title.split(character).length > 2)) {
    errors.push("Etsy titles can use each of %, :, &, and + only once.");
  }
  if (!ETSY_WHEN_MADE_OPTIONS.some(([value]) => value.toLowerCase() === input.whenMade.toLowerCase())) {
    errors.push("Choose a supported Etsy date range for When was it made.");
  }
  if (input.tags.length > 13 || input.tags.some((tag) => !tag.trim() || tag.length > 30 || /[^\p{L}\p{Nd}\p{Zs}\-'™©®]/u.test(tag))) {
    errors.push("Use up to 13 Etsy tags, each 1–30 characters, containing letters, numbers, spaces, hyphens, apostrophes, ™, ©, or ®.");
  }
  if (input.price !== undefined && (!Number.isFinite(input.price) || Number(input.price.toFixed(2)) <= 0)) {
    errors.push("The converted Etsy price must be at least 0.01 in the shop currency.");
  }
  return errors;
}
