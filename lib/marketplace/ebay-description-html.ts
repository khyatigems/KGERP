import sanitizeHtml from "sanitize-html";

const length = /^(?:auto|0|\d+(?:\.\d+)?(?:px|pt|em|rem|%|vh|vw)|calc\([\d.%pxemr\s+*-]+\))$/i;
const spacing = /^(?:auto|[\d.\s%pxemr-]+)$/i;
const color = /^(?:#[\da-f]{3,8}|[a-z]+|rgba?\([\d\s.,%]+\))$/i;

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
      table: ["width", "cellpadding", "cellspacing", "border"],
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
        background: [color, /^linear-gradient\([\d\s.,%#a-z()-]+\)$/i],
        width: [length], height: [length], "max-width": [length], "min-width": [length], "max-height": [length], "min-height": [length],
        padding: [spacing], margin: [spacing],
        "padding-top": [spacing], "padding-bottom": [spacing], "padding-left": [spacing], "padding-right": [spacing],
        "margin-top": [spacing], "margin-bottom": [spacing], "margin-left": [spacing], "margin-right": [spacing],
        display: [/^(?:block|inline|inline-block|flex|inline-flex|grid|table|table-row|table-cell|none)$/],
        "flex-wrap": [/^(?:wrap|nowrap|wrap-reverse)$/],
        "flex-direction": [/^(?:row|column|row-reverse|column-reverse)$/],
        flex: [/^(?:none|auto|[\d.\s]+(?:auto|\d+(?:px|%))?)$/],
        "justify-content": [/^(?:center|start|end|flex-start|flex-end|space-between|space-around|space-evenly)$/],
        "align-items": [/^(?:center|start|end|flex-start|flex-end|stretch|baseline)$/],
        gap: [spacing], "border-radius": [spacing],
        border: [/^(?:0|none|\d+(?:\.\d+)?px\s+(?:solid|dashed|dotted)\s+(?:#[\da-f]{3,8}|[a-z]+))$/i],
        "border-top": [/^\d+(?:\.\d+)?px\s+(?:solid|dashed|dotted)\s+(?:#[\da-f]{3,8}|[a-z]+)$/i],
        "border-collapse": [/^(?:collapse|separate)$/],
        "box-shadow": [/^[\d.\spx%#a-f-]+$/i],
        "box-sizing": [/^(?:border-box|content-box)$/],
        "object-fit": [/^(?:cover|contain|fill|scale-down|none)$/],
        "aspect-ratio": [/^\d+(?:\s*\/\s*\d+)?$/],
        overflow: [/^(?:hidden|visible|auto|scroll)$/],
        "white-space": [/^(?:normal|pre-line|pre-wrap|nowrap)$/],
        "line-height": [/^\d+(?:\.\d+)?(?:px|em|rem|%)?$/],
        "letter-spacing": [length],
        "word-break": [/^(?:normal|break-all|keep-all|break-word)$/],
        "overflow-wrap": [/^(?:normal|break-word|anywhere)$/],
        "text-decoration": [/^(?:none|underline|line-through)$/],
      },
    },
  });
}
