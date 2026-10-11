/** Etsy descriptions are plain text; normalize older ERP Markdown as well as new copy. */
export function etsyPlainText(value: string): string {
  return value.replace(/\r\n?/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\([#*_-])/g, "$1")
    .replace(/\\[ \t]*\n/g, "\n")
    .replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, "")
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/__([^_\n]+)__/g, "$1")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "$1 ($2)")
    .replace(/^([ \t]*)[-*]\s+/gm, "$1\u2022 ")
    .replace(/\n{3,}/g, "\n\n").trim();
}
