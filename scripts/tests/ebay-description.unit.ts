import assert from "node:assert";
import { buildEbayHtmlDescription } from "../../lib/ebay-description";

const html = buildEbayHtmlDescription({
  itemName: "Citrine & Tiger Eye Prosperity Bracelet",
  category: "Bracelets & Beads",
  gemType: "Citrine & Tiger's Eye",
  color: "Multi-Color",
  shape: "Round",
  weightValue: 28.29,
  weightUnit: "gms",
  dimensionsMm: "8mm",
  treatment: "Untreated",
  origin: "Natural",
  transparency: "Opaque",
  certification: "None",
  braceletType: "Elastic",
  beadSizeMm: 8,
  beadCount: 24,
  holeSizeMm: 1,
  innerCircumferenceMm: 160,
  standardSize: "M",
  notes: "This bracelet is perfect for gifting and spiritual practice.",
});

assert.ok(html.includes("Citrine &amp; Tiger Eye Prosperity Bracelet"));
assert.ok(html.includes("Product Specifications"));
assert.ok(html.includes("Total Weight: 28.29 gms"));
assert.ok(html.includes("Bead Shape: Round"));
assert.ok(html.includes("This bracelet is perfect for gifting and spiritual practice."));
assert.ok(html.includes("https://images.unsplash.com/photo-1779786000796-effa1636a7fb"));
assert.ok(html.includes("https://images.unsplash.com/photo-1779786410107-f1729039bb01"));

const certificateUrl =
  "https://gemstonecertificationinstitute.com/track-certificate?certificate_number=GCI202691BB21B";
const htmlWithCertificateUrl = buildEbayHtmlDescription({
  itemName: "Natural Aventurine",
  category: "Loose Gemstone",
  gemType: "Aventurine",
  color: "Green",
  weightValue: 158,
  weightUnit: "gms",
  certification: certificateUrl,
});

assert.ok(htmlWithCertificateUrl.includes("Certification: GCI"));
assert.ok(htmlWithCertificateUrl.includes("<strong>Certification:</strong> GCI"));
assert.ok(!htmlWithCertificateUrl.includes(certificateUrl));
assert.ok(!htmlWithCertificateUrl.includes("track-certificate"));

const htmlWithIgiGtl = buildEbayHtmlDescription({
  itemName: "Certified Gemstone",
  category: "Loose Gemstone",
  gemType: "Gemstone",
  certification: "https://example.com/certificate?certificate_number=IGI-GTL12345",
});

assert.ok(htmlWithIgiGtl.includes("Certification: IGI-GTL"));
