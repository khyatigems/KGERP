import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import {
  buildEtsyDescriptionFallback,
  buildEtsyDescriptionPrompt,
  type EtsyDescriptionFacts,
} from "@/lib/etsy-description";

const optionalPositiveNumber = z.preprocess(
  (value) => value === "" || value == null || Number(value) <= 0 ? undefined : Number(value),
  z.number().positive().optional()
);
const optionalPositiveInteger = z.preprocess(
  (value) => value === "" || value == null || Number(value) <= 0 ? undefined : Number(value),
  z.number().int().positive().optional()
);

const inventorySchema = z.object({
  itemName: z.string().trim().min(1).max(200),
  category: z.string().max(100).optional(),
  gemType: z.string().max(100).optional(),
  color: z.string().max(100).optional(),
  shape: z.string().max(100).optional(),
  dimensionsMm: z.string().max(100).optional(),
  weightValue: optionalPositiveNumber,
  weightUnit: z.string().max(20).optional(),
  carats: optionalPositiveNumber,
  treatment: z.string().max(100).optional(),
  origin: z.string().max(100).optional(),
  fluorescence: z.string().max(100).optional(),
  transparency: z.string().max(100).optional(),
  clarity: z.string().max(100).optional(),
  clarityGrade: z.string().max(100).optional(),
  cut: z.string().max(100).optional(),
  cutGrade: z.string().max(100).optional(),
  polish: z.string().max(100).optional(),
  braceletType: z.string().max(100).optional(),
  beadSizeMm: optionalPositiveNumber,
  beadCount: optionalPositiveInteger,
  holeSizeMm: optionalPositiveNumber,
  innerCircumferenceMm: optionalPositiveNumber,
  standardSize: z.string().max(100).optional(),
  hasCertification: z.boolean().optional().default(false),
}) satisfies z.ZodType<EtsyDescriptionFacts>;

type InventoryDescription = z.infer<typeof inventorySchema>;

function buildFallbackDescription(inventory: InventoryDescription): string {
  return buildEtsyDescriptionFallback(inventory);
}

function buildPrompt(inventory: InventoryDescription): string {
  return buildEtsyDescriptionPrompt(inventory);
}

async function generateWithProvider(prompt: string): Promise<string | null> {
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
            { role: "system", content: "You write factual, policy-conscious Etsy listing copy. Follow the user's data exactly and return only plain text." },
            { role: "user", content: prompt },
          ],
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new Error(`OpenAI description generation failed with status ${response.status}.`);
      const result = await response.json();
      const text = result?.choices?.[0]?.message?.content;
      if (typeof text === "string" && text.trim()) return text.trim();
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
      if (typeof text === "string" && text.trim()) return text.trim();
      throw new Error("Gemini returned empty Etsy description content.");
    } catch (error) {
      console.error("[Etsy Description API] Gemini provider failed:", error);
      errors.push(error instanceof Error ? error.message : "Gemini provider failed.");
    }
  }
  if (errors.length) throw new Error(errors.join(" "));
  return null;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await checkUserPermission(session.user.id, PERMISSIONS.INVENTORY_EDIT))) {
    return NextResponse.json({ error: "You do not have permission to generate inventory descriptions." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = z.object({ inventory: inventorySchema }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Provide a valid inventory item name and product details." }, { status: 400 });
  }

  const fallback = buildFallbackDescription(parsed.data.inventory);
  try {
    const generated = await generateWithProvider(buildPrompt(parsed.data.inventory));
    const description = (generated || fallback).replace(/<[^>]*>/g, "").slice(0, 5000).trim();
    return NextResponse.json({
      description,
      provider: generated ? (process.env.OPENAI_API_KEY?.trim() ? "openai" : "gemini") : "template",
      ...(generated ? {} : { warning: "No configured AI provider was available; a factual template was prepared from inventory data." }),
    });
  } catch (error) {
    console.error("[Etsy Description API] Generation failed:", error);
    return NextResponse.json({
      description: fallback,
      provider: "template",
      warning: error instanceof Error
        ? `${error.message} A factual template was prepared instead.`
        : "AI generation failed. A factual template was prepared instead.",
    });
  }
}
