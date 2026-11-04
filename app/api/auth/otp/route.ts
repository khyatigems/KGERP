import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { LOGIN_COOKIE, maskEmail, requestContext, sameOrigin } from "@/lib/security/core";
import { createChallenge, getSecurityPolicy, rateLimit, securityEvent } from "@/lib/security/service";
import { getAuthenticatorState } from "@/lib/security/authenticator";

export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  try {
    const raw = await request.text();
    if (raw.length > 4096) return NextResponse.json({ error: "Request too large" }, { status: 413 });
    const body = JSON.parse(raw);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || email.length > 254 || !password || password.length > 1024) return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
    const ip = requestContext(request).ip;
    if (!await rateLimit(`login:start:ip:${ip}`, 100, 900) || !await rateLimit(`login:start:account:${email}`, 10, 900)) return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, password: true } });
    // Dummy bcrypt comparison reduces the timing difference for unknown accounts.
    const valid = await compare(password, user?.password || "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy");
    if (!user || !valid) {
      if (user) await securityEvent(user.id, "LOGIN_PASSWORD_FAILED", request);
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    const policy = await getSecurityPolicy();
    const authenticator = await getAuthenticatorState(user.id);
    if (authenticator.enabled && body.method === "email" && !policy.enabled) return NextResponse.json({ error: "Email fallback is not enabled. Use your authenticator or a recovery code." }, { status: 400 });
    if (authenticator.enabled && body.method !== "email") return NextResponse.json({ required: true, method: "authenticator", emailAvailable: policy.enabled }, { headers: { "Cache-Control": "no-store" } });
    if (!policy.enabled) return NextResponse.json({ required: false }, { headers: { "Cache-Control": "no-store" } });
    if (!await rateLimit(`login:send:${user.id}`, 1, 60)) return NextResponse.json({ error: "Wait 60 seconds before requesting another code." }, { status: 429 });
    const cookie = await createChallenge(user.id, "login", { version: policy.version }, policy.email, email, request);
    const response = NextResponse.json({ required: true, method: "email", authenticatorAvailable: authenticator.enabled, recipient: maskEmail(policy.email) }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(LOGIN_COOKIE, cookie, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 300 });
    return response;
  } catch {
    return NextResponse.json({ error: "Unable to start sign-in. Check Zoho delivery or try again later." }, { status: 503 });
  }
}
