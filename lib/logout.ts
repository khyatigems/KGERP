export async function forceLogout(redirectTo = "/login") {
  try {
    const response = await fetch("/api/logout", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ redirectTo }),
      redirect: "manual",
    });

    if (response.status === 302 || response.status === 307) {
      const redirectUrl = response.headers.get("Location");
      if (redirectUrl) {
        window.location.replace(redirectUrl);
        return;
      }
    }

    if (response.redirected) {
      window.location.replace(response.url);
      return;
    }
  } catch (error) {
    console.error("Logout request error:", error);
  }

  if (typeof window !== "undefined") {
    window.location.replace(redirectTo);
  }
}
