import { NextResponse } from "next/server";

type InventoryPayload = Record<string, unknown>;

function str(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (typeof val === "string") return val.trim();
  if (Array.isArray(val)) return val.map((v) => str(v)).filter(Boolean).join(", ");
  return "";
}

/** Build a professional product description from inventory data — no external AI required. */
function buildProfessionalDescription(inventory: InventoryPayload, additionalInfo: string, sku?: string, mediaUrls?: string[]): string {
  const itemName = str(inventory.itemName) || "Gemstone";
  const category = str(inventory.category);
  const gemType = str(inventory.gemType);
  const color = str(inventory.color);
  const shape = str(inventory.shape);
  const dimensions = str(inventory.dimensionsMm);
  const weightValue = str(inventory.weightValue);
  const weightUnit = str(inventory.weightUnit) || "cts";
  const weightRatti = str(inventory.weightRatti);
  const treatment = str(inventory.treatment);
  const origin = str(inventory.origin);
  const fluorescence = str(inventory.fluorescence);
  const certification = str(inventory.certification);
  const transparency = str(inventory.transparency);
  const stockLocation = str(inventory.stockLocation);
  const notes = str(inventory.notes);
  const certificateComments = str(inventory.certificateComments);
  const braceletType = str(inventory.braceletType);
  const beadSizeMm = str(inventory.beadSizeMm);
  const beadCount = str(inventory.beadCount);
  const holeSizeMm = str(inventory.holeSizeMm);
  const innerCircumferenceMm = str(inventory.innerCircumferenceMm);
  const standardSize = str(inventory.standardSize);
  const extra = additionalInfo.trim();

  // ── Title ──
  const weightStr = weightValue ? `${weightValue} ${weightUnit}` : "";
  const title = [itemName, weightStr].filter(Boolean).join(" — ");

  // ── Overview paragraph ──
  const overviewParts: string[] = [
    `Presenting ${itemName},`,
  ];
  if (gemType) {
    overviewParts.push(`a premium ${gemType.toLowerCase()}`);
  } else {
    overviewParts.push("a premium natural gemstone");
  }
  if (origin) overviewParts.push(`from ${origin}`);
  if (color) overviewParts.push(`featuring a captivating ${color.toLowerCase()} hue`);
  if (weightValue) overviewParts.push(`weighing ${weightStr}`);
  overviewParts.push(
    ". This meticulously selected specimen is now available through Khyati Precious Gems Private Limited, offering exceptional quality and value for discerning buyers, collectors, and jewelry designers."
  );

  // ── Detail paragraph (presence, treatment, certification) ──
  const detailParts: string[] = [];
  if (transparency && transparency.toLowerCase() !== "none") {
    detailParts.push(`The stone exhibits ${transparency.toLowerCase()} transparency`);
    if (fluorescence && fluorescence.toLowerCase() !== "none") {
      detailParts.push(`with ${fluorescence.toLowerCase()} fluorescence`);
    }
    detailParts.push(".");
  } else if (fluorescence && fluorescence.toLowerCase() !== "none") {
    detailParts.push(`The stone exhibits ${fluorescence.toLowerCase()} fluorescence.`);
  }
  if (treatment && treatment.toLowerCase() !== "none" && treatment.toLowerCase() !== "untreated") {
    detailParts.push(` It has undergone ${treatment.toLowerCase()} treatment to enhance its natural beauty.`);
  } else if (treatment && treatment.toLowerCase() === "untreated") {
    detailParts.push(" This gemstone is completely untreated, ensuring its fully natural state.");
  } else {
    detailParts.push(" This gemstone is in its natural state, free from any enhancements.");
  }
  if (certification && certification.toLowerCase() !== "none") {
    detailParts.push(` It is accompanied by a ${certification} certification, guaranteeing authenticity and quality.`);
  }
  if (dimensions) {
    detailParts.push(` The dimensions measure ${dimensions}.`);
  }

  // ── Shape & cut details ──
  if (shape) {
    detailParts.push(` Cut in a ${shape.toLowerCase()} shape, the gemstone displays excellent brilliance and proportion.`);
  }

  // ── Bead / Ring / Pendant specifics ──
  const specificParts: string[] = [];
  if (braceletType) specificParts.push(`Bracelet Type: ${braceletType}`);
  if (beadSizeMm) specificParts.push(`Bead Size: ${beadSizeMm}mm`);
  if (beadCount) specificParts.push(`Bead Count: ${beadCount}`);
  if (holeSizeMm) specificParts.push(`Hole Size: ${holeSizeMm}mm`);
  if (innerCircumferenceMm) specificParts.push(`Inner Circumference: ${innerCircumferenceMm}mm`);
  if (standardSize) specificParts.push(`Standard Size: ${standardSize}`);

  // ── Key Specifications ──
  const specs: string[] = [];
  if (category) specs.push(`Category: ${category}`);
  if (gemType) specs.push(`Gem Type: ${gemType}`);
  if (color) specs.push(`Color: ${color}`);
  if (shape) specs.push(`Shape: ${shape}`);
  if (weightValue) specs.push(`Weight: ${weightValue} ${weightUnit}`);
  if (weightRatti) specs.push(`Ratti Weight: ${weightRatti} ratti`);
  if (dimensions) specs.push(`Dimensions: ${dimensions}`);
  if (origin) specs.push(`Origin: ${origin}`);
  if (treatment && treatment.toLowerCase() !== "none") specs.push(`Treatment: ${treatment}`);
  if (fluorescence && fluorescence.toLowerCase() !== "none") specs.push(`Fluorescence: ${fluorescence}`);
  if (transparency && transparency.toLowerCase() !== "none") specs.push(`Transparency: ${transparency}`);
  if (certification && certification.toLowerCase() !== "none") specs.push(`Certification: ${certification}`);
  if (stockLocation) specs.push(`Stock Location: ${stockLocation}`);
  // ── Build final output ──
  const lines: string[] = [title, ""];

  lines.push(overviewParts.join(" "));
  lines.push("");
  lines.push(detailParts.join(""));
  lines.push("");

  if (specificParts.length > 0) {
    lines.push("Specific Details:");
    specificParts.forEach((s) => lines.push(s));
    lines.push("");
  }

  if (specs.length > 0) {
    lines.push("Key Specifications:");
    specs.forEach((s) => lines.push(`  ${s}`));
    lines.push("");
  }

  if (notes) {
    lines.push(`Notes: ${notes}`);
    lines.push("");
  }

  if (certificateComments) {
    lines.push(`Certificate Comments: ${certificateComments}`);
    lines.push("");
  }

  if (extra) {
    lines.push(`Additional Information: ${extra}`);
    lines.push("");
  }

  if (sku) {
    lines.push(`SKU: ${sku}`);
    lines.push("");
  }

  if (mediaUrls && mediaUrls.length > 0) {
    lines.push("Product Images:");
    mediaUrls.forEach((url) => {
      if (url) lines.push(url);
    });
    lines.push("");
  }

  lines.push("Offered exclusively by Khyati Precious Gems Private Limited.");
  lines.push("For inquiries, pricing, or additional details, please contact our sales team.");

  return lines.join("\n").replace(/\n{3,}/g, "\n\n");
}

/** Extract non-empty, non-media text fields for AI prompt context. */
function buildPrompt(inventory: InventoryPayload, additionalInfo: string) {
  const textOnly = { ...inventory };
  delete (textOnly as Record<string, unknown>).mediaUrl;
  delete (textOnly as Record<string, unknown>).mediaUrls;

  const labels: Record<string, string> = {
    itemName: "Item Name",
    internalName: "Internal Name",
    category: "Category",
    gemType: "Gem Type",
    color: "Color",
    shape: "Shape",
    dimensionsMm: "Dimensions",
    weightValue: "Weight Value",
    weightUnit: "Weight Unit",
    weightRatti: "Weight in Ratti",
    treatment: "Treatment",
    origin: "Origin",
    fluorescence: "Fluorescence",
    certification: "Certification",
    transparency: "Transparency",
    stockLocation: "Stock Location",
    notes: "Existing Notes",
    certificateComments: "Certificate Comments",
    braceletType: "Bracelet Type",
    beadSizeMm: "Bead Size",
    beadCount: "Bead Count",
    holeSizeMm: "Hole Size",
    innerCircumferenceMm: "Inner Circumference",
    standardSize: "Standard Size",
  };

  const lines: string[] = [];
  for (const [key, label] of Object.entries(labels)) {
    const value = str(textOnly[key]);
    if (value) lines.push(`${label}: ${value}`);
  }

  const addOn = additionalInfo.trim();
  return [
    "Create a professional ERP inventory product description for gemstone/jewelry business.",
    "Write in clear business English.",
    "Do not invent attributes not present in input.",
    "If a value is missing, skip it silently.",
    "Output format:",
    "1) One concise title line.",
    "2) One paragraph product overview.",
    "3) Bullet list heading 'Key Specifications:' followed by key-value lines.",
    "4) One concise closing line for sales team.",
    "",
    "Inventory Data:",
    ...lines,
    "",
    addOn ? `Additional Product Information: ${addOn}` : ""
  ].filter(Boolean).join("\n");
}

async function generateWithOpenAI(apiKey: string, prompt: string) {
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      messages: [
        { role: "system", content: "You are an expert ERP product content writer for gemstone inventory." },
        { role: "user", content: prompt }
      ]
    })
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `OpenAI request failed (${response.status})`);
  }
  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("OpenAI returned empty content");
  }
  return content.trim();
}

async function generateWithGemini(apiKey: string, prompt: string) {
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Gemini request failed (${response.status})`);
  }
  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Gemini returned empty content");
  }
  return text.trim();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const inventory = (body?.inventory || {}) as InventoryPayload;
    const additionalInfo = typeof body?.additionalInfo === "string" ? body.additionalInfo : "";
    const sku = typeof body?.sku === "string" ? body.sku.trim() : "";
    const mediaUrls = Array.isArray(body?.mediaUrls) ? body.mediaUrls.filter((u: unknown) => typeof u === "string" && u.length > 0) : [];

    // Strip media from the inventory object passed to the AI prompt
    const inventoryForPrompt = { ...inventory };
    delete (inventoryForPrompt as Record<string, unknown>).mediaUrl;
    delete (inventoryForPrompt as Record<string, unknown>).mediaUrls;

    const prompt = buildPrompt(inventoryForPrompt, additionalInfo);
    const openAiKey = process.env.OPENAI_API_KEY?.trim();
    const geminiKey = process.env.GEMINI_API_KEY?.trim();

    // Always generate the professional description — use it as immediate response
    // and optionally fall back to AI if keys are configured.
    const professionalDesc = buildProfessionalDescription(inventory, additionalInfo, sku, mediaUrls);

    if (openAiKey || geminiKey) {
      // Try AI, fall back to professional template on failure
      if (openAiKey) {
        try {
          const description = await generateWithOpenAI(openAiKey, prompt);
          return NextResponse.json({ description, provider: "openai" });
        } catch (error) {
          console.error("[AI Description API] OpenAI failed:", error);
        }
      }
      if (geminiKey) {
        try {
          const description = await generateWithGemini(geminiKey, prompt);
          return NextResponse.json({ description, provider: "gemini" });
        } catch (error) {
          console.error("[AI Description API] Gemini failed:", error);
        }
      }
      // AI failed — use professional template
      return NextResponse.json({
        description: professionalDesc,
        provider: "professional-template",
        warning: "AI generation failed. Using professionally crafted template description."
      });
    }

    // No AI keys configured — return professional template immediately
    return NextResponse.json({
      description: professionalDesc,
      provider: "professional-template"
    });
  } catch (error) {
    console.error("[AI Description API] Error:", error);
    return NextResponse.json({
      description: "A professionally crafted product description could not be generated at this time. Please try again.",
      provider: "error-fallback"
    });
  }
}
