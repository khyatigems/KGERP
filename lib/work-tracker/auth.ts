import { createHash, randomBytes } from "node:crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TrackerError } from "./core";

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const newToken = () => `kgwt_${randomBytes(32).toString("base64url")}`;
export async function trackerIdentity(request: Request, cookieOnly = false, db = prisma, readSession: () => Promise<{ user?: { id?: string } } | null> = async () => auth()) {
  const authorization = request.headers.get("authorization");
  if (authorization && !cookieOnly) {
    if (!/^Bearer kgwt_[A-Za-z0-9_-]{43}$/.test(authorization)) throw new TrackerError("Unauthorized", 401);
    const credential = await db.workTrackerCredential.findUnique({ where: { tokenHash: hashToken(authorization.slice(7)) }, include: { user: { select: { id: true } } } });
    if (!credential || !credential.user || credential.revokedAt || +credential.expiresAt <= Date.now()) throw new TrackerError("Credential expired or revoked", 401);
    return { userId: credential.userId, extension: true };
  }
  const session = await readSession();
  if (!session?.user?.id || !await db.user.findUnique({ where: { id: session.user.id }, select: { id: true } })) throw new TrackerError("Unauthorized", 401);
  if (!["GET", "HEAD"].includes(request.method)) {
    // Session-authenticated writes must originate in the ERP; no cross-site credential creation.
    if (request.headers.get("origin") !== new URL(request.url).origin) throw new TrackerError("Invalid origin", 403);
  }
  return { userId: session.user.id, extension: false };
}
