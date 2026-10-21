import { acknowledgeEnquiry } from "@/lib/website/editorial/enquiry-email";
import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { recordMetric } from "@/lib/website/editorial/metrics";
import { websiteEnabled } from "@/lib/website/editorial/database";
import {
  publicFeed,
  consumeLimit,
  saveEnquiry,
} from "@/lib/website/editorial/store";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
function authorized(req: NextRequest) {
  const expected = process.env.WEBSITE_FEED_TOKEN || "";
  const given = req.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  return (
    websiteEnabled() &&
    expected.length >= 32 &&
    Buffer.byteLength(expected) === Buffer.byteLength(given) &&
    timingSafeEqual(Buffer.from(expected), Buffer.from(given))
  );
}
export async function GET(req: NextRequest) {
  if (!authorized(req))
    return NextResponse.json({ error: "Unavailable" }, { status: 403 });
  try {
    return NextResponse.json(await publicFeed(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Content temporarily unavailable" },
      { status: 503 },
    );
  }
}
const inputSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("metric"),
      key: z.string().regex(/^[a-f0-9]{64}$/),
      kind: z.enum(["view", "marketplace", "enquiry"]),
      path: z
        .string()
        .regex(/^\/[a-zA-Z0-9/\-]*$/)
        .max(250),
      target: z.string().url().optional(),
      // Accept the old website payload during a rolling deploy; it is not stored.
      consent: z.literal(true).optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("limit"),
      key: z.string().regex(/^[a-f0-9]{64}$/),
      purpose: z.enum(["assistant", "contact"]),
    })
    .strict(),
  z
    .object({
      type: z.literal("contact"),
      key: z.string().regex(/^[a-f0-9]{64}$/),
      name: z.string().trim().min(1).max(120),
      email: z.string().email().max(200),
      subject: z.string().trim().min(1).max(180),
      message: z.string().trim().min(10).max(6000),
      consent: z.literal(true),
    })
    .strict(),
]);
export async function POST(req: NextRequest) {
  if (!authorized(req))
    return NextResponse.json({ error: "Unavailable" }, { status: 403 });
  try {
    const raw = await req.text();
    if (Buffer.byteLength(raw) > 16000)
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    const value = inputSchema.parse(JSON.parse(raw));
    if (value.type === "metric") {
      if (!(await consumeLimit("metric:" + value.key, 10000, 3600)))
        return NextResponse.json(
          { error: "Too many requests" },
          { status: 429 },
        );
      await recordMetric(value.kind, value.path, value.target);
      return NextResponse.json({ ok: true });
    }
    const purpose = value.type === "contact" ? "contact" : value.purpose;
    const allowed = await consumeLimit(
      `${purpose}:${value.key}`,
      purpose === "contact" ? 5 : 20,
      3600,
    );
    if (!allowed)
      return NextResponse.json(
        { error: "Too many requests. Please try later." },
        { status: 429, headers: { "Retry-After": "3600" } },
      );
    if (value.type === "limit") return NextResponse.json({ allowed: true });
    const id = await saveEnquiry(value);
    let acknowledgement = "failed";
    try {
      acknowledgement = await acknowledgeEnquiry(id);
    } catch {
      /* Saving the enquiry remains successful if mail is unavailable. */
    }
    return NextResponse.json(
      { ok: true, id, reference: await enquiryReference(id), acknowledgement },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof z.ZodError
            ? "Check the enquiry fields and consent."
            : "The enquiry service is unavailable.",
      },
      { status: error instanceof z.ZodError ? 400 : 503 },
    );
  }
}
import { enquiryReference } from "@/lib/website/editorial/enquiry-reference";
