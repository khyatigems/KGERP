import assert from "node:assert/strict";
import { htmlToPlainText } from "@/lib/email/content";
import {
  formatZohoFromAddress,
  parseZohoTimestamp,
  resolveZohoInboxFolderId,
} from "@/lib/email/connectors/zoho";
import { isGciIntegrationRouteMissing } from "@/lib/gci/client";
import { appendCompanyEmailSignature } from "@/lib/email/signature";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp";

assert.equal(
  htmlToPlainText("<p>Dear &amp; welcome&nbsp;back.</p><style>.hidden{}</style><p>&#8377;100</p>"),
  "Dear & welcome back.\n₹100",
);
assert.equal(
  parseZohoTimestamp("2026-10-05T10:20:30.000Z")?.toISOString(),
  "2026-10-05T10:20:30.000Z",
);
assert.equal(
  parseZohoTimestamp("1791195630000")?.toISOString(),
  new Date(1791195630000).toISOString(),
);
assert.equal(parseZohoTimestamp("not-a-date"), null);
assert.equal(
  isGciIntegrationRouteMissing({
    message: "The route api/integration/certificates/example could not be found.",
  }),
  true,
);
assert.equal(isGciIntegrationRouteMissing({ message: "Certificate not found." }), false);
assert.equal(
  formatZohoFromAddress("support@khyatigems.com"),
  '"KhyatiGems" <support@khyatigems.com>',
);
assert.equal(
  formatZohoFromAddress('"Old Name" <support@khyatigems.com>', 'Khyati "Gems"'),
  '"Khyati \\"Gems\\"" <support@khyatigems.com>',
);
assert.equal(
  resolveZohoInboxFolderId([
    { folderName: "Sent", folderId: "sent-1" },
    { folderName: "INBOX", folderId: 42 },
  ]),
  "42",
);
assert.equal(resolveZohoInboxFolderId([{ folderName: "Sent", folderId: "sent-1" }]), null);
process.env.PUBLIC_BASE_URL = "https://erp.khyatigems.com";
const brandedEmail = appendCompanyEmailSignature({
  text: "Hello <customer>",
  companyName: "Khyati & Gems",
});
assert.equal(
  brandedEmail.text,
  "Hello <customer>\n\nKind regards,\nKhyatiGems\n\nwww.khyatigems.com\nsupport@khyatigems.com\nInstagram: https://www.instagram.com/khyati.gems/?hl=en\nFacebook: https://www.facebook.com/khyatipreciousgems/\nLinkedIn: https://www.linkedin.com/company/khyatigems/\nX: https://x.com/Khyati_Gems\nPinterest: https://in.pinterest.com/khyatipreciousgems/\nGoogle Reviews: https://g.page/r/CVUsCriEo6hkEBM/review\nWhatsApp: https://wa.me/919915270295?text=Hello%20KhyatiGems%2C%20I%20would%20like%20to%20make%20an%20enquiry.",
);
assert.match(brandedEmail.html || "", /KHYATIGEMS_Luxury_Gemstone_Banner/);
assert.match(brandedEmail.html || "", /Untitled_design_xgpike/);
assert.match(brandedEmail.html || "", /Hello &lt;customer&gt;/);
assert.match(brandedEmail.html || "", /https:\/\/wa\.me\/919915270295\?text=Hello%20KhyatiGems/);
assert.match(brandedEmail.html || "", /https:\/\/www\.instagram\.com\/khyati\.gems/);
assert.match(brandedEmail.html || "", /https:\/\/www\.facebook\.com\/khyatipreciousgems/);
assert.match(brandedEmail.html || "", /https:\/\/www\.linkedin\.com\/company\/khyatigems/);
assert.match(brandedEmail.html || "", /https:\/\/x\.com\/Khyati_Gems/);
assert.match(brandedEmail.html || "", /https:\/\/in\.pinterest\.com\/khyatipreciousgems/);
assert.match(brandedEmail.html || "", /https:\/\/g\.page\/r\/CVUsCriEo6hkEBM\/review/);
assert.match(brandedEmail.html || "", /src="https:\/\/erp\.khyatigems\.com\/email\/social-icons\/instagram\.png"/);
assert.match(brandedEmail.html || "", /src="https:\/\/erp\.khyatigems\.com\/email\/social-icons\/reviews\.png"/);
assert.doesNotMatch(brandedEmail.html || "", /<svg\b/i);
assert.match(brandedEmail.html || "", /Kind regards,<br><strong>KhyatiGems<\/strong>/);
const brandedHtmlOnlyEmail = appendCompanyEmailSignature({ html: "<p>Hello</p>", companyName: "KhyatiGems" });
assert.match(brandedHtmlOnlyEmail.html || "", /<p>Hello<\/p>/);
assert.match(brandedHtmlOnlyEmail.html || "", /Kind regards,<br><strong>KhyatiGems<\/strong>/);
assert.equal(brandedHtmlOnlyEmail.text, undefined);
const normalizedLegacySignoff = appendCompanyEmailSignature({
  html: "<p>Thank you.</p><p>Warm regards,<br/>Team Khyati Precious Gems Pvt Ltd</p>",
  text: "Thank you.\n\nWarm regards,\nTeam Khyati Precious Gems Pvt Ltd",
  companyName: "Khyati Precious Gems Pvt Ltd",
});
assert.match(normalizedLegacySignoff.html || "", /Kind regards,<br><strong>KhyatiGems<\/strong>/);
assert.doesNotMatch(normalizedLegacySignoff.html || "", /Team Khyati Precious Gems/);
assert.match(normalizedLegacySignoff.text || "", /Kind regards,\nKhyatiGems/);
assert.doesNotMatch(normalizedLegacySignoff.text || "", /Team Khyati Precious Gems/);
assert.equal(normalizeWhatsAppPhone("+91 98765 43210"), "919876543210");

console.log("communication-content.unit.ts passed");
