import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { digest, readCookie } from "./core";

export const PASSKEY_COOKIE = "erp-passkey-proof";
export const CHALLENGE_COOKIE = "erp-passkey-challenge";
let ready: Promise<void> | undefined;
export function ensurePasskeySchema() {
  return ready ||= (async () => {
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS SecurityPasskey (id TEXT PRIMARY KEY,userId TEXT NOT NULL,publicKey TEXT NOT NULL,counter INTEGER NOT NULL DEFAULT 0,name TEXT NOT NULL,createdAt TEXT NOT NULL,lastUsedAt TEXT)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS SecurityPasskey_user ON SecurityPasskey(userId)`);
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS SecurityPasskeyChallenge (id TEXT PRIMARY KEY,userId TEXT NOT NULL,kind TEXT NOT NULL,value TEXT NOT NULL,expiresAt REAL NOT NULL)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS SecurityPasskeyChallenge_expiry ON SecurityPasskeyChallenge(expiresAt)`);
  })().catch(error => { ready = undefined; throw error; });
}
export type PasskeyRow = { id: string; userId: string; publicKey: string; counter: number; name: string; createdAt: string; lastUsedAt: string | null };
export async function listPasskeys(userId: string) {
  await ensurePasskeySchema();
  return prisma.$queryRaw<PasskeyRow[]>`SELECT * FROM SecurityPasskey WHERE userId = ${userId} ORDER BY createdAt DESC`;
}
export async function issuePasskeyToken(userId: string, kind: string, value: string) {
  await ensurePasskeySchema();
  const token = randomBytes(32).toString("hex");
  await prisma.$executeRaw`DELETE FROM SecurityPasskeyChallenge WHERE expiresAt < ${Date.now()}`;
  await prisma.$executeRaw`INSERT INTO SecurityPasskeyChallenge (id,userId,kind,value,expiresAt) VALUES (${digest(token)},${userId},${kind},${value},${Date.now() + 300000})`;
  return token;
}
export async function readPasskeyToken(token: string, kind: string, consume = false) {
  await ensurePasskeySchema();
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const row = (await prisma.$queryRaw<Array<{ userId: string; value: string }>>`SELECT userId,value FROM SecurityPasskeyChallenge WHERE id = ${digest(token)} AND kind = ${kind} AND expiresAt > ${Date.now()}`)[0];
  if (!row) return null;
  if (consume && await prisma.$executeRaw`DELETE FROM SecurityPasskeyChallenge WHERE id = ${digest(token)} AND kind = ${kind} AND expiresAt > ${Date.now()}` !== 1) return null;
  return row;
}
// A proof is short lived, browser-bound by an HttpOnly cookie, and invalidated by
// password changes or removal of the exact credential used to authenticate.
export async function passkeyProof(request: Request, consume = false) {
  const row = await readPasskeyToken(readCookie(request, PASSKEY_COOKIE), "proof", consume);
  if (!row) return null;
  const { credentialId, passwordHash } = JSON.parse(row.value);
  const user = await prisma.user.findUnique({ where: { id: row.userId }, select: { id: true, email: true, password: true } });
  const keys = await listPasskeys(row.userId);
  return user && digest(user.password) === passwordHash && keys.some(key => key.id === credentialId) ? user : null;
}
