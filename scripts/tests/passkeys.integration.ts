import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { hash } from "bcryptjs";
import { NextRequest } from "next/server";
import { build } from "esbuild";
import puppeteer from "puppeteer";

async function main(directory: string) {
  process.env.DATABASE_URL = `file:${path.join(directory, "test.db").replaceAll("\\", "/")}`;
  process.env.TURSO_DATABASE_URL = ""; process.env.TURSO_URL = "";
  process.env.AUTH_SECRET = "isolated-passkey-test-secret";
  let adapterClient: { close(): void } | undefined;
  if (process.argv.includes("--libsql")) {
    const { createClient } = await import("@libsql/client");
    const { PrismaLibSQL } = await import("@prisma/adapter-libsql");
    const { PrismaClient } = await import("@prisma/client");
    const database = createClient({ url: process.env.DATABASE_URL });
    adapterClient = database;
    const holder = globalThis as typeof globalThis & { prisma?: InstanceType<typeof PrismaClient>; workTrackerContextVersion?: number };
    holder.prisma = new PrismaClient({ adapter: new PrismaLibSQL(database) });
    holder.workTrackerContextVersion = 3;
  }
  const { prisma } = await import("@/lib/prisma");
  const { ZohoMailConnector } = await import("@/lib/email/connectors/zoho");
  const originalSend = ZohoMailConnector.prototype.send;
  const messages: string[] = [];
  ZohoMailConnector.prototype.send = async function(message) {
    messages.push(message.html || message.text || "");
    return { status: "SENT", providerMessageId: "isolated-passkey-fixture" };
  };
  const { postPasskeys, getPasskeys } = await import("@/lib/security/passkey-http");
  const store = await import("@/lib/security/passkey-store");
  const { postAppLock, getAppLock } = await import("@/lib/security/app-lock-http");
  const { enforceAppLock } = await import("@/lib/security/app-lock-gate");
  const { handlers } = await import("@/lib/auth");
  const { saveSecurityPolicy, ensureSecuritySchema } = await import("@/lib/security/service");
  const { POST: otp } = await import("@/app/api/auth/otp/route");
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
  let server: ReturnType<typeof createServer> | undefined;
  try {
    const sql = execFileSync(process.execPath, [path.resolve("node_modules/prisma/build/index.js"), "migrate", "diff", "--from-empty", "--to-schema-datamodel", "prisma/schema.prisma", "--script"], { encoding: "utf8" });
    for (const statement of sql.split(";").map(x => x.replace(/--[^\n]*/g, "").trim()).filter(Boolean)) await prisma.$executeRawUnsafe(statement);
    await ensureSecuritySchema();
    const password = "IsolatedPasskeyPassword!42";
    const user = await prisma.user.create({ data: { name: "Passkey fixture", email: "passkey@example.test", password: await hash(password, 10), role: "SUPER_ADMIN" } });
    const other = await prisma.user.create({ data: { name: "Other fixture", email: "other@example.test", password: await hash(password, 10), role: "USER" } });
    let sessionUser = user.id;
    let appSessionId = "fixture-app-session";
    let age = 0;
    const identify = (async () => ({ user: { id: sessionUser, appSessionId, lastLogin: new Date(Date.now() - age) } })) as unknown as typeof import("@/lib/auth").auth;
    const bundle = await build({ stdin: { contents: `import {startRegistration,startAuthentication} from 'erp-webauthn-browser';window.register=startRegistration;window.authenticate=startAuthentication;`, resolveDir: process.cwd() }, bundle: true, write: false, format: "iife", platform: "browser" });
    server = createServer(async (req, res) => {
      if (req.url === "/bundle.js") { res.setHeader("Content-Type", "text/javascript"); res.end(bundle.outputFiles[0].text); return; }
      res.setHeader("Content-Type", "text/html"); res.end('<!doctype html><script src="/bundle.js"></script>');
    });
    await new Promise<void>(resolve => server!.listen(0, "localhost", resolve));
    const origin = `http://localhost:${(server.address() as { port: number }).port}`;
    process.env.PASSKEY_ORIGIN = origin; process.env.AUTH_URL = origin;
    let cookies = "";
    async function post(body: unknown, customCookies = cookies, customOrigin = origin) {
      const response = await postPasskeys(new Request(`${origin}/api/auth/passkeys`, { method: "POST", headers: { origin: customOrigin, cookie: customCookies }, body: JSON.stringify(body) }), identify);
      for (const value of response.headers.getSetCookie()) {
        const pair = value.split(";")[0]; const name = pair.split("=")[0];
        cookies = cookies.split("; ").filter(value => value && !value.startsWith(`${name}=`)).concat(pair).join("; ");
      }
      return response;
    }
    assert.equal((await post({ action: "register-options", password }, "", "https://evil.example")).status, 403);
    assert.equal((await post({ action: "register-options", password: "wrong" })).status, 401);
    age = 601000;
    assert.equal((await post({ action: "register-options", password })).status, 403);
    age = 0;
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(origin);
    const cdp = await page.createCDPSession();
    await cdp.send("WebAuthn.enable");
    await cdp.send("WebAuthn.addVirtualAuthenticator", { options: { protocol: "ctap2", transport: "internal", hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true } });
    const options = await (await post({ action: "register-options", password, name: "Fixture phone" })).json();
    const registration = await page.evaluate(async optionsJSON => (window as any).register({ optionsJSON }), options);
    assert.equal((await post({ action: "register-verify", response: registration })).status, 200);
    assert.equal((await post({ action: "register-verify", response: registration })).status, 400, "registration replay rejected");
    const keys = await store.listPasskeys(user.id);
    assert.equal(keys.length, 1); assert.equal(keys[0].name, "Fixture phone");
    assert.equal((await store.listPasskeys(other.id)).length, 0);
    async function lockPost(body: unknown, customOrigin = origin) {
      const response = await postAppLock(new Request(`${origin}/api/auth/app-lock`, { method: "POST", headers: { origin: customOrigin, cookie: cookies }, body: JSON.stringify(body) }), identify);
      for (const value of response.headers.getSetCookie()) {
        const pair = value.split(";")[0], name = pair.split("=")[0];
        cookies = cookies.split("; ").filter(value => value && !value.startsWith(`${name}=`)).concat(pair).join("; ");
      }
      return response;
    }
    async function unlockResponse(enable = false, navigate = false) {
      const options = await lockPost({ action: "options", enable, navigate });
      assert.equal(options.status, 200);
      return page.evaluate(async optionsJSON => (window as any).authenticate({ optionsJSON }), await options.json());
    }
    const gate = (path = "/api/inventory", document = false) => enforceAppLock(new Request(origin + path, { headers: { cookie: cookies, ...(document ? { "sec-fetch-dest": "document", accept: "text/html" } : {}) } }), { id: user.id, appSessionId });
    assert.equal((await lockPost({ action: "lock" }, "https://evil.example")).status, 403);
    let unlock = await unlockResponse(true);
    assert.equal((await lockPost({ action: "verify", response: unlock })).status, 200, "enable requires a real signed passkey assertion");
    assert.equal(await gate(), null, "unlocked session can use business APIs");
    assert.equal((await gate("/settings/security", true))?.status, 307, "reopening/reloading requires fresh verification even with an old unlock cookie");
    assert.equal((await gate())?.status, 423, "business APIs are blocked while locked");
    assert.equal((await gate("/api/export/private.csv"))?.status, 423, "download APIs obey lock too");
    assert.equal(await gate("/api/auth/app-lock"), null, "unlock protocol remains reachable");
    assert.equal((await gate("/api/auth/passkeys"))?.status, 423, "passkey management cannot bypass the app lock");
    assert.equal(await gate("/invoice/public-token", true), null, "public customer page remains reachable");
    assert.equal((await enforceAppLock(new Request(`${origin}/login`, { method: "POST", headers: { cookie: cookies, "next-action": "fixture" } }), { id: user.id, appSessionId }))?.status, 423, "server actions posted to public pages still obey lock");
    appSessionId = "separate-device";
    assert.equal(await gate(), null, "other browser sessions are not enrolled automatically");
    appSessionId = "fixture-app-session";
    unlock = await unlockResponse();
    appSessionId = "different-session";
    assert.equal((await lockPost({ action: "verify", response: unlock })).status, 403, "same-user challenge cannot unlock another session");
    appSessionId = "fixture-app-session";
    unlock = await unlockResponse(false, true);
    assert.equal((await lockPost({ action: "verify", response: unlock })).status, 200);
    assert.equal((await lockPost({ action: "verify", response: unlock })).status, 400, "unlock assertion replay rejected");
    assert.equal(await gate("/settings/security", true), null, "verified redirect can enter the workspace once");
    assert.equal((await gate("/settings/security", true))?.status, 307, "second document open relocks");
    unlock = await unlockResponse();
    await lockPost({ action: "lock" });
    assert.equal((await lockPost({ action: "verify", response: unlock })).status, 409, "closing during biometric verification invalidates its pending grant");
    unlock = await unlockResponse();
    assert.equal((await lockPost({ action: "verify", response: unlock })).status, 200);
    assert.equal((await lockPost({ action: "heartbeat" })).status, 200);
    await prisma.$executeRaw`UPDATE SecurityAppLock SET expiresAt = 1 WHERE sessionId = ${appSessionId}`;
    assert.equal((await lockPost({ action: "heartbeat" })).status, 423, "heartbeat cannot revive expired unlock");
    assert.equal((await gate())?.status, 423);
    unlock = await unlockResponse(); await lockPost({ action: "verify", response: unlock });
    assert.equal((await lockPost({ action: "disable", password: "wrong" })).status, 401);
    unlock = await unlockResponse();
    assert.equal((await lockPost({ action: "disable", password })).status, 200);
    assert.equal((await lockPost({ action: "verify", response: unlock })).status, 409, "pending verification cannot re-enable a disabled lock");
    const lockState = await (await getAppLock(new Request(origin, { headers: { cookie: cookies } }), identify)).json();
    assert.equal(lockState.enabled, false);
    assert.equal(await gate(), null);
    console.log("App-lock server integration passed: signed unlock/enable, reopening, API and action enforcement, session binding, single-use entry, lock/verify races, expiry, heartbeat and protected disable.");
    assert.equal((await post({ action: "preference", preference: "never" })).status, 200);
    assert.equal((await (await getPasskeys(new Request(`${origin}/api/auth/passkeys`), identify)).json()).promptAfter, "never");
    // Existing app-unlock assertions cannot be exchanged for a login session.
    assert.equal((await post({ action: "login-options" })).status, 400);
    assert.equal((await post({ action: "login-verify", response: unlock })).status, 400);
    unlock = await unlockResponse(true); await lockPost({ action: "verify", response: unlock });
    await lockPost({ action: "lock" });
    unlock = await unlockResponse();
    const wrong = structuredClone(unlock); wrong.response.signature = "AAAA";
    assert.ok([400, 401].includes((await lockPost({ action: "verify", response: wrong })).status), "invalid signature cannot unlock app");
    assert.equal((await lockPost({ action: "verify", response: unlock })).status, 400, "failed verification consumes challenge");
    assert.equal((await gate())?.status, 423);
    unlock = await unlockResponse(); await lockPost({ action: "verify", response: unlock });
    await lockPost({ action: "disable", password });
    const { digest } = await import("@/lib/security/core");
    const oldProof = await store.issuePasskeyToken(user.id, "proof", JSON.stringify({ credentialId: keys[0].id, passwordHash: digest(user.password) }));
    cookies += `; erp-passkey-proof=${oldProof}`;
    const csrf = await handlers.GET(new NextRequest(`${origin}/api/auth/csrf`));
    const csrfToken = (await csrf.json()).csrfToken;
    const csrfCookie = csrf.headers.getSetCookie().map(v => v.split(";")[0]).join("; ");
    async function login(email = user.email, providedPassword = password, extra: Record<string, string> = {}) {
      return handlers.POST(new NextRequest(`${origin}/api/auth/callback/credentials`, { method: "POST", headers: { origin, cookie: `${csrfCookie}; ${cookies}`, "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ csrfToken, email, password: providedPassword, ...extra }) }));
    }
    const hasSession = (res: Response) => res.headers.getSetCookie().some(cookie => /(?:__Secure-)?next-auth\.session-token=[^;]/.test(cookie));
    assert.equal(hasSession(await login(user.email, "", { passkey: "true" })), false, "even a formerly valid stored passkey proof cannot replace the password");
    assert.equal(hasSession(await login(user.email, "wrong", { passkey: "true" })), false, "legacy passkey flag cannot bypass a wrong password");
    const signedIn = await login();
    assert.equal(hasSession(signedIn), true, "normal password login still issues a real Auth.js session");
    const authCookie = signedIn.headers.getSetCookie().filter(value => /next-auth\.session-token=/.test(value)).map(value => value.split(";")[0]).join("; ");
    const readSession = async () => (await handlers.GET(new NextRequest(`${origin}/api/auth/session`, { headers: { cookie: authCookie } }))).json();
    const firstSession = await readSession(), secondSession = await readSession();
    assert.ok(firstSession.user.appSessionId);
    assert.equal(firstSession.user.appSessionId, secondSession.user.appSessionId, "app session identity survives JWT refresh");
    const recoveries = await saveSecurityPolicy({ enabled: true, email: "security@example.test", alerts: false, version: "passkey-mfa" }, user.id, "disabled");
    assert.equal(hasSession(await login()), false, "password cannot bypass company MFA");
    assert.equal(hasSession(await login(user.email, "", { passkey: "true", recoveryCode: recoveries[0] })), false, "passkey plus recovery cannot replace password login");
    assert.equal(hasSession(await login(user.email, password, { recoveryCode: recoveries[0] })), true, "password plus existing recovery still signs in");
    assert.match(messages.at(-1) || "", /Password \+ single-use recovery code/);
    const missingPassword = await otp(new Request(`${origin}/api/auth/otp`, { method: "POST", headers: { origin, cookie: cookies }, body: JSON.stringify({ email: user.email, passkey: true }) }));
    assert.equal(missingPassword.status, 400, "OTP endpoint requires password even with a formerly valid passkey proof");
    sessionUser = other.id;
    await post({ action: "remove", id: keys[0].id, password });
    assert.equal((await store.listPasskeys(user.id)).length, 1, "another account cannot remove credential");
    sessionUser = user.id;
    unlock = await unlockResponse(true); await lockPost({ action: "verify", response: unlock });
    await post({ action: "remove", id: keys[0].id, password });
    assert.equal((await gate())?.status, 423, "removing unlock credential locks the app");
    const expired = await store.issuePasskeyToken(user.id, "app-unlock", "challenge");
    await prisma.$executeRaw`UPDATE SecurityPasskeyChallenge SET expiresAt = 1`;
    assert.equal(await store.readPasskeyToken(expired, "app-unlock", true), null);
    const once = await store.issuePasskeyToken(user.id, "register", "value");
    const consumed = await Promise.all([store.readPasskeyToken(once, "register", true), store.readPasskeyToken(once, "register", true)]);
    assert.equal(consumed.filter(Boolean).length, 1, "parallel challenge consumption is atomic");
    console.log("App-unlock integration passed: real signatures, replay/expiry, session isolation, enrollment, revocation, password/MFA login and rejection of removed passkey sign-in paths.");
  } finally {
    ZohoMailConnector.prototype.send = originalSend;
    await browser?.close();
    await new Promise<void>(resolve => server ? server.close(() => resolve()) : resolve());
    await prisma.$disconnect();
    adapterClient?.close();

  }
}
if (process.argv.includes("--worker")) {
  main(process.argv[3]).catch(error => { console.error(error); process.exitCode = 1; });
} else {
  const directory = mkdtempSync(path.join(tmpdir(), "kg-passkeys-"));
  try {
    execFileSync(process.execPath, [path.resolve("node_modules/tsx/dist/cli.mjs"), path.resolve("scripts/tests/passkeys.integration.ts"), "--worker", directory, ...(process.argv.includes("--libsql") ? ["--libsql"] : [])], { stdio: "inherit" });
  } finally {
    assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir()) + path.sep));
    rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}
