import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export function newAuthenticatorSecret() {
  let bits = "";
  for (const byte of randomBytes(20)) bits += byte.toString(2).padStart(8, "0");
  return bits.match(/.{5}/g)!.map(group => alphabet[parseInt(group, 2)]).join("");
}
function decodeSecret(secret: string) {
  if (!/^[A-Z2-7]+$/.test(secret)) throw new Error("Invalid authenticator secret");
  const bits = [...secret].map(char => alphabet.indexOf(char).toString(2).padStart(5, "0")).join("");
  return Buffer.from(bits.match(/.{8}/g)!.map(byte => parseInt(byte, 2)));
}
/** RFC 6238, SHA-1, 30-second steps; digits parameter supports published test vectors. */
export function totpCode(secret: string, counter: number, digits = 6) {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const hash = createHmac("sha1", decodeSecret(secret)).update(message).digest();
  const offset = hash[hash.length - 1] & 15;
  return ((hash.readUInt32BE(offset) & 0x7fffffff) % 10 ** digits).toString().padStart(digits, "0");
}
export function matchingTotpStep(secret: string, code: string, now = Date.now()) {
  if (!/^\d{6}$/.test(code)) return null;
  const step = Math.floor(now / 30_000);
  for (const candidate of [step, step - 1, step + 1]) {
    if (candidate >= 0 && timingSafeEqual(Buffer.from(totpCode(secret, candidate)), Buffer.from(code))) return candidate;
  }
  return null;
}
