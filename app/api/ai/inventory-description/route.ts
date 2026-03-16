import { NextResponse } from "next/server";

type InventoryPayload = Record<string, unknown>;

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.map((v) => stringifyValue(v)).filter(Boolean).join(", ");
  return "";
}

function buildInventoryLines(inventory: InventoryPayload) {
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
    standardSize: "Standard Size"
  };

  const lines: string[] = [];
  for (const [key, label] of Object.entries(labels)) {
    const value = stringifyValue(inventory[key]);
    if (value) lines.push(`${label}: ${value}`);
  }
  return lines;
}

function buildPrompt(inventory: InventoryPayload, additionalInfo: string) {
  const lines = buildInventoryLines(inventory);
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

function buildFallbackDescription(inventory: InventoryPayload, additionalInfo: string) {
  const itemName = stringifyValue(inventory.itemName) || "Gemstone";
  const gemType = stringifyValue(inventory.gemType) || itemName;
  const color = stringifyValue(inventory.color);
  const shape = stringifyValue(inventory.shape);
  const weightValue = stringifyValue(inventory.weightValue);
  const weightUnit = stringifyValue(inventory.weightUnit) || "cts";
  const dimensions = stringifyValue(inventory.dimensionsMm);
  const treatment = stringifyValue(inventory.treatment);
  const origin = stringifyValue(inventory.origin);
  const fluorescence = stringifyValue(inventory.fluorescence);
  const certification = stringifyValue(inventory.certification);
  const transparency = stringifyValue(inventory.transparency);
  const extra = additionalInfo.trim();
  const specs = [
    `Gem Type: ${gemType}`,
    color ? `Color: ${color}` : "",
    shape ? `Shape: ${shape}` : "",
    weightValue ? `Weight: ${weightValue} ${weightUnit}` : "",
    dimensions ? `Dimensions: ${dimensions}` : "",
    origin ? `Origin: ${origin}` : "",
    treatment ? `Treatment: ${treatment}` : "",
    fluorescence ? `Fluorescence: ${fluorescence}` : "",
    transparency ? `Transparency: ${transparency}` : "",
    certification ? `Certification: ${certification}` : ""
  ].filter(Boolean);

  return [
    `${itemName}${weightValue ? ` - ${weightValue} ${weightUnit}` : ""}`,
    "",
    `${itemName} is a quality ${gemType}${color ? ` in ${color}` : ""}${shape ? ` with ${shape} shape` : ""}.`,
    "",
    "Key Specifications:",
    ...specs,
    extra ? `Additional Details: ${extra}` : "",
    "",
    `Prepared for KhyatiGems inventory listing and sales presentation.`
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
    const prompt = buildPrompt(inventory, additionalInfo);
    const openAiKey = process.env.OPENAI_API_KEY?.trim();
    const geminiKey = process.env.GEMINI_API_KEY?.trim();

    if (!openAiKey && !geminiKey) {
      return NextResponse.json({
        description: buildFallbackDescription(inventory, additionalInfo),
        provider: "template",
        warning: "AI provider key not configured. Using structured fallback description."
      });
    }

    if (openAiKey) {
      try {
        const description = await generateWithOpenAI(openAiKey, prompt);
        return NextResponse.json({ description, provider: "openai" });
      } catch (error) {
        if (!geminiKey) throw error;
      }
    }

    if (geminiKey) {
      const description = await generateWithGemini(geminiKey, prompt);
      return NextResponse.json({ description, provider: "gemini" });
    }

    return NextResponse.json({
      description: buildFallbackDescription(inventory, additionalInfo),
      provider: "template"
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate product description" },
      { status: 500 }
    );
  }
}
