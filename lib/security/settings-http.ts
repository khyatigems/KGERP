import { randomUUID } from "node:crypto";
import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { readCookie, sameOrigin, SETTINGS_COOKIE, type SecurityPolicy } from "@/lib/security/core";
import { consumeChallenge, createChallenge, getSecurityPolicy, rateLimit, saveSecurityPolicy, securityEvent, sendSecurityEmail } from "@/lib/security/service";

const schema = z.object({ action: z.enum(["request-code", "save"]), email: z.string().trim().email().max(254).transform(v => v.toLowerCase()), enabled: z.boolean(), alerts: z.boolean(), password: z.string().min(1).max(1024), code: z.string().max(6).optional(), currentCode: z.string().max(6).optional() }).strict();
export async function handleSecuritySettings(
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
    const input = schema.safeParse(JSON.parse(raw));
    if (!input.success) return NextResponse.json({ error: "Check email, password and security settings." }, { status: 400 });
    if (!await rateLimit(`security:admin:${userId}`, 15, 900)) return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
    const body = input.data;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { password: true, email: true } });
    if (!user || !await compare(body.password, user.password)) return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
    const current = await getSecurityPolicy();
    const desired = { email: body.email, enabled: body.enabled, alerts: body.alerts, previousVersion: current.version };
    if (body.action === "request-code") {
      if (!await rateLimit(`security:send:${userId}`, 1, 60)) return NextResponse.json({ error: "Wait 60 seconds before requesting new codes." }, { status: 429 });
      const cookie = await createChallenge(userId, "settings", desired, body.email, user.email, request, current.enabled ? current.email : undefined);
      const response = NextResponse.json({ sent: true, needsCurrentCode: current.enabled && current.email !== body.email }, { headers: { "Cache-Control": "no-store" } });
      response.cookies.set(SETTINGS_COOKIE, cookie, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 300 });
      return response;
    }
    const verified = await consumeChallenge(readCookie(request, SETTINGS_COOKIE), userId, "settings", body.code || "", body.currentCode || "");
    if (!verified || JSON.stringify(verified) !== JSON.stringify(desired)) return NextResponse.json({ error: "Invalid, expired or already used code. If settings changed, request new codes." }, { status: 400 });
    const policy: SecurityPolicy = { enabled: body.enabled, email: body.email, alerts: body.alerts, version: randomUUID() };
    const recoveryCodes = await saveSecurityPolicy(policy, userId, current.version);
    await securityEvent(userId, "SECURITY_POLICY_CHANGED", request);
    // Codes were already delivered successfully before changing policy. Change notices are best effort.
    const notice = `Security settings were changed by ${user.email}. Email verification is ${policy.enabled ? "enabled" : "disabled"}. If unexpected, contact your ERP administrator immediately.`;
    await Promise.allSettled([...new Set([policy.email, ...(current.email ? [current.email] : [])])].map(to => sendSecurityEmail(to, "Security settings changed", notice)));
    const response = NextResponse.json({ saved: true, recoveryCodes, message: policy.enabled ? "2FA is enabled. Save your recovery codes, then sign in again." : "2FA settings saved. Email verification is disabled." }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(SETTINGS_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
    return response;
  } catch {
    return NextResponse.json({ error: "Could not update security settings. Check Zoho delivery and request new codes." }, { status: 503 });
  }
}
