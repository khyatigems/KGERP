import crypto from "node:crypto";

const KEY_ENV = "ERP_SECRET_ENCRYPTION_KEY";
const MIN_KEY_LENGTH = 16;

function deriveKey(): Buffer {
  const raw = process.env[KEY_ENV];
  if (!raw || raw.length < MIN_KEY_LENGTH) {
    throw new Error(
      `${KEY_ENV} must be set (>= ${MIN_KEY_LENGTH} chars) before storing secrets. Credential storage is disabled otherwise.`
    );
  }
  return crypto.createHash("sha256").update(raw).digest();
}

/**
 * Encrypt a plaintext secret using AES-256-GCM. Returns an opaque `iv:tag:cipher`
 * string that can be stored server-side (e.g. MarketplaceConnection.tokenRef).
 * Never expose the result to the browser.
 */
export function encryptSecret(plaintext: string): string {
  const key = deriveKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(":");
}

export function decryptSecret(opaque: string | null | undefined): string | null {
  if (!opaque) return null;
  const key = deriveKey();
  const parts = opaque.split(":");
  if (parts.length !== 3) return null;
  try {
    const iv = Buffer.from(parts[0], "base64");
    const tag = Buffer.from(parts[1], "base64");
    const encrypted = Buffer.from(parts[2], "base64");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export function isSecretEncryptionConfigured(): boolean {
  return Boolean(process.env[KEY_ENV] && process.env[KEY_ENV]!.length >= MIN_KEY_LENGTH);
}
