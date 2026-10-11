import sanitizeHtml from "sanitize-html";

// eBay hides active content. Export a static body fragment, retaining product
// text, tables, images and safe styling without scripts or event handlers.
export function buildEbayStaticDescription(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "font", "center"]),
    allowedAttributes: {
      "*": ["style", "class", "id", "align"],
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "width", "height"],
      td: ["colspan", "rowspan", "width", "height"],
      th: ["colspan", "rowspan"],
      font: ["color", "size", "face"],
    },
    allowedSchemes: ["https", "http", "mailto"],
    allowProtocolRelative: false,
    allowedStyles: {
      "*": {
        color: [/^(?:#[\da-f]{3,8}|[a-z]+|rgba?\([\d\s.,%]+\))$/i],
        "background-color": [/^(?:#[\da-f]{3,8}|[a-z]+|rgba?\([\d\s.,%]+\))$/i],
        "text-align": [/^(?:left|right|center|justify)$/],
        "font-size": [/^\d+(?:\.\d+)?(?:px|pt|em|rem|%)$/],
        "font-weight": [/^(?:normal|bold|[1-9]00)$/],
        "font-family": [/^[\w\s,'"-]+$/],
        width: [/^\d+(?:\.\d+)?(?:px|%)$/],
        "max-width": [/^\d+(?:\.\d+)?(?:px|%)$/],
        padding: [/^[\d\s.px%emr-]+$/],
        margin: [/^[\d\s.px%emr-]+$/],
      },
    },
  });
}
