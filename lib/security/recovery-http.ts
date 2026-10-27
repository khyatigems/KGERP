import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { contextText, readCookie, RECOVERY_COOKIE, sameOrigin } from "./core";
import { consumeChallenge, createChallenge, getSecurityPolicy, rateLimit, replaceRecoveryCodes, securityEvent, sendSecurityEmail } from "./service";

const schema = z.object({ action: z.enum(["request-code", "generate"]), password: z.string().min(1).max(1024), code: z.string().max(6).optional() }).strict();
export async function handleRecoveryCodes(
  request: Request,
  identify: () => Promise<{ user?: { id?: string } } | null> = auth,
  permitted: typeof checkUserPermission = checkUserPermission,
) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const session = await identify();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  if (!await permitted(userId, PERMISSIONS.SETTINGS_MANAGE)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const raw = await request.text();
    if (raw.length > 4096) return NextResponse.json({ error: "Request too large" }, { status: 413 });
    const parsed = schema.safeParse(JSON.parse(raw));
    if (!parsed.success) return NextResponse.json({ error: "Enter your password and verification code." }, { status: 400 });
    if (!await rateLimit(`security:admin:${userId}`, 15, 900)) return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { password: true, email: true } });
    if (!user || !await compare(parsed.data.password, user.password)) return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
    const policy = await getSecurityPolicy();
    if (!policy.enabled) return NextResponse.json({ error: "Enable 2FA before generating recovery codes." }, { status: 409 });
    if (parsed.data.action === "request-code") {
      if (!await rateLimit(`recovery:send:${userId}`, 1, 60)) return NextResponse.json({ error: "Wait 60 seconds before requesting another code." }, { status: 429 });
      const cookie = await createChallenge(userId, "recovery", { version: policy.version }, policy.email, user.email, request);
      const response = NextResponse.json({ sent: true }, { headers: { "Cache-Control": "no-store" } });
      response.cookies.set(RECOVERY_COOKIE, cookie, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 300 });
      return response;
    }
    const verified = await consumeChallenge(readCookie(request, RECOVERY_COOKIE), userId, "recovery", parsed.data.code || "");
    if (!verified || verified.version !== policy.version) return NextResponse.json({ error: "Invalid, expired or already used code. Request a new code." }, { status: 400 });
    const recoveryCodes = await replaceRecoveryCodes(userId, policy.version);
    await securityEvent(userId, "RECOVERY_CODES_REPLACED", request);
    await sendSecurityEmail(policy.email, "Recovery codes replaced", `A new set of recovery codes was generated for ${user.email}. Earlier recovery codes for this account no longer work.\n${contextText(request)}\nIf unexpected, contact your administrator immediately.`).catch(() => {});
    const response = NextResponse.json({ recoveryCodes, generatedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(RECOVERY_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
    return response;
  } catch {
    return NextResponse.json({ error: "Could not generate recovery codes. Check Zoho delivery and request a new code." }, { status: 503 });
  }
}
