import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { generateAuthenticationOptions, verifyAuthenticationResponse } from "erp-webauthn-server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readCookie, sameOrigin } from "./core";
import { configuration } from "./passkey-http";
import { issuePasskeyToken, listPasskeys, readPasskeyToken } from "./passkey-store";
import { rateLimit, securityEvent } from "./service";
import { APP_LOCK_COOKIE, APP_LOCK_CHALLENGE_COOKIE, appLockState, prepareAppLock, grantAppUnlock, lockApp, renewAppUnlock, disableAppLock } from "./app-lock-store";

type Identify = () => Promise<{ user?: { id?: string; appSessionId?: string } } | null>;
const json = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: { "Cache-Control": "no-store" } });
function setCookie(response: NextResponse, name: string, token: string) {
  response.cookies.set(name, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: token ? 300 : 0 });
  return response;
}
export async function getAppLock(request: Request, identify: Identify = auth) {
  const session = await identify();
  if (!session?.user?.id) return json({ error: "Sign in again.", code: "SIGNED_OUT" }, 401);
  try {
    const state = await appLockState(session.user.appSessionId, session.user.id, readCookie(request, APP_LOCK_COOKIE));
    const keys = await listPasskeys(session.user.id);
    return json({ enabled: state.enabled, locked: state.enabled && !state.unlocked, supported: state.supported, hasPasskeys: keys.length > 0 });
  } catch { return json({ error: "Cannot check app security. Reconnect and try again." }, 503); }
}
export async function postAppLock(request: Request, identify: Identify = auth) {
  if (!sameOrigin(request)) return json({ error: "Invalid origin" }, 403);
  const session = await identify();
  const userId = session?.user?.id, sessionId = session?.user?.appSessionId;
  if (!userId || !sessionId) return json({ error: "Sign out and sign in again to use app lock.", code: "SIGNED_OUT" }, 401);
  try {
    const raw = await request.text();
    if (raw.length > 16000) return json({ error: "Request too large" }, 413);
    const body = JSON.parse(raw);
    const grant = readCookie(request, APP_LOCK_COOKIE);
    if (body.action === "lock") {
      await lockApp(sessionId, userId);
      return setCookie(json({ locked: true }), APP_LOCK_COOKIE, "");
    }
    if (body.action === "heartbeat") {
      if (!grant || !await renewAppUnlock(sessionId, userId, grant)) return json({ error: "Unlock ERP to continue.", code: "APP_LOCKED" }, 423);
      return setCookie(json({ unlocked: true }), APP_LOCK_COOKIE, grant);
    }
    if (!await rateLimit(`app-lock:${sessionId}`, 120, 900)) return json({ error: "Too many attempts. Try again later." }, 429);
    if (body.action === "disable") {
      const state = await appLockState(sessionId, userId, grant);
      if (!state.unlocked) return json({ error: "Unlock ERP before changing app lock." }, 423);
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { password: true } });
      if (!user || typeof body.password !== "string" || body.password.length > 1024 || !await compare(body.password, user.password)) return json({ error: "Current password is incorrect." }, 401);
      if (!await disableAppLock(sessionId, userId, grant)) return json({ error: "App lock changed. Unlock and try again." }, 409);
      await securityEvent(userId, "APP_LOCK_DISABLED", request);
      return setCookie(json({ enabled: false }), APP_LOCK_COOKIE, "");
    }
    const { rpID, origin } = configuration(request);
    if (body.action === "options") {
      const enable = body.enable === true;
      const state = await prepareAppLock(sessionId, userId);
      if (!state.enabled && !enable) return json({ error: "App lock is not enabled." }, 400);
      const keys = await listPasskeys(userId);
      if (!keys.length) return json({ error: "Set up this device for app unlock in Security Settings first, or sign out and sign in normally." }, 400);
      const selected = typeof body.credentialId === "string" ? keys.find(key => key.id === body.credentialId) : undefined;
      if (body.credentialId && !selected) return json({ error: "This device setup is no longer registered. Set up this device again in Security Settings." }, 400);
      const options = await generateAuthenticationOptions({ rpID, userVerification: "required", allowCredentials: selected ? [{ id: selected.id, transports: ["internal"] }] : keys.map(key => ({ id: key.id })) });
      options.hints = ["client-device"];
      const token = await issuePasskeyToken(userId, "app-unlock", JSON.stringify({ challenge: options.challenge, sessionId, version: state.version, enable, navigate: body.navigate === true, credentialId: selected?.id }));
      return setCookie(json(options), APP_LOCK_CHALLENGE_COOKIE, token);
    }
    if (body.action !== "verify") return json({ error: "Invalid action" }, 400);
    const pending = await readPasskeyToken(readCookie(request, APP_LOCK_CHALLENGE_COOKIE), "app-unlock", true);
    if (!pending || pending.userId !== userId) return json({ error: "Unlock request expired. Try again." }, 400);
    const challenge = JSON.parse(pending.value);
    if (challenge.sessionId !== sessionId) return json({ error: "Unlock request belongs to another session." }, 403);
    const key = (await listPasskeys(userId)).find(key => key.id === body.response?.id);
    if (!key) return json({ error: "Use a device registered for app unlock on this ERP account." }, 401);
    if (challenge.credentialId && challenge.credentialId !== key.id) return json({ error: "Verify using the device selected for this unlock." }, 401);
    const verification = await verifyAuthenticationResponse({ response: body.response, expectedChallenge: challenge.challenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true, credential: { id: key.id, publicKey: new Uint8Array(Buffer.from(key.publicKey, "base64url")), counter: key.counter } });
    if (!verification.verified) return json({ error: "Device verification failed." }, 401);
    const changed = await prisma.$executeRaw`UPDATE SecurityPasskey SET counter = ${verification.authenticationInfo.newCounter},lastUsedAt = ${new Date().toISOString()} WHERE id = ${key.id} AND userId = ${userId} AND counter = ${key.counter}`;
    if (changed !== 1) return json({ error: "Passkey changed. Try again." }, 409);
    const token = await grantAppUnlock(sessionId, userId, challenge.version, key.id, challenge.enable === true, challenge.navigate === true);
    if (!token) return json({ error: "App locked while verification was open. Try again." }, 409);
    await securityEvent(userId, challenge.enable ? "APP_LOCK_ENABLED" : "APP_UNLOCKED", request);
    return setCookie(setCookie(json({ unlocked: true, enabled: true }), APP_LOCK_COOKIE, token), APP_LOCK_CHALLENGE_COOKIE, "");
  } catch { return json({ error: "Could not unlock ERP. Try again or sign out and sign in normally." }, 400); }
}
