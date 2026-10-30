import { randomBytes, randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { ZohoMailConnector } from "@/lib/email/connectors/zoho";
import { codeHash, contextText, DEFAULT_POLICY, digest, equalHash, MAX_ATTEMPTS, newCode, OTP_SECONDS, requestContext, type SecurityPolicy } from "./core";
import { renderOtpEmail } from "./otp-email";

export const POLICY_KEY = "security_2fa_v1";
let ready: Promise<void> | undefined;
export function ensureSecuritySchema() {
  return ready ||= (async () => {
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "SecurityChallenge" (
      id TEXT PRIMARY KEY, userId TEXT NOT NULL, purpose TEXT NOT NULL, binding TEXT NOT NULL,
      codeHash TEXT NOT NULL, secondaryHash TEXT NOT NULL, context TEXT NOT NULL,
      expiresAt BIGINT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
      consumed INTEGER NOT NULL DEFAULT 0, ready INTEGER NOT NULL DEFAULT 0)`);
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "SecurityRate" (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expiresAt BIGINT NOT NULL)`);
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "SecurityRecovery" (hash TEXT PRIMARY KEY, userId TEXT NOT NULL, version TEXT NOT NULL)`);
  })().catch(error => { ready = undefined; throw error; });
}
export async function getSecurityPolicy(): Promise<SecurityPolicy> {
  const row = await prisma.setting.findUnique({ where: { key: POLICY_KEY } });
  if (!row) return { ...DEFAULT_POLICY };
  // Corrupt security configuration must never silently disable verification.
  const value = JSON.parse(row.value);
  if (typeof value.enabled !== "boolean" || typeof value.email !== "string" || typeof value.alerts !== "boolean" || typeof value.version !== "string" || (value.enabled && !value.email)) throw new Error("Invalid security configuration");
  return value;
}
export async function rateLimit(key: string, maximum: number, seconds: number) {
  await ensureSecuritySchema();
  const now = Date.now();
  const hashed = digest(key);
  const rows = await prisma.$queryRaw<Array<{ count: number }>>`
    INSERT INTO "SecurityRate" (key, count, expiresAt) VALUES (${hashed}, 1, ${now + seconds * 1000})
    ON CONFLICT(key) DO UPDATE SET count = CASE WHEN expiresAt <= ${now} THEN 1 ELSE count + 1 END,
      expiresAt = CASE WHEN expiresAt <= ${now} THEN ${now + seconds * 1000} ELSE expiresAt END
    RETURNING count`;
  return Number(rows[0].count) <= maximum;
}
export async function sendSecurityEmail(to: string, subject: string, text: string, html?: string) {
  const result = await new ZohoMailConnector().send({ to, subject: `KhyatiGems ERP — ${subject}`, text, ...(html ? { html } : {}) });
  if (result.status !== "SENT") throw new Error("Zoho could not send the verification email. Check the Zoho connection and try again later.");
}
export async function securityEvent(userId: string, action: string, request: Request) {
  const { logActivity } = await import("@/lib/activity-logger");
  await logActivity({ entityType: "Security", entityId: userId, userId, userName: "Sign-in security", actionType: action, source: "WEB", ipAddress: requestContext(request).ip, userAgent: (request.headers.get("user-agent") || "Unknown").slice(0, 400), description: action.replaceAll("_", " "), metadata: { context: contextText(request) } }).catch(() => {});
}
export async function createChallenge(userId: string, purpose: string, context: Record<string, unknown>, email: string, account: string, request: Request, previousEmail?: string) {
  await ensureSecuritySchema();
  // Bounded maintenance; challenges are retained briefly for failed-attempt investigation.
  await prisma.$executeRaw`DELETE FROM "SecurityChallenge" WHERE expiresAt < ${Date.now() - 86400000}`;
  await prisma.$executeRaw`DELETE FROM "SecurityRate" WHERE expiresAt < ${Date.now() - 86400000}`;
  const id = randomUUID(), binding = randomBytes(32).toString("hex"), code = newCode();
  const secondary = previousEmail && previousEmail !== email ? newCode() : "";
  // Invalidate earlier codes without resetting rate-limit budgets.
  await prisma.$executeRaw`UPDATE "SecurityChallenge" SET consumed = 1 WHERE userId = ${userId} AND purpose = ${purpose} AND consumed = 0`;
  await prisma.$executeRaw`INSERT INTO "SecurityChallenge" (id,userId,purpose,binding,codeHash,secondaryHash,context,expiresAt)
    VALUES (${id},${userId},${purpose},${digest(binding)},${codeHash(id, code)},${secondary ? codeHash(id, secondary) : ""},${JSON.stringify(context)},${Date.now() + OTP_SECONDS * 1000})`;
  try {
    const template = renderOtpEmail({ kind: purpose === "login" ? "sign-in" : purpose === "recovery" ? "recovery" : purpose === "authenticator-setup" ? "authenticator-setup" : "settings", code, account, reference: id, context: requestContext(request) });
    await sendSecurityEmail(email, template.subject, template.text, template.html);
    if (secondary && previousEmail) {
      const previous = renderOtpEmail({ kind: "mailbox-change", code: secondary, account, reference: id, context: requestContext(request) });
      await sendSecurityEmail(previousEmail, previous.subject, previous.text, previous.html);
    }
    await prisma.$executeRaw`UPDATE "SecurityChallenge" SET ready = 1 WHERE id = ${id} AND consumed = 0`;
  } catch (error) {
    await prisma.$executeRaw`UPDATE "SecurityChallenge" SET consumed = 1 WHERE id = ${id}`;
    throw error;
  }
  await securityEvent(userId, purpose === "login" ? "LOGIN_OTP_REQUESTED" : "SECURITY_CHANGE_REQUESTED", request);
  return `${id}.${binding}`;
}
type ChallengeRow = { id: string; userId: string; purpose: string; context: string; codeHash: string; secondaryHash: string; attempts: number };
export async function consumeChallenge(cookie: string, userId: string, purpose: string, code: string, secondaryCode = "") {
  await ensureSecuritySchema();
  const [id, binding, extra] = cookie.split(".");
  if (!id || !binding || extra || !/^[0-9a-f-]{36}$/.test(id) || !/^[0-9a-f]{64}$/.test(binding)) return null;
  // The atomic increment bounds total guesses across processes and parallel requests.
  const rows = await prisma.$queryRaw<ChallengeRow[]>`UPDATE "SecurityChallenge" SET attempts = attempts + 1
    WHERE id = ${id} AND userId = ${userId} AND purpose = ${purpose} AND binding = ${digest(binding)}
      AND consumed = 0 AND ready = 1 AND expiresAt > ${Date.now()} AND attempts < ${MAX_ATTEMPTS}
    RETURNING id,userId,purpose,context,codeHash,secondaryHash,attempts`;
  const row = rows[0];
  if (!row || !/^\d{6}$/.test(code) || !equalHash(row.codeHash, codeHash(id, code)) ||
      (row.secondaryHash && (!/^\d{6}$/.test(secondaryCode) || !equalHash(row.secondaryHash, codeHash(id, secondaryCode))))) return null;
  const count = await prisma.$executeRaw`UPDATE "SecurityChallenge" SET consumed = 1
    WHERE id = ${id} AND consumed = 0 AND attempts = ${row.attempts} AND expiresAt > ${Date.now()}`;
  return count === 1 ? JSON.parse(row.context) as Record<string, unknown> : null;
}
export async function consumeRecoveryCode(userId: string, version: string, code: string) {
  await ensureSecuritySchema();
  if (!/^[a-f0-9]{24}$/i.test(code)) return false;
  return (await prisma.$executeRaw`DELETE FROM "SecurityRecovery" WHERE hash = ${codeHash("recovery", code.toLowerCase())} AND userId = ${userId} AND version = ${version}`) === 1;
}
export async function countRecoveryCodes(userId: string, version: string) {
  await ensureSecuritySchema();
  const rows = await prisma.$queryRaw<Array<{ count: number }>>`SELECT COUNT(*) AS count FROM "SecurityRecovery" WHERE userId = ${userId} AND version = ${version}`;
  return Number(rows[0].count);
}
/** Replace only the current administrator's codes; do not change global 2FA or sessions. */
export async function replaceRecoveryCodes(actorId: string, version: string) {
  await ensureSecuritySchema();
  const recoveryCodes = Array.from({ length: 8 }, () => randomBytes(12).toString("hex"));
  await prisma.$transaction(async tx => {
    const existing = await tx.setting.findUnique({ where: { key: POLICY_KEY } });
    const policy: SecurityPolicy = existing ? JSON.parse(existing.value) : DEFAULT_POLICY;
    if (!policy.enabled || policy.version !== version) throw new Error("Security settings changed. Request a new verification code.");
    await tx.$executeRaw`DELETE FROM "SecurityRecovery" WHERE userId = ${actorId} AND version = ${version}`;
    for (const code of recoveryCodes) await tx.$executeRaw`INSERT INTO "SecurityRecovery" (hash,userId,version) VALUES (${codeHash("recovery", code)},${actorId},${version})`;
  });
  return recoveryCodes;
}
export async function saveSecurityPolicy(policy: SecurityPolicy, actorId: string, previousVersion: string) {
  await ensureSecuritySchema();
  const recoveryCodes = policy.enabled ? Array.from({ length: 8 }, () => randomBytes(12).toString("hex")) : [];
  await prisma.$transaction(async tx => {
    // Compare-and-swap protects against concurrent policy changes.
    const existing = await tx.setting.findUnique({ where: { key: POLICY_KEY } });
    if ((existing ? JSON.parse(existing.value).version : DEFAULT_POLICY.version) !== previousVersion) throw new Error("Security settings changed. Reload and request new codes.");
    await tx.setting.upsert({ where: { key: POLICY_KEY }, create: { key: POLICY_KEY, value: JSON.stringify(policy) }, update: { value: JSON.stringify(policy) } });
    await tx.$executeRaw`DELETE FROM "SecurityRecovery"`;
    for (const code of recoveryCodes) await tx.$executeRaw`INSERT INTO "SecurityRecovery" (hash,userId,version) VALUES (${codeHash("recovery", code)},${actorId},${policy.version})`;
  });
  return recoveryCodes;
}
