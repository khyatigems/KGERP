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
    let age = 0;
    const identify = (async () => ({ user: { id: sessionUser, lastLogin: new Date(Date.now() - age) } })) as unknown as typeof import("@/lib/auth").auth;
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
    assert.equal((await post({ action: "preference", preference: "never" })).status, 200);
    assert.equal((await (await getPasskeys(new Request(`${origin}/api/auth/passkeys`), identify)).json()).promptAfter, "never");
    async function assertion() {
      const options = await (await post({ action: "login-options" })).json();
      return page.evaluate(async optionsJSON => (window as any).authenticate({ optionsJSON }), options);
    }
    let response = await assertion();
    const wrong = structuredClone(response); wrong.response.signature = "AAAA";
    assert.equal((await post({ action: "login-verify", response: wrong })).status, 401, "invalid signature rejected");
    assert.equal((await post({ action: "login-verify", response })).status, 400, "failed attempt consumes challenge");
    response = await assertion();
    assert.equal((await post({ action: "login-verify", response })).status, 200);
    assert.equal((await store.passkeyProof(new Request(origin, { headers: { cookie: cookies } })))?.id, user.id);
    const csrf = await handlers.GET(new NextRequest(`${origin}/api/auth/csrf`));
    const csrfToken = (await csrf.json()).csrfToken;
    const csrfCookie = csrf.headers.getSetCookie().map(v => v.split(";")[0]).join("; ");
    async function login(email = user.email, tokenCookies = cookies, extra: Record<string, string> = {}) {
      return handlers.POST(new NextRequest(`${origin}/api/auth/callback/credentials`, { method: "POST", headers: { origin, cookie: `${csrfCookie}; ${tokenCookies}`, "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ csrfToken, email, passkey: "true", ...extra }) }));
    }
    const hasSession = (res: Response) => res.headers.getSetCookie().some(cookie => /(?:__Secure-)?next-auth\.session-token=[^;]/.test(cookie));
    assert.equal(hasSession(await login(other.email)), false, "proof cannot sign into another account");
    assert.equal(hasSession(await login()), true, "verified passkey issues a real Auth.js session");
    assert.equal(hasSession(await login()), false, "proof replay rejected");
    response = await assertion(); await post({ action: "login-verify", response });
    await prisma.user.update({ where: { id: user.id }, data: { password: await hash("ChangedPassword!42", 10) } });
    assert.equal(await store.passkeyProof(new Request(origin, { headers: { cookie: cookies } })), null, "password changes invalidate pending proofs");
    await prisma.user.update({ where: { id: user.id }, data: { password: user.password } });
    const recoveries = await saveSecurityPolicy({ enabled: true, email: "security@example.test", alerts: false, version: "passkey-mfa" }, user.id, "disabled");
    assert.equal(hasSession(await login()), false, "passkey cannot bypass company MFA");
    assert.equal(hasSession(await login(user.email, cookies, { recoveryCode: recoveries[0] })), true, "passkey plus existing recovery can sign in");
    assert.match(messages.at(-1) || "", /Passkey \+ single-use recovery code/, "security notice identifies the actual primary credential");
    response = await assertion(); await post({ action: "login-verify", response });
    const missingProof = await otp(new Request(`${origin}/api/auth/otp`, { method: "POST", headers: { origin }, body: JSON.stringify({ email: user.email, passkey: true }) }));
    assert.equal(missingProof.status, 401, "OTP endpoint rejects invented passkey claims");
    sessionUser = other.id;
    await post({ action: "remove", id: keys[0].id, password });
    assert.equal((await store.listPasskeys(user.id)).length, 1, "another account cannot remove credential");
    sessionUser = user.id;
    await post({ action: "remove", id: keys[0].id, password });
    assert.equal(await store.passkeyProof(new Request(origin, { headers: { cookie: cookies } })), null, "removal invalidates pending proofs");
    assert.equal(hasSession(await login()), false);
    const expired = await store.issuePasskeyToken(user.id, "login", "challenge");
    await prisma.$executeRaw`UPDATE SecurityPasskeyChallenge SET expiresAt = 1`;
    assert.equal(await store.readPasskeyToken(expired, "login", true), null);
    const once = await store.issuePasskeyToken(user.id, "register", "value");
    const consumed = await Promise.all([store.readPasskeyToken(once, "register", true), store.readPasskeyToken(once, "register", true)]);
    assert.equal(consumed.filter(Boolean).length, 1, "parallel challenge consumption is atomic");
    console.log("Passkey integration passed: real virtual-authenticator registration/signatures, replay, expiry, account isolation, recent-login/password enrollment, revocation, MFA enforcement and real Auth.js session issuance.");
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
