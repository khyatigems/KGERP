import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { renderAuthenticatorQr } from "./authenticator-provisioning";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readCookie, sameOrigin } from "./core";
import { activateAuthenticator, beginAuthenticator, checkPendingAuthenticator, consumeAuthenticator, consumeAuthenticatorRecovery, getAuthenticatorState, removeAuthenticator } from "./authenticator";
import { consumeChallenge, createChallenge, getSecurityPolicy, rateLimit, securityEvent } from "./service";
import { isSecretEncryptionConfigured } from "./secret-store";

const setupCookie = "erp-authenticator-setup";
const schema = z.object({ action: z.enum(["begin", "activate", "remove"]), password: z.string().min(1).max(1024), code: z.string().max(24).optional(), emailCode: z.string().max(6).optional(), version: z.string().uuid().optional() }).strict();
export async function handleAuthenticatorSettings(request: Request, identify: () => Promise<{ user?: { id?: string } } | null> = auth) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const session = await identify();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const headers = { "Cache-Control": "no-store" };
  try {
    const raw = await request.text();
    if (raw.length > 4096) return NextResponse.json({ error: "Request too large" }, { status: 413, headers });
    const parsed = schema.safeParse(JSON.parse(raw));
    if (!parsed.success) return NextResponse.json({ error: "Check your password and verification code." }, { status: 400, headers });
    if (!await rateLimit(`authenticator:settings:${userId}`, 15, 900)) return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429, headers });
    const body = parsed.data;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { password: true, email: true } });
    if (!user || !await compare(body.password, user.password)) return NextResponse.json({ error: "Current password is incorrect." }, { status: 401, headers });
    if (!isSecretEncryptionConfigured()) return NextResponse.json({ error: "Authenticator setup is unavailable. Ask your administrator to configure secret encryption." }, { status: 503, headers });
    const policy = await getSecurityPolicy();
    if (body.action === "begin") {
      if (!await rateLimit(`authenticator:setup:${userId}`, 1, 60)) return NextResponse.json({ error: "Wait 60 seconds before restarting setup." }, { status: 429, headers });
      const setup = await beginAuthenticator(userId, user.email);
      const cookie = policy.enabled ? await createChallenge(userId, "authenticator-setup", { version: setup.version, policyVersion: policy.version }, policy.email, user.email, request) : "";
      const qr = await renderAuthenticatorQr(setup.uri);
      const response = NextResponse.json({ secret: setup.secret, qr, version: setup.version, emailRequired: policy.enabled }, { headers });
      response.cookies.set(setupCookie, cookie, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: policy.enabled ? 300 : 0 });
      return response;
    }
    if (body.action === "activate") {
      if (!body.version) return NextResponse.json({ error: "Restart authenticator setup." }, { status: 400, headers });
      if (!await checkPendingAuthenticator(userId, body.version, body.code || "")) return NextResponse.json({ error: "Invalid authenticator code or expired setup. Check automatic time on your phone." }, { status: 400, headers });
      if (policy.enabled) {
        const verified = await consumeChallenge(readCookie(request, setupCookie), userId, "authenticator-setup", body.emailCode || "");
        if (verified?.version !== body.version || verified?.policyVersion !== policy.version) return NextResponse.json({ error: "Email confirmation expired or is incorrect. Restart setup if already used." }, { status: 400, headers });
      }
      const codes = await activateAuthenticator(userId, body.version, body.code || "");
      if (!codes) return NextResponse.json({ error: "Invalid authenticator code or expired setup. Check automatic time on your phone; restart setup if needed." }, { status: 400, headers });
      await securityEvent(userId, "AUTHENTICATOR_ENABLED", request);
      return NextResponse.json({ saved: true, recoveryCodes: codes, message: "Authenticator enabled for your account. Save your recovery codes, then sign in again." }, { headers });
    }
    const state = await getAuthenticatorState(userId);
    if (!state.enabled || !state.version || !(await consumeAuthenticator(userId, body.code || "", state.version) || await consumeAuthenticatorRecovery(userId, body.code || "", state.version))) {
      return NextResponse.json({ error: "Enter a fresh authenticator code or an unused authenticator recovery code." }, { status: 400, headers });
    }
    await removeAuthenticator(userId, state.version);
    await securityEvent(userId, "AUTHENTICATOR_DISABLED", request);
    return NextResponse.json({ saved: true, message: "Authenticator removed from your account. Company email verification still applies. Sign in again." }, { headers });
  } catch {
    return NextResponse.json({ error: "Could not update your authenticator. Reload and try again." }, { status: 503, headers });
  }
}
