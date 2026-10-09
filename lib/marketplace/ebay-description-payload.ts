// The Inventory API's product description has a 4,000-character limit.
// Keep the full HTML template separately in offer.listingDescription.
export function buildEbayInventoryDescription(html: string, title: string): string {
  const text = html
    .replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code: string) => {
      const number = code.toLowerCase().startsWith("x") ? parseInt(code.slice(1), 16) : parseInt(code, 10);
      return number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : " ";
    })
    .replace(/&(?:nbsp|amp|lt|gt|quot|apos);/gi, (entity) => ({
      "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'",
    }[entity.toLowerCase()] || entity))
    .replace(/\s+/g, " ").trim();
  return (text || title.trim()).slice(0, 4000).replace(/[\uD800-\uDBFF]$/, "");
}
