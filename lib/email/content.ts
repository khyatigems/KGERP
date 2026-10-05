const HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  bull: "•",
  copy: "©",
  deg: "°",
  divide: "÷",
  euro: "€",
  hellip: "…",
  gt: ">",
  ldquo: "“",
  lsquo: "‘",
  lt: "<",
  mdash: "—",
  ndash: "–",
  nbsp: " ",
  pound: "£",
  quot: '"',
  rdquo: "”",
  reg: "®",
  rsquo: "’",
  trade: "™",
  yen: "¥",
};

export function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code[0] === "#") {
      const hex = code[1]?.toLowerCase() === "x";
      const number = Number.parseInt(code.slice(hex ? 2 : 1), hex ? 16 : 10);
      if (!Number.isFinite(number) || number < 0 || number > 0x10ffff) return entity;
      try {
        return String.fromCodePoint(number);
      } catch {
        return entity;
      }
    }
    return HTML_ENTITIES[code.toLowerCase()] ?? entity;
  });
}

export function htmlToPlainText(value: string): string {
  return decodeHtmlEntities(
    value
      .replace(/<\s*(script|style)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
      .replace(/<\s*br\s*\/?>/gi, "\n")
      .replace(/<\/\s*(?:p|div|li|tr|h[1-6]|blockquote)\s*>/gi, "\n")
      .replace(/<[^>]*>/g, ""),
  ).replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
