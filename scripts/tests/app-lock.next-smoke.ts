// Compile and exercise the real Next.js middleware/routes against a disposable
// database. No build/migration/deployment script or production database is used.
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, mkdirSync, appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { createServer } from "node:net";

async function main() {
  const originalTsconfig = readFileSync("tsconfig.json", "utf8");
  const originalIncludes: string[] = JSON.parse(originalTsconfig).include || [];
  const directory = mkdtempSync(path.join(tmpdir(), "kg-app-lock-next-"));
  process.env.DATABASE_URL = `file:${path.join(directory, "test.db").replaceAll("\\", "/")}`;
  process.env.TURSO_DATABASE_URL = ""; process.env.TURSO_URL = "";
  process.env.AUTH_SECRET = "isolated-app-lock-next-smoke-secret";
  const { prisma } = await import("@/lib/prisma");
  const store = await import("@/lib/security/app-lock-store");
  const { listPasskeys } = await import("@/lib/security/passkey-store");
  const { encode } = await import("next-auth/jwt");
  let child: ReturnType<typeof spawn> | undefined;
  try {
    const sql = execFileSync(process.execPath, [path.resolve("node_modules/prisma/build/index.js"), "migrate", "diff", "--from-empty", "--to-schema-datamodel", "prisma/schema.prisma", "--script"], { encoding: "utf8" });
    for (const statement of sql.split(";").map(x => x.replace(/--[^\n]*/g, "").trim()).filter(Boolean)) await prisma.$executeRawUnsafe(statement);
    const user = await prisma.user.create({ data: { name: "App lock smoke fixture", email: "lock-smoke@example.test", password: "fixture-not-for-password-login", role: "USER" } });
    const sid = "isolated-next-smoke-session";
    await listPasskeys(user.id);
    await prisma.$executeRaw`INSERT INTO SecurityPasskey (id,userId,publicKey,counter,name,createdAt) VALUES ('smoke-key',${user.id},'unused-by-this-middleware-test',0,'Fixture',${new Date().toISOString()})`;
    await store.prepareAppLock(sid, user.id);
    let state = await store.appLockState(sid, user.id);
    await store.grantAppUnlock(sid, user.id, state.version, "smoke-key", true);
    await store.lockApp(sid, user.id);
    const reserve = createServer();
    await new Promise<void>(resolve => reserve.listen(0, "127.0.0.1", resolve));
    const port = (reserve.address() as { port: number }).port;
    await new Promise<void>(resolve => reserve.close(() => resolve()));
    const origin = `http://localhost:${port}`;
    mkdirSync("tmp/app-lock-next-smoke", { recursive: true });
    const log = path.resolve("tmp/app-lock-next-smoke/server.log");
    let output = "";
    child = spawn(process.execPath, [path.resolve("node_modules/next/dist/bin/next"), "dev", "--webpack", "--hostname", "localhost", "--port", String(port)], {
      windowsHide: true,
      env: { ...process.env, NODE_ENV: "development", AUTH_URL: origin, NEXTAUTH_URL: origin, PASSKEY_ORIGIN: origin, ERP_REVIEW_DIST_DIR: "tmp/app-lock-next-smoke/build", NEXT_TELEMETRY_DISABLED: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    for (const stream of [child.stdout, child.stderr]) stream!.on("data", chunk => { const text = chunk.toString(); output += text; appendFileSync(log, text); });
    const deadline = Date.now() + 90000;
    while (!output.includes("Ready") && Date.now() < deadline) {
      if (child.exitCode !== null) throw new Error(`Isolated Next server exited; see ${log}`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    assert.ok(output.includes("Ready"), "isolated Next server starts");
    const token = await encode({ secret: process.env.AUTH_SECRET!, salt: "next-auth.session-token", token: { sub: user.id, role: "USER", appSessionId: sid, name: user.name, email: user.email, lastLogin: new Date().toISOString() } });
    const sessionCookie = `next-auth.session-token=${token}`;
    const get = (pathname: string, cookie = sessionCookie, headers: Record<string, string> = {}) => fetch(origin + pathname, { headers: { cookie, ...headers }, redirect: "manual", signal: AbortSignal.timeout(90000) });
    assert.equal((await get("/manifest.webmanifest", "")).status, 200);
    const loginPage = await get("/login", "");
    assert.equal(loginPage.status, 200, "real login presentation compiles against isolated fixture storage");
    const loginHtml = await loginPage.text();
    assert.match(loginHtml, /Inventory, channels/);
    assert.match(loginHtml, /id="password"/);
    assert.doesNotMatch(loginHtml, /Sign in with passkey/);
    assert.equal((await get("/api/auth/refresh")).status, 423, "real middleware rejects an authenticated protected API while locked");
    assert.equal((await get("/api/fixture/export.csv")).status, 423, "API file extensions cannot bypass matcher");
    const screen = await get("/settings/security", sessionCookie, { "sec-fetch-dest": "document", accept: "text/html" });
    assert.equal(screen.status, 307); assert.match(screen.headers.get("location") || "", /\/unlock/);
    const status = await get("/api/auth/app-lock");
    assert.equal(status.status, 200); assert.equal((await status.json()).locked, true);
    const lockPage = await get("/unlock");
    assert.equal(lockPage.status, 200, "real root providers and lock screen compile");
    assert.match(await lockPage.text(), /Checking app security/);
    state = await store.appLockState(sid, user.id);
    const grant = await store.grantAppUnlock(sid, user.id, state.version, "smoke-key", false);
    assert.ok(grant);
    let unlockedCookie = `${sessionCookie}; ${store.APP_LOCK_COOKIE}=${grant}`;
    assert.equal((await get("/api/auth/refresh", unlockedCookie)).status, 200, "real route auth accepts the still-signed-in unlocked session");
    assert.equal((await get("/api/auth/refresh?filter=active", unlockedCookie, { "sec-fetch-dest": "document", accept: "text/html" })).status, 200, "document/filter navigation preserves a valid unlock grant");
    assert.equal((await get("/unlock", unlockedCookie)).status, 200);
    assert.equal((await get("/api/auth/refresh", unlockedCookie)).status, 423, "opening lock screen directly also revokes the previous grant");
    state = await store.appLockState(sid, user.id);
    const renewed = await store.grantAppUnlock(sid, user.id, state.version, "smoke-key", false);
    assert.ok(renewed);
    unlockedCookie = `${sessionCookie}; ${store.APP_LOCK_COOKIE}=${renewed}`;
    const lock = await fetch(origin + "/api/auth/app-lock", { method: "POST", headers: { cookie: unlockedCookie, origin, "Content-Type": "application/json" }, body: JSON.stringify({ action: "lock" }) });
    assert.equal(lock.status, 200);
    assert.equal((await get("/api/auth/refresh", unlockedCookie)).status, 423, "server revocation rejects old cookie immediately");
    console.log("Real Next.js smoke passed: Node middleware compilation, API/file-extension gate, document redirect, status, authenticated unlock lease and immediate revocation.");
  } finally {
    if (child?.pid && child.exitCode === null) {
      if (process.platform === "win32") { try { execFileSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true }); } catch { /* Already exited. */ } }
      else child.kill("SIGTERM");
    }
    await prisma.$disconnect();
    // Next dev adds the review dist's generated types to tsconfig. Remove only
    // this test's additions, retaining any unrelated concurrent config changes.
    const currentTsconfig = JSON.parse(readFileSync("tsconfig.json", "utf8"));
    const testIncludes = ["tmp/app-lock-next-smoke/build/types/**/*.ts", "tmp/app-lock-next-smoke/build/dev/types/**/*.ts"].filter(value => !originalIncludes.includes(value));
    const filtered = (currentTsconfig.include || []).filter((value: string) => !testIncludes.includes(value));
    if (filtered.length !== currentTsconfig.include?.length) {
      currentTsconfig.include = filtered;
      writeFileSync("tsconfig.json", JSON.stringify(currentTsconfig) === JSON.stringify(JSON.parse(originalTsconfig)) ? originalTsconfig : JSON.stringify(currentTsconfig, null, 2) + "\n");
    }
    assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir()) + path.sep));
    rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
