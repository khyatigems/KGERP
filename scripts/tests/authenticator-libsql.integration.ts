import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

async function worker(databasePath: string) {
  process.env.DATABASE_URL = `file:${databasePath.replaceAll("\\", "/")}`;
  process.env.TURSO_DATABASE_URL = "";
  process.env.TURSO_URL = "";
  process.env.AUTH_SECRET = "isolated-authenticator-libsql-test-secret";
  process.env.ERP_SECRET_ENCRYPTION_KEY = "isolated-authenticator-libsql-encryption-key";
  // Own the adapter client so its native file handle is explicitly closed before
  // the worker exits (Prisma 5's adapter does not close it on $disconnect).
  const { createClient } = await import("@libsql/client");
  const { PrismaLibSQL } = await import("@prisma/adapter-libsql");
  const { PrismaClient } = await import("@prisma/client");
  const database = createClient({ url: process.env.DATABASE_URL });
  const holder = globalThis as typeof globalThis & { prisma?: InstanceType<typeof PrismaClient>; workTrackerContextVersion?: number };
  holder.prisma = new PrismaClient({ adapter: new PrismaLibSQL(database) });
  holder.workTrackerContextVersion = 3;
  const app = await import("@/lib/security/authenticator");
  const { totpCode } = await import("@/lib/security/totp");
  const { prisma } = await import("@/lib/prisma");
  try {
    const setup = await app.beginAuthenticator("fixture-user", "fixture@example.test");
    const code = totpCode(setup.secret, Math.floor(Date.now() / 30000));
    assert.equal(await app.checkPendingAuthenticator("fixture-user", setup.version, code), true);
    const codes = await app.activateAuthenticator("fixture-user", setup.version, code);
    assert.equal(codes?.length, 8);
    assert.equal((await app.getAuthenticatorState("fixture-user", true)).enabled, true);
    assert.equal((await app.getAuthenticatorState("fixture-user", true)).recoveryRemaining, 8);
    assert.equal(await app.consumeAuthenticator("fixture-user", code, setup.version), false, "enrollment code cannot be reused");
    const nextCode = totpCode(setup.secret, Math.floor(Date.now() / 30000) + 1);
    assert.equal(await app.consumeAuthenticator("fixture-user", nextCode, setup.version), true);
    assert.equal(await app.consumeAuthenticator("fixture-user", nextCode, setup.version), false);
    assert.equal(await app.consumeAuthenticatorRecovery("fixture-user", codes![0], setup.version), true);
    await app.removeAuthenticator("fixture-user", setup.version);
    assert.equal((await app.getAuthenticatorState("fixture-user")).enabled, false);
    const expired = await app.beginAuthenticator("expired-user", "expired@example.test");
    await prisma.$executeRaw`UPDATE "SecurityAuthenticator" SET expiresAt = 1 WHERE userId = 'expired-user'`;
    assert.equal(await app.checkPendingAuthenticator("expired-user", expired.version, totpCode(expired.secret, Math.floor(Date.now() / 30000))), false);
    console.log("libSQL authenticator integration passed: timestamp reads, activation, app login/replay, expiry, recovery and removal.");
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally { await prisma.$disconnect(); database.close(); }
}

if (process.argv[2] === "--worker") {
  worker(process.argv[3]).catch(error => { console.error(error); process.exitCode = 1; });
} else {
  const directory = mkdtempSync(path.join(tmpdir(), "kg-authenticator-libsql-"));
  try {
    execFileSync(process.execPath, [path.resolve("node_modules/tsx/dist/cli.mjs"), path.resolve("scripts/tests/authenticator-libsql.integration.ts"), "--worker", path.join(directory, "fixture.db")], { stdio: "inherit" });
  } finally {
    assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir()) + path.sep));
    rmSync(directory, { recursive: true, force: true });
  }
}
