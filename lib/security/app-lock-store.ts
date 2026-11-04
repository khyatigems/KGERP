import { randomBytes, randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { digest } from "./core";
import { ensurePasskeySchema } from "./passkey-store";

export const APP_LOCK_COOKIE = "erp-app-unlock";
export const APP_LOCK_CHALLENGE_COOKIE = "erp-app-unlock-challenge";
export const APP_LOCK_LEASE_MS = 60000;
type Row = { sessionId: string; userId: string; enabled: number; version: string; grantHash: string; expiresAt: number; credentialId: string; entryAllowed: number; hasCredential: number };
let ready: Promise<void> | undefined;
export function ensureAppLockSchema() {
  return ready ||= (async () => {
    await ensurePasskeySchema();
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS SecurityAppLock (
      sessionId TEXT PRIMARY KEY,userId TEXT NOT NULL,enabled INTEGER NOT NULL DEFAULT 0,
      version TEXT NOT NULL,grantHash TEXT NOT NULL DEFAULT '',expiresAt REAL NOT NULL DEFAULT 0,
      credentialId TEXT NOT NULL DEFAULT '',entryAllowed INTEGER NOT NULL DEFAULT 0,updatedAt REAL NOT NULL)`);
  })().catch(error => { ready = undefined; throw error; });
}
export async function appLockState(sessionId: string | undefined, userId: string, grant = "") {
  if (!sessionId) return { enabled: false, unlocked: false, version: "", entryAllowed: false, supported: false };
  await ensureAppLockSchema();
  const row = (await prisma.$queryRaw<Row[]>`SELECT *,EXISTS(SELECT 1 FROM SecurityPasskey p WHERE p.id = SecurityAppLock.credentialId AND p.userId = SecurityAppLock.userId) AS hasCredential
    FROM SecurityAppLock WHERE sessionId = ${sessionId} AND userId = ${userId}`)[0];
  return { enabled: Boolean(row?.enabled), unlocked: Boolean(row?.enabled && row.hasCredential && row.expiresAt > Date.now() && grant && row.grantHash === digest(grant)), version: row?.version || "", entryAllowed: Boolean(row?.entryAllowed), supported: true };
}
export async function prepareAppLock(sessionId: string, userId: string) {
  await ensureAppLockSchema();
  await prisma.$executeRaw`INSERT INTO SecurityAppLock (sessionId,userId,version,updatedAt) VALUES (${sessionId},${userId},${randomUUID()},${Date.now()}) ON CONFLICT(sessionId) DO NOTHING`;
  return appLockState(sessionId, userId);
}
export async function lockApp(sessionId: string, userId: string) {
  await ensureAppLockSchema();
  await prisma.$executeRaw`UPDATE SecurityAppLock SET grantHash = '',expiresAt = 0,entryAllowed = 0,version = ${randomUUID()},updatedAt = ${Date.now()} WHERE sessionId = ${sessionId} AND userId = ${userId}`;
}
export async function grantAppUnlock(sessionId: string, userId: string, version: string, credentialId: string, enable: boolean, navigate = false) {
  await ensureAppLockSchema();
  const token = randomBytes(32).toString("hex");
  const changed = await prisma.$executeRaw`UPDATE SecurityAppLock SET enabled = 1,grantHash = ${digest(token)},expiresAt = ${Date.now() + APP_LOCK_LEASE_MS},credentialId = ${credentialId},entryAllowed = ${navigate ? 1 : 0},version = ${randomUUID()},updatedAt = ${Date.now()}
    WHERE sessionId = ${sessionId} AND userId = ${userId} AND version = ${version} AND (enabled = 1 OR ${enable ? 1 : 0} = 1)
    AND EXISTS(SELECT 1 FROM SecurityPasskey WHERE id = ${credentialId} AND userId = ${userId})`;
  return changed === 1 ? token : null;
}
export async function renewAppUnlock(sessionId: string, userId: string, token: string) {
  await ensureAppLockSchema();
  const changed = await prisma.$executeRaw`UPDATE SecurityAppLock SET expiresAt = ${Date.now() + APP_LOCK_LEASE_MS},updatedAt = ${Date.now()}
    WHERE sessionId = ${sessionId} AND userId = ${userId} AND enabled = 1 AND grantHash = ${digest(token)} AND expiresAt > ${Date.now()}
    AND EXISTS(SELECT 1 FROM SecurityPasskey WHERE id = SecurityAppLock.credentialId AND userId = ${userId})`;
  return changed === 1;
}
export async function consumeAppEntry(sessionId: string, userId: string, token: string) {
  await ensureAppLockSchema();
  return await prisma.$executeRaw`UPDATE SecurityAppLock SET entryAllowed = 0 WHERE sessionId = ${sessionId} AND userId = ${userId}
    AND enabled = 1 AND entryAllowed = 1 AND grantHash = ${digest(token)} AND expiresAt > ${Date.now()}` === 1;
}
export async function disableAppLock(sessionId: string, userId: string, token: string) {
  await ensureAppLockSchema();
  return await prisma.$executeRaw`UPDATE SecurityAppLock SET enabled = 0,grantHash = '',expiresAt = 0,entryAllowed = 0,version = ${randomUUID()},updatedAt = ${Date.now()}
    WHERE sessionId = ${sessionId} AND userId = ${userId} AND enabled = 1 AND grantHash = ${digest(token)} AND expiresAt > ${Date.now()}` === 1;
}
