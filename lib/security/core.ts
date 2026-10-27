import { createHash, createHmac, randomInt, timingSafeEqual } from "node:crypto";

export const OTP_SECONDS = 300;
export const MAX_ATTEMPTS = 5;
export const LOGIN_COOKIE = "erp-login-challenge";
export const SETTINGS_COOKIE = "erp-security-challenge";
export const RECOVERY_COOKIE = "erp-recovery-challenge";
export type SecurityPolicy = { enabled: boolean; email: string; alerts: boolean; version: string };
export const DEFAULT_POLICY: SecurityPolicy = { enabled: false, email: "", alerts: true, version: "disabled" };
export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export const newCode = () => randomInt(0, 1_000_000).toString().padStart(6, "0");
export function codeHash(id: string, code: string) {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("Configure AUTH_SECRET before using email verification.");
  return createHmac("sha256", secret).update(`${id}:${code}`).digest("hex");
}
export function equalHash(a: string, b: string) {
  return a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
export function readCookie(request: Request, name: string) {
  return request.headers.get("cookie")?.split(";").map(v => v.trim()).find(v => v.startsWith(`${name}=`))?.slice(name.length + 1) || "";
}
export function sameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}
export function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  return domain ? `${local.slice(0, 1)}***@${domain}` : "configured mailbox";
}
export function requestContext(request: Request) {
  const ua = (request.headers.get("user-agent") || "").slice(0, 400);
  const browser = ua.match(/Edg\/[\d.]+/)?.[0] || ua.match(/OPR\/[\d.]+/)?.[0] || ua.match(/Firefox\/[\d.]+/)?.[0] || ua.match(/Chrome\/[\d.]+/)?.[0] || (ua.includes("Safari/") ? `Safari ${ua.match(/Version\/([\d.]+)/)?.[1] || ""}`.trim() : "Unknown");
  const os = /Windows/i.test(ua) ? "Windows" : /Android/i.test(ua) ? "Android" : /iPhone|iPad/i.test(ua) ? "iOS/iPadOS" : /Mac OS/i.test(ua) ? "macOS" : /Linux/i.test(ua) ? "Linux" : "Unknown";
  // Only use provider-overwritten headers behind the configured deployment boundary.
  // Local/other hosts must not trust arbitrary X-Forwarded-For supplied by callers.
  const onVercel = process.env.VERCEL === "1";
  const ip = onVercel ? (request.headers.get("x-vercel-forwarded-for") || "Unavailable").split(",")[0].trim().slice(0, 64) : "Unavailable";
  const location = onVercel ? ["x-vercel-ip-city", "x-vercel-ip-country-region", "x-vercel-ip-country"].map(key => {
    const value = request.headers.get(key) || "";
    try { return decodeURIComponent(value).slice(0, 100); } catch { return ""; }
  }).filter(Boolean).join(", ") : "";
  return { browser, os, ip, location: location || "Unavailable", time: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST" };
}
export function contextText(request: Request) {
  const c = requestContext(request);
  return `Time: ${c.time}\nBrowser (reported): ${c.browser}\nOS (reported): ${c.os}\nIP: ${c.ip}\nApproximate location: ${c.location}`;
}
