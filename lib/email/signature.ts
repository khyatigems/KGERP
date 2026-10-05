const EMAIL_HEADER_BANNER =
  "https://res.cloudinary.com/dxu1jawbs/image/upload/v1791202212/KHYATIGEMS_Luxury_Gemstone_Banner_agficv.png";
const EMAIL_SIGNATURE_BANNER =
  "https://res.cloudinary.com/dxu1jawbs/image/upload/v1791202898/Untitled_design_xgpike.png";
const WEBSITE_URL = "https://www.khyatigems.com";
const SOCIAL_LINKS = [
  { label: "Instagram", url: "https://www.instagram.com/khyati.gems/?hl=en", icon: "instagram" },
  { label: "Facebook", url: "https://www.facebook.com/khyatipreciousgems/", icon: "facebook" },
  { label: "LinkedIn", url: "https://www.linkedin.com/company/khyatigems/", icon: "linkedin" },
  { label: "X", url: "https://x.com/Khyati_Gems", icon: "x" },
  { label: "Pinterest", url: "https://in.pinterest.com/khyatipreciousgems/", icon: "pinterest" },
  { label: "Google Reviews", url: "https://g.page/r/CVUsCriEo6hkEBM/review", icon: "reviews" },
  {
    label: "WhatsApp",
    url: "https://wa.me/919915270295?text=Hello%20KhyatiGems%2C%20I%20would%20like%20to%20make%20an%20enquiry.",
    icon: "whatsapp",
  },
];
const SUPPORT_EMAIL = "support@khyatigems.com";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function emailAssetBaseUrl(): string | null {
  const configured = (
    process.env.PUBLIC_BASE_URL ||
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    ""
  ).trim();
  if (!configured) return null;
  try {
    const url = new URL(configured);
    return url.protocol === "https:" ? url.origin : null;
  } catch {
    console.error("[email-signature] Invalid public app URL; social icon images are unavailable");
    return null;
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeCompanySignoff(value: string, companyName: string, html: boolean): string {
  const aliases = [...new Set([
    companyName,
    "Khyati Precious Gems Pvt Ltd",
    "Khyati Precious Gems Private Limited",
  ].map((name) => name.trim()).filter(Boolean))];
  let normalized = value;
  for (const alias of aliases) {
    const escapedAlias = escapeRegExp(html ? escapeHtml(alias) : alias);
    const separator = html ? "<br\\s*\\/?>" : "\\r?\\n";
    const expression = new RegExp(
      `(?:warm|kind|best)?\\s*regards,?\\s*${separator}\\s*(?:Team\\s+)?${escapedAlias}`,
      "gi",
    );
    normalized = normalized.replace(
      expression,
      html ? "Kind regards,<br><strong>KhyatiGems</strong>" : "Kind regards,\nKhyatiGems",
    );
  }
  return normalized;
}

function textToHtml(text: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#263247">${escapeHtml(text).replace(/\r?\n/g, "<br>")}</div>`;
}

export function socialIcon(name: string): string {
  const svg = 'xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"';
  switch (name) {
    case "instagram":
      return `<svg ${svg} aria-label="Instagram"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor"/></svg>`;
    case "facebook":
      return `<svg ${svg} aria-label="Facebook"><path fill="currentColor" d="M13.4 21v-8h2.7l.4-3.1h-3.1v-2c0-.9.3-1.5 1.6-1.5h1.7V3.6c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.2v2.2H7.6V13h2.7v8z"/></svg>`;
    case "linkedin":
      return `<svg ${svg} aria-label="LinkedIn"><path fill="currentColor" d="M5.2 8.6a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6M3.7 10h3v10h-3zM9 10h2.9v1.4h.1a3.2 3.2 0 0 1 2.9-1.6c3.1 0 3.7 2 3.7 4.6V20h-3v-5c0-1.2 0-2.7-1.7-2.7s-2 1.3-2 2.6V20H9z"/></svg>`;
    case "x":
      return `<svg ${svg} aria-label="X"><path fill="currentColor" d="M18.9 3H22l-6.8 7.8L23.2 21h-6.3L12 14.8 6.6 21H3.4l7.3-8.4L3 3h6.4l4.5 5.9zm-1.1 16h1.7L8.5 4.9H6.7z"/></svg>`;
    case "pinterest":
      return `<svg ${svg} aria-label="Pinterest"><path fill="currentColor" d="M12 2a10 10 0 0 0-3.6 19.3c0-.8 0-1.9.2-2.8l1.3-5.5s-.3-.6-.3-1.5c0-1.4.8-2.5 1.9-2.5.9 0 1.3.7 1.3 1.5 0 .9-.6 2.2-.9 3.5-.3 1 .5 1.8 1.5 1.8 1.8 0 3.2-1.9 3.2-4.7 0-2.4-1.7-4.1-4.1-4.1-2.8 0-4.5 2.1-4.5 4.3 0 .9.3 1.8.8 2.3.2.2.2.3.1.6l-.3 1c-.1.3-.3.4-.6.2-1.3-.6-2.1-2.4-2.1-3.9 0-3.2 2.3-6.2 6.7-6.2 3.5 0 6.2 2.5 6.2 5.9 0 3.5-2.2 6.4-5.2 6.4-1 0-2-.6-2.3-1.2l-.7 2.7c-.2 1-.9 2.1-1.3 2.8A10 10 0 1 0 12 2"/></svg>`;
    case "reviews":
      return `<svg ${svg} aria-label="Google Reviews"><path fill="#4285F4" d="M12 2a10 10 0 0 1 7.1 2.9l-2.9 2.8A6 6 0 0 0 6.1 10l-3.5-2.7A10 10 0 0 1 12 2"/><path fill="#34A853" d="M2.6 7.3 6.1 10a6 6 0 0 0 0 4l-3.5 2.7a10 10 0 0 1 0-9.4"/><path fill="#FBBC05" d="M6.1 14a6 6 0 0 0 9.9 2.3l3 2.4A10 10 0 0 1 2.6 16.7z"/><path fill="#EA4335" d="M19 18.7 16 16.3c.7-.7 1-1.6 1.1-2.3H12v-3.8h9.8c.2.8.3 1.5.3 2.4 0 2.4-1 4.6-3.1 6.1"/></svg>`;
    case "whatsapp":
      return `<svg ${svg} aria-label="WhatsApp"><path fill="currentColor" d="M12 2a9.8 9.8 0 0 0-8.4 14.8L2.3 22l5.4-1.4A9.8 9.8 0 1 0 12 2m0 17.8c-1.5 0-2.9-.4-4.1-1.2l-.3-.2-3.2.8.9-3.1-.2-.3A8 8 0 1 1 12 19.8m4.4-6c-.2-.1-1.5-.8-1.7-.8s-.4-.1-.5.1-.6.8-.8.9-.3.2-.5.1a6.8 6.8 0 0 1-2-1.2 7.4 7.4 0 0 1-1.4-1.7c-.1-.2 0-.3.1-.4l.4-.5.2-.4v-.4c0-.1-.5-1.3-.7-1.8-.2-.4-.4-.4-.5-.4H8.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.4a9.4 9.4 0 0 0 3.6 3.8c.5.2.9.4 1.2.5.5.1.9.1 1.2.1.4-.1 1.5-.6 1.7-1.1.2-.5.2-1 .2-1.1s-.2-.2-.5-.3"/></svg>`;
    default:
      return "";
  }
}

export function appendCompanyEmailSignature(input: {
  html?: string;
  text?: string;
  companyName: string;
}): { html?: string; text?: string } {
  const html = input.html
    ? normalizeCompanySignoff(input.html, input.companyName, true)
    : undefined;
  const text = input.text
    ? normalizeCompanySignoff(input.text, input.companyName, false)
    : undefined;
  const message = html || (text ? textToHtml(text) : "");
  const hasRegards = /\b(?:kind|warm|best)?\s*regards\b|\bsincerely\b/i.test(html || text || "");
  const messageHtml = `${message}${hasRegards ? "" : '<p style="margin:24px 0 0">Kind regards,<br><strong>KhyatiGems</strong></p>'}`;
  const safeCompanyName = escapeHtml(input.companyName);
  const assetBaseUrl = emailAssetBaseUrl();
  const brandedHtml = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f3f5f8">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background:#f3f5f8">
      <tr><td align="center" style="padding:24px 12px">
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:640px;border-collapse:collapse;background:#ffffff">
          <tr><td style="padding:0">
            <a href="${WEBSITE_URL}" style="display:block;text-decoration:none">
              <img src="${EMAIL_HEADER_BANNER}" alt="${safeCompanyName}" width="640" style="display:block;width:100%;max-width:640px;height:auto;border:0">
            </a>
          </td></tr>
          <tr><td style="padding:32px 36px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#263247">
            ${messageHtml}
          </td></tr>
          <tr><td style="padding:0 36px 24px">
            <a href="${WEBSITE_URL}" style="display:block;text-decoration:none">
              <img src="${EMAIL_SIGNATURE_BANNER}" alt="${safeCompanyName}" width="568" style="display:block;width:100%;max-width:568px;height:auto;border:0">
            </a>
          </td></tr>
          <tr><td align="center" style="padding:18px 24px;background:#182846;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.8;color:#ffffff">
            <a href="${WEBSITE_URL}" style="color:#ffffff;text-decoration:underline">www.khyatigems.com</a>
            <span style="padding:0 8px;color:#c8d0df">|</span>
            <a href="mailto:${SUPPORT_EMAIL}" style="color:#ffffff;text-decoration:underline">${SUPPORT_EMAIL}</a>
            <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:12px auto 0;border-collapse:collapse">
              <tr>${SOCIAL_LINKS.map((link) => `<td align="center" style="padding:0 7px"><a href="${link.url}" aria-label="${link.label}" style="display:inline-block;color:#ffffff;text-decoration:none">${assetBaseUrl ? `<img src="${assetBaseUrl}/email/social-icons/${link.icon}.png" alt="" width="18" height="18" border="0" style="display:block;width:18px;height:18px;margin:0 auto 4px;border:0">` : ""}<span style="font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.5;color:#ffffff">${link.label}</span></a></td>`).join("")}</tr>
            </table>
            <div style="padding-top:8px;color:#c8d0df">Thank you for choosing KhyatiGems.</div>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const textRegards = hasRegards ? "" : "\n\nKind regards,\nKhyatiGems";
  const textFooter = `\n\nwww.khyatigems.com\n${SUPPORT_EMAIL}\n${SOCIAL_LINKS.map(({ label, url }) => `${label}: ${url}`).join("\n")}`;
  return {
    html: brandedHtml,
    text: text ? `${text.trimEnd()}${textRegards}${textFooter}` : text,
  };
}
