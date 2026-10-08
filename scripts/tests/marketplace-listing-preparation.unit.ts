import assert from "node:assert/strict";
import {
  EBAY_TEMPLATE_CATEGORY_PATHS,
  inferEbayProductTemplate,
  isEbayCertificationAuthorityAspect,
  isSensitiveEbayCertificateAspect,
  resolveEbayCondition,
  suggestEbayInventoryAspect,
} from "@/lib/marketplace/listing-preparation";

assert.equal(inferEbayProductTemplate("Loose Gemstone"), "LOOSE_GEMSTONE");
assert.equal(inferEbayProductTemplate("Bracelets & Beads"), "JEWELRY");
assert.equal(inferEbayProductTemplate("Fine Jewelry"), null);
assert.equal(inferEbayProductTemplate("Fine Ring"), null);
assert.match(EBAY_TEMPLATE_CATEGORY_PATHS.LOOSE_GEMSTONE, /Loose Gemstones$/);
assert.match(EBAY_TEMPLATE_CATEGORY_PATHS.JEWELRY, /Bracelets & Charms$/);
assert.equal(resolveEbayCondition("New"), "NEW");
assert.equal(resolveEbayCondition("New with defects"), "NEW_WITH_DEFECTS");
assert.equal(resolveEbayCondition("used"), null);
assert.equal(resolveEbayCondition(null), null);

const inventoryAspectSource = {
  category: "Bracelet",
  gemType: "Tiger's Eye",
  stoneType: "Gemstone",
  color: "Multicolor",
  colorName: "Multicolor",
  shape: "Round",
  clarityGrade: "Opaque",
  cutGrade: "Excellent",
  treatment: null,
  origin: "India",
  originCountry: "India",
  braceletType: "Beaded",
  pieces: 23,
  brandName: "KhyatiGems",
};
assert.equal(suggestEbayInventoryAspect("Gemstone Type", inventoryAspectSource), "Tiger's Eye");
assert.equal(suggestEbayInventoryAspect("Main Stone", inventoryAspectSource), "Tiger's Eye");
assert.equal(suggestEbayInventoryAspect("Style", inventoryAspectSource), "Beaded");
assert.equal(suggestEbayInventoryAspect("Brand", inventoryAspectSource), "KhyatiGems");
assert.equal(suggestEbayInventoryAspect("Type", inventoryAspectSource), "Bracelet");
assert.equal(suggestEbayInventoryAspect("Number of Pieces", inventoryAspectSource), "23");
assert.equal(suggestEbayInventoryAspect("Unit Quantity", inventoryAspectSource), "1");
assert.equal(isEbayCertificationAuthorityAspect("Certification"), true);
assert.equal(isEbayCertificationAuthorityAspect("Certification Authority"), true);
assert.equal(isSensitiveEbayCertificateAspect("Certificate Number"), true);
assert.equal(isSensitiveEbayCertificateAspect("Certification Authority"), false);
assert.equal(suggestEbayInventoryAspect("Certification", inventoryAspectSource), "GCI");
assert.equal(suggestEbayInventoryAspect("Certificate Number", inventoryAspectSource), null);

console.log("Marketplace listing preparation unit tests passed.");
