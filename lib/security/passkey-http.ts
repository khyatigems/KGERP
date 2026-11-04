import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { generateRegistrationOptions, verifyRegistrationResponse } from "erp-webauthn-server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sameOrigin, readCookie, requestContext, digest } from "@/lib/security/core";
import { rateLimit, securityEvent } from "@/lib/security/service";
import { CHALLENGE_COOKIE, issuePasskeyToken, readPasskeyToken, listPasskeys } from "@/lib/security/passkey-store";

const headers = { "Cache-Control": "no-store" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });
export function configuration(request: Request) {
  // Never derive the relying party from an untrusted forwarded host in production.
  const configured = process.env.PASSKEY_ORIGIN || process.env.AUTH_URL || process.env.NEXTAUTH_URL;
  if (!configured && process.env.NODE_ENV === "production") throw new Error("Passkey origin is not configured");
  const url = new URL(configured || request.url);
  if (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && url.hostname === "localhost")) throw new Error("HTTPS required");
  if (new URL(request.url).origin !== url.origin) throw new Error("Origin mismatch");
  return { origin: url.origin, rpID: url.hostname };
}
function cookie(response: NextResponse, name: string, value: string) {
  response.cookies.set(name, value, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: value ? 300 : 0 });
  return response;
}
export async function getPasskeys(request: Request, identify: typeof auth = auth) {
  const session = await identify();
  if (!session?.user?.id) return json({ error: "Unauthorized" }, 401);
  try {
    configuration(request);
    const keys = await listPasskeys(session.user.id);
    const preference = await prisma.setting.findUnique({ where: { key: `passkey-prompt:${session.user.id}` } });
    const lastLogin = new Date(session.user.lastLogin || 0).getTime();
    return json({ keys: keys.map(({ id, name, createdAt, lastUsedAt }) => ({ id, name, createdAt, lastUsedAt })), promptAfter: preference?.value || "0", recentLogin: Number.isFinite(lastLogin) && Date.now() - lastLogin < 600000 });
  } catch { return json({ error: "Passkeys are unavailable. Check the HTTPS address and server configuration." }, 503); }
}
export async function postPasskeys(request: Request, identify: typeof auth = auth) {
  if (!sameOrigin(request)) return json({ error: "Invalid origin" }, 403);
  try {
    const { origin, rpID } = configuration(request);
    if (!await rateLimit(`passkey:ip:${requestContext(request).ip}`, 100, 900)) return json({ error: "Too many attempts. Try again later." }, 429);
    const raw = await request.text();
    if (raw.length > 32000) return json({ error: "Request too large" }, 413);
    const body = JSON.parse(raw);
    // Passwordless sign-in is deliberately unsupported. Registered credentials
    // are used only to unlock an already authenticated ERP session.
    if (["login-options", "login-verify"].includes(body.action)) return json({ error: "Passkey sign-in is not supported. Use your email and password." }, 400);
    const session = await identify();
    if (!session?.user?.id) return json({ error: "Unauthorized" }, 401);
    const userId = session.user.id;
    if (!await rateLimit(`passkey:settings:${userId}`, 30, 900)) return json({ error: "Too many attempts. Try later." }, 429);
    if (body.action === "preference") {
      if (!["later", "never", "reset"].includes(body.preference)) return json({ error: "Invalid preference" }, 400);
      const value = body.preference === "never" ? "never" : body.preference === "reset" ? "0" : String(Date.now() + 7 * 86400000);
      await prisma.setting.upsert({ where: { key: `passkey-prompt:${userId}` }, create: { key: `passkey-prompt:${userId}`, value }, update: { value } });
      return json({ saved: true });
    }
    if (body.action === "register-verify") {
      const challenge = await readPasskeyToken(readCookie(request, CHALLENGE_COOKIE), "register", true);
      if (!challenge || challenge.userId !== userId) return json({ error: "Enrollment expired. Start again." }, 400);
      const pending = JSON.parse(challenge.value);
      const current = await prisma.user.findUnique({ where: { id: userId }, select: { password: true } });
      if (!current || digest(current.password) !== pending.passwordHash) return json({ error: "Account changed. Sign in again." }, 401);
      const verification = await verifyRegistrationResponse({ response: body.response, expectedChallenge: pending.challenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true });
      if (!verification.verified || !verification.registrationInfo) return json({ error: "Could not verify passkey." }, 400);
      const { credential } = verification.registrationInfo;
      const added = await prisma.$executeRaw`INSERT INTO SecurityPasskey (id,userId,publicKey,counter,name,createdAt)
        SELECT ${credential.id},${userId},${Buffer.from(credential.publicKey).toString("base64url")},${credential.counter},${pending.name},${new Date().toISOString()}
        WHERE (SELECT COUNT(*) FROM SecurityPasskey WHERE userId = ${userId}) < 10`;
      if (added !== 1) return json({ error: "You can save up to 10 passkeys. Remove an old one first." }, 400);
      await securityEvent(userId, "PASSKEY_ADDED", request);
      return cookie(json({ saved: true }), CHALLENGE_COOKIE, "");
    }
    if (!["register-options", "remove"].includes(body.action)) return json({ error: "Invalid action" }, 400);
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { password: true, email: true, name: true } });
    if (typeof body.password !== "string" || body.password.length > 1024 || !user || !await compare(body.password, user.password)) return json({ error: "Current password is incorrect." }, 401);
    if (body.action === "remove") {
      if (typeof body.id !== "string") return json({ error: "Invalid passkey" }, 400);
      await listPasskeys(userId);
      await prisma.$executeRaw`DELETE FROM SecurityPasskey WHERE id = ${body.id} AND userId = ${userId}`;
      await securityEvent(userId, "PASSKEY_REMOVED", request);
      return json({ saved: true });
    }
    const lastLogin = new Date(session.user.lastLogin || 0).getTime();
    if (!Number.isFinite(lastLogin) || Date.now() - lastLogin > 600000) return json({ error: "For security, sign out and sign in again before adding a passkey (within 10 minutes)." }, 403);
    const keys = await listPasskeys(userId);
    if (keys.length >= 10) return json({ error: "You can save up to 10 passkeys. Remove an old one first." }, 400);
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "My device";
    const options = await generateRegistrationOptions({ rpName: "KhyatiGems ERP", rpID, userName: user.email, userDisplayName: user.name, userID: new Uint8Array(Buffer.from(userId)), attestationType: "none", authenticatorSelection: { residentKey: "required", userVerification: "required" }, excludeCredentials: keys.map(key => ({ id: key.id })) });
    const token = await issuePasskeyToken(userId, "register", JSON.stringify({ challenge: options.challenge, name: name || "My device", passwordHash: digest(user.password) }));
    return cookie(json(options), CHALLENGE_COOKIE, token);
  } catch {
    return json({ error: "Passkey request could not be completed. Try again or use your existing login." }, 400);
  }
}
