const AUTH_COOKIE_PATTERNS = [
  /^next-auth\./i,
  /^authjs\./i,
  /^__Secure-next-auth\./i,
  /^__Host-next-auth\./i,
  /^__Secure-authjs\./i,
  /^__Host-authjs\./i,
  /(?:^|\.)?(session-token|csrf-token|callback-url)(?:\.|$)/i,
];

export async function forceLogout(redirectTo = "/login") {
  try {
    await fetch("/api/logout", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ redirectTo }),
    });
  } catch (error) {
    console.error("Logout request error:", error);
  }

  if (typeof document !== "undefined") {
    const cookieNames = document.cookie.split(";").map((cookie) => cookie.split("=")[0]?.trim()).filter(Boolean);

    cookieNames.forEach((name) => {
      const shouldClear = AUTH_COOKIE_PATTERNS.some((pattern) => pattern.test(name));
      if (!shouldClear) return;

      document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
      document.cookie = `${name}=; Max-Age=0; path=/; SameSite=None; Secure`;
    });

    try {
      sessionStorage.clear();
    } catch {}

    try {
      localStorage.clear();
    } catch {}
  }

  if (typeof window !== "undefined") {
    window.location.replace(redirectTo);
  }
}
