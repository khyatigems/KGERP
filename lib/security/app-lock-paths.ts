import { isPublicPage } from "@/lib/public-routes";

export function appLockExempt(pathname: string) {
  return isPublicPage(pathname) || pathname === "/unlock" || pathname === "/api/auth/app-lock" ||
    /^\/api\/auth\/(?:session|csrf|providers|signout|signin|callback\/credentials|otp|forgot-password)(?:\/|$)/.test(pathname);
}
export function safeAppReturn(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\r\n]/.test(value)) return "/";
  const parsed = new URL(value, "https://erp.invalid");
  if (parsed.origin !== "https://erp.invalid" || parsed.pathname === "/unlock" || parsed.pathname.startsWith("/api/")) return "/";
  return parsed.pathname + parsed.search + parsed.hash;
}
