export type EtsyDescriptionFacts = {
  itemName: string;
  category?: string | null;
  gemType?: string | null;
  color?: string | null;
  shape?: string | null;
  dimensionsMm?: string | null;
  weightValue?: number | null;
  weightUnit?: string | null;
  carats?: number | null;
  treatment?: string | null;
  origin?: string | null;
  originCountry?: string | null;
  transparency?: string | null;
  clarity?: string | null;
  clarityGrade?: string | null;
  cut?: string | null;
  cutGrade?: string | null;
  polish?: string | null;
  fluorescence?: string | null;
  braceletType?: string | null;
  beadSizeMm?: number | null;
  beadCount?: number | null;
  holeSizeMm?: number | null;
  innerCircumferenceMm?: number | null;
  standardSize?: string | null;
  hasCertification?: boolean;
};

type DescriptionResult = {
  description: string;
  provider: "openai" | "gemini" | "template";
  warning?: string;
};

function clean(value: string | number | null | undefined): string {
  return value === undefined || value === null ? "" : String(value).trim();
}

function weightText(facts: EtsyDescriptionFacts): string {
  if (facts.carats && facts.carats > 0) return `${facts.carats} carats`;
  if (!facts.weightValue || facts.weightValue <= 0) return "";
  const unit = clean(facts.weightUnit);
  return `${facts.weightValue} ${unit || "carats"}`;
}

function itemType(facts: EtsyDescriptionFacts): string {
  const searchable = `${clean(facts.itemName)} ${clean(facts.gemType)}`;
  if (/\blab[-\s]?grown\b|\blab[-\s]?created\b|\bsynthetic\b/i.test(searchable)) return "Lab-Created";
  if (/\bnatural\b/i.test(searchable)) return "Natural";
  return "";
}

function detailLines(facts: EtsyDescriptionFacts): string[] {
  const gemstone = clean(facts.gemType);
  const details: Array<[string, string]> = [
    ["Gemstone", gemstone],
    ["Type", itemType(facts)],
    ["Weight", weightText(facts)],
    ["Shape", clean(facts.shape)],
    ["Color", clean(facts.color)],
    ["Origin", clean(facts.originCountry) || clean(facts.origin)],
    ["Treatment", clean(facts.treatment)],
  ];
  if (facts.hasCertification) details.push(["Certification authority", "GCI"]);
  if (clean(facts.dimensionsMm)) details.push(["Dimensions", clean(facts.dimensionsMm)]);
  if (clean(facts.braceletType)) details.push(["Bracelet type", clean(facts.braceletType)]);
  if (facts.beadSizeMm && facts.beadSizeMm > 0) details.push(["Bead size", `${facts.beadSizeMm} mm`]);
  if (facts.beadCount && facts.beadCount > 0) details.push(["Bead count", String(facts.beadCount)]);
  if (facts.innerCircumferenceMm && facts.innerCircumferenceMm > 0) {
    details.push(["Inner circumference", `${facts.innerCircumferenceMm} mm`]);
  }
  if (clean(facts.standardSize)) details.push(["Size", clean(facts.standardSize)]);
  return details.filter(([, value]) => value).map(([label, value]) => `- **${label}:** ${value}`);
}

export function buildEtsyDescriptionFallback(facts: EtsyDescriptionFacts): string {
  const itemName = clean(facts.itemName);
  const gemstone = clean(facts.gemType) || itemName;
  const characteristics = [
    clean(facts.color) ? `Color: ${clean(facts.color)}` : "",
    clean(facts.transparency) ? `Transparency: ${clean(facts.transparency)}` : "",
    clean(facts.clarityGrade) || clean(facts.clarity)
      ? `Clarity: ${clean(facts.clarityGrade) || clean(facts.clarity)}`
      : "",
    clean(facts.cutGrade) || clean(facts.cut) ? `Cut: ${clean(facts.cutGrade) || clean(facts.cut)}` : "",
    clean(facts.polish) ? `Polish: ${clean(facts.polish)}` : "",
    clean(facts.fluorescence) ? `Fluorescence: ${clean(facts.fluorescence)}` : "",
  ].filter(Boolean);
  const weight = weightText(facts);
  const receiveDetails = [
    `- 1 × ${itemName}`,
    weight ? `- Weight: ${weight}` : "",
    facts.hasCertification ? "- Certification authority: GCI (report identifiers are kept private)" : "",
    "- Secure packaging",
  ].filter(Boolean);

  return [
    "## 1. PRODUCT DESCRIPTION",
    "",
    "### ✨ About This Gemstone",
    `Explore this ${gemstone}${clean(facts.color) ? ` in ${clean(facts.color).toLowerCase()}` : ""}${clean(facts.shape) ? ` with a ${clean(facts.shape).toLowerCase()} shape` : ""}, described using the verified inventory details below.`,
    "Review the measurements, specifications, and item photographs to decide whether it suits your project or collection.",
    "",
    "### 💎 Product Details",
    ...detailLines(facts),
    "",
    "### 🔬 Certification",
    facts.hasCertification
      ? "This item is recorded as having certification information. The certification authority is listed as GCI; certificate numbers and private report identifiers are intentionally omitted."
      : "Certification details are not included in this product description.",
    "",
    "### 🌈 Gemstone Characteristics",
    characteristics.length
      ? `Recorded characteristics: ${characteristics.join("; ")}.`
      : "Please use the recorded product specifications and photographs to review this item's visual characteristics.",
    "",
    "### 💍 Perfect For",
    "- Custom jewelry design",
    "- Gemstone collections",
    "- Lapidary and creative craft projects",
    "- A thoughtful gift for gemstone enthusiasts",
    "- Display and personal collections",
    "",
    "### 🎁 What You Will Receive",
    ...receiveDetails,
    "",
    "### 📸 Important Photography Note",
    "Photographs are provided to show the listed item. Gemstone color may appear slightly different across screens, lighting conditions, and photography.",
    "",
    "### 📦 Packaging & Shipping",
    "The item will be packed securely. Shipping and tracking details follow the delivery option selected at checkout.",
    "",
    "### ⭐ Why Buy From KhyatiGems",
    "- ✅ Carefully selected gemstones",
    "- ✅ Transparent product information",
    "- ✅ Certification information on applicable items",
    "- ✅ Product photographs for item review",
    "- ✅ Secure packaging",
    "- ✅ Professional customer support",
  ].join("\n").slice(0, 5000);
}

export function buildEtsyDescriptionPrompt(facts: EtsyDescriptionFacts): string {
  const allFacts: Array<[string, string]> = [
    ["Product name", clean(facts.itemName)],
    ["Category", clean(facts.category)],
    ["Gemstone", clean(facts.gemType)],
    ["Type, only if explicitly identified in product name", itemType(facts)],
    ["Weight", weightText(facts)],
    ["Shape", clean(facts.shape)],
    ["Color", clean(facts.color)],
    ["Origin", clean(facts.originCountry) || clean(facts.origin)],
    ["Treatment", clean(facts.treatment)],
    ["Dimensions", clean(facts.dimensionsMm)],
    ["Transparency", clean(facts.transparency)],
    ["Clarity", clean(facts.clarityGrade) || clean(facts.clarity)],
    ["Cut", clean(facts.cutGrade) || clean(facts.cut)],
    ["Polish", clean(facts.polish)],
    ["Fluorescence", clean(facts.fluorescence)],
    ["Bracelet type", clean(facts.braceletType)],
    ["Bead size", facts.beadSizeMm ? `${facts.beadSizeMm} mm` : ""],
    ["Bead count", clean(facts.beadCount)],
    ["Hole size", facts.holeSizeMm ? `${facts.holeSizeMm} mm` : ""],
    ["Inner circumference", facts.innerCircumferenceMm ? `${facts.innerCircumferenceMm} mm` : ""],
    ["Size", clean(facts.standardSize)],
    ["Certification recorded", facts.hasCertification ? "Yes" : "No"],
    ["Certification authority when certified", facts.hasCertification ? "GCI" : ""],
  ];
  const verifiedFacts = allFacts.filter(([, value]) => value);

  return [
    "Write a polished Etsy product description in plain text, following the exact section order and headings below.",
    "About This Gemstone must be a 2–3 sentence SEO-friendly introduction about this specific item.",
    "Include Product Details, Certification, Gemstone Characteristics, exactly five generic Perfect For bullets, What You Will Receive, Important Photography Note, Packaging & Shipping, and Why Buy From KhyatiGems.",
    "Use only the verified facts below. Do not invent natural/lab-created status, origin, treatment, quality, grading, inclusions, luster, optical effects, healing properties, packaging specifics, or shipping guarantees.",
    "When a fact is missing, omit that detail rather than guessing. You may use the generic use cases and buyer information in the requested headings.",
    "If certification is recorded, name GCI as the certification authority and explain that certificate numbers and report identifiers are withheld. Never include a certificate number, report identifier, SKU, internal notes, prices, or stock data.",
    "Do not include certificate numbers or any identifying certificate data. Use the exact product name as supplied, but do not add an SKU.",
    "Use plain text (no HTML) and keep the final description below 4,500 characters.",
    "",
    "Use these headings:",
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
    "",
    ...verifiedFacts.map(([name, value]) => `${name}: ${value}`),
  ].join("\n");
}

async function generateWithProvider(prompt: string): Promise<{ text: string; provider: "openai" | "gemini" } | null> {
  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const errors: string[] = [];
  if (openAiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${openAiKey}` },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
          temperature: 0.25,
          messages: [
            { role: "system", content: "You write factual, policy-conscious Etsy listing copy. Follow the supplied facts and structure exactly. Return only plain text." },
            { role: "user", content: prompt },
          ],
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new Error(`OpenAI description generation failed with status ${response.status}.`);
      const result = await response.json();
      const text = result?.choices?.[0]?.message?.content;
      if (typeof text === "string" && text.trim()) return { text: text.trim(), provider: "openai" };
      throw new Error("OpenAI returned empty Etsy description content.");
    } catch (error) {
      console.error("[Etsy Description API] OpenAI provider failed:", error);
      errors.push(error instanceof Error ? error.message : "OpenAI provider failed.");
    }
  }
  if (geminiKey) {
    try {
      const model = process.env.GEMINI_MODEL?.trim() || "gemini-1.5-flash";
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          signal: AbortSignal.timeout(20000),
        }
      );
      if (!response.ok) throw new Error(`Gemini description generation failed with status ${response.status}.`);
      const result = await response.json();
      const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof text === "string" && text.trim()) return { text: text.trim(), provider: "gemini" };
      throw new Error("Gemini returned empty Etsy description content.");
    } catch (error) {
      console.error("[Etsy Description API] Gemini provider failed:", error);
      errors.push(error instanceof Error ? error.message : "Gemini provider failed.");
    }
  }
  if (errors.length) throw new Error(errors.join(" "));
  return null;
}

export async function generateEtsyDescription(facts: EtsyDescriptionFacts): Promise<DescriptionResult> {
  const fallback = buildEtsyDescriptionFallback(facts);
  try {
    const generated = await generateWithProvider(buildEtsyDescriptionPrompt(facts));
    if (!generated) {
      return {
        description: fallback,
        provider: "template",
        warning: "No configured AI provider was available; a factual template was prepared from inventory data.",
      };
    }
    return {
      description: generated.text.replace(/<[^>]*>/g, "").slice(0, 5000).trim(),
      provider: generated.provider,
    };
  } catch (error) {
    console.error("[Etsy Description API] Generation failed:", error);
    return {
      description: fallback,
      provider: "template",
      warning: error instanceof Error
        ? `${error.message} A factual template was prepared instead.`
        : "AI generation failed. A factual template was prepared instead.",
    };
  }
}
