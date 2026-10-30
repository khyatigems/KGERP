import { randomBytes, randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { codeHash } from "./core";
import { decryptSecret, encryptSecret } from "./secret-store";
import { matchingTotpStep, newAuthenticatorSecret } from "./totp";
import { authenticatorUri } from "./authenticator-provisioning";

type AuthenticatorRow = { userId: string; secret: string; enabled: number; version: string; sessionVersion: string; expiresAt: number | bigint; lastStep: number | bigint };
let ready: Promise<void> | undefined;
export function ensureAuthenticatorSchema() {
  return ready ||= (async () => {
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "SecurityAuthenticator" (
      userId TEXT PRIMARY KEY, secret TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 0,
      version TEXT NOT NULL, sessionVersion TEXT NOT NULL DEFAULT '', expiresAt BIGINT NOT NULL, lastStep BIGINT NOT NULL DEFAULT -1)`);
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "SecurityAuthenticatorRecovery" (
      hash TEXT PRIMARY KEY, userId TEXT NOT NULL, version TEXT NOT NULL)`);
  })().catch(error => { ready = undefined; throw error; });
}
async function getRow(userId: string) {
  await ensureAuthenticatorSchema();
  return (await prisma.$queryRaw<AuthenticatorRow[]>`SELECT * FROM "SecurityAuthenticator" WHERE userId = ${userId}`)[0];
}
function readSecret(row: AuthenticatorRow) {
  const value = decryptSecret(row.secret);
  if (!value) throw new Error("Authenticator secret could not be decrypted");
  const decoded = JSON.parse(value);
  if (decoded.userId !== row.userId || typeof decoded.secret !== "string") throw new Error("Authenticator account mismatch");
  return decoded.secret as string;
}
export async function getAuthenticatorState(userId: string, includeRecovery = false) {
  await ensureAuthenticatorSchema();
  const row = (await prisma.$queryRaw<Array<Pick<AuthenticatorRow, "enabled" | "version" | "sessionVersion">>>`SELECT enabled,version,sessionVersion FROM "SecurityAuthenticator" WHERE userId = ${userId}`)[0];
  const counts = includeRecovery && row?.enabled ? await prisma.$queryRaw<Array<{ count: number }>>`SELECT COUNT(*) AS count FROM "SecurityAuthenticatorRecovery" WHERE userId = ${userId} AND version = ${row.version}` : [];
  return { enabled: Boolean(row?.enabled), version: row?.sessionVersion || undefined, recoveryRemaining: Number(counts[0]?.count || 0) };
}
export async function beginAuthenticator(userId: string, email: string) {
  await ensureAuthenticatorSchema();
  const secret = newAuthenticatorSecret(), version = randomUUID();
  const encrypted = encryptSecret(JSON.stringify({ userId, secret }));
  const changed = await prisma.$executeRaw`INSERT INTO "SecurityAuthenticator" (userId,secret,enabled,version,expiresAt,lastStep)
    VALUES (${userId},${encrypted},0,${version},${Date.now() + 600_000},-1)
    ON CONFLICT(userId) DO UPDATE SET secret = excluded.secret,version = excluded.version,expiresAt = excluded.expiresAt,lastStep = -1
    WHERE "SecurityAuthenticator".enabled = 0`;
  if (changed !== 1) throw new Error("Remove your existing authenticator before setting up a new one.");
  const uri = authenticatorUri(email, secret);
  return { secret, uri, version };
}
export async function activateAuthenticator(userId: string, version: string, code: string) {
  const row = await getRow(userId);
  if (!row || row.enabled || row.version !== version || Number(row.expiresAt) <= Date.now()) return null;
  const step = matchingTotpStep(readSecret(row), code);
  if (step === null) return null;
  const codes = Array.from({ length: 8 }, () => randomBytes(12).toString("hex"));
  return prisma.$transaction(async tx => {
    const changed = await tx.$executeRaw`UPDATE "SecurityAuthenticator" SET enabled = 1,sessionVersion = ${version},expiresAt = 0,lastStep = ${step}
      WHERE userId = ${userId} AND version = ${version} AND enabled = 0 AND expiresAt > ${Date.now()}`;
    if (changed !== 1) return null;
    await tx.$executeRaw`DELETE FROM "SecurityAuthenticatorRecovery" WHERE userId = ${userId}`;
    for (const code of codes) await tx.$executeRaw`INSERT INTO "SecurityAuthenticatorRecovery" (hash,userId,version) VALUES (${codeHash("authenticator-recovery", code)},${userId},${version})`;
    return codes;
  });
}
export async function checkPendingAuthenticator(userId: string, version: string, code: string) {
  const row = await getRow(userId);
  return Boolean(row && !row.enabled && row.version === version && Number(row.expiresAt) > Date.now() && matchingTotpStep(readSecret(row), code) !== null);
}
export async function consumeAuthenticator(userId: string, code: string, version: string) {
  if (!/^\d{6}$/.test(code)) return false;
  const row = await getRow(userId);
  if (!row?.enabled || row.version !== version) return false;
  const step = matchingTotpStep(readSecret(row), code);
  if (step === null || step <= Number(row.lastStep)) return false;
  return (await prisma.$executeRaw`UPDATE "SecurityAuthenticator" SET lastStep = ${step}
    WHERE userId = ${userId} AND enabled = 1 AND version = ${version} AND lastStep < ${step}`) === 1;
}
export async function consumeAuthenticatorRecovery(userId: string, code: string, version: string) {
  await ensureAuthenticatorSchema();
  if (!/^[a-f0-9]{24}$/i.test(code)) return false;
  return (await prisma.$executeRaw`DELETE FROM "SecurityAuthenticatorRecovery" WHERE userId = ${userId} AND version = ${version}
    AND hash = ${codeHash("authenticator-recovery", code.toLowerCase())}
    AND EXISTS (SELECT 1 FROM "SecurityAuthenticator" WHERE userId = ${userId} AND version = ${version} AND enabled = 1)`) === 1;
}
export async function removeAuthenticator(userId: string, version: string) {
  await prisma.$transaction(async tx => {
    const changed = await tx.$executeRaw`UPDATE "SecurityAuthenticator" SET enabled = 0,secret = '',sessionVersion = ${randomUUID()},expiresAt = 0 WHERE userId = ${userId} AND version = ${version} AND enabled = 1`;
    if (changed !== 1) throw new Error("Authenticator settings changed. Reload and try again.");
    await tx.$executeRaw`DELETE FROM "SecurityAuthenticatorRecovery" WHERE userId = ${userId}`;
  });
}
