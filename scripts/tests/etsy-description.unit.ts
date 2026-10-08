import assert from "node:assert/strict";
import {
  buildEtsyDescriptionFallback,
  buildEtsyDescriptionPrompt,
  type EtsyDescriptionFacts,
} from "@/lib/etsy-description";

const factsWithPrivateValues = {
  itemName: "Natural Blue Sapphire",
  category: "Loose Gemstone",
  gemType: "Sapphire",
  color: "Blue",
  shape: "Oval",
  weightValue: 2.4,
  weightUnit: "cts",
  origin: "Sri Lanka",
  treatment: "Heated",
  transparency: "Transparent",
  cutGrade: "Excellent",
  hasCertification: true,
  sku: "PRIVATE-SKU-123",
  certificateNo: "PRIVATE-CERT-98765",
} as EtsyDescriptionFacts & { sku: string; certificateNo: string };

const description = buildEtsyDescriptionFallback(factsWithPrivateValues);
const prompt = buildEtsyDescriptionPrompt(factsWithPrivateValues);
const requiredHeadings = [
  "## 1. PRODUCT DESCRIPTION",
  "### ✨ About This Gemstone",
  "### 💎 Product Details",
  "### 🔬 Certification",
  "### 🌈 Gemstone Characteristics",
  "### 💍 Perfect For",
  "### 🎁 What You Will Receive",
  "### 📸 Important Photography Note",
  "### 📦 Packaging & Shipping",
  "### ⭐ Why Buy From KhyatiGems",
];

for (const heading of requiredHeadings) {
  assert.ok(description.includes(heading), `fallback should include ${heading}`);
  assert.ok(prompt.includes(heading), `AI prompt should require ${heading}`);
}
assert.match(description, /Certification authority: GCI/);
assert.match(description, /2\.4 cts/);
assert.match(description, /Sri Lanka/);
const perfectFor = description.split("### 💍 Perfect For\n")[1]?.split("\n\n### ")[0] || "";
assert.equal(perfectFor.split("\n").filter((line) => line.startsWith("- ")).length, 5);
assert.doesNotMatch(description, /PRIVATE-SKU-123|PRIVATE-CERT-98765/);
assert.doesNotMatch(prompt, /PRIVATE-SKU-123|PRIVATE-CERT-98765/);
assert.doesNotMatch(buildEtsyDescriptionFallback({ itemName: "Quartz" }), /Certification authority: GCI/);

console.log("Etsy description unit tests passed.");
