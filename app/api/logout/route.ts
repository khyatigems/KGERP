import { auth, signOut } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { redirectTo = "/login" } = await request.json().catch(() => ({}));
    const session = await auth();

    if (session) {
      return signOut({ redirect: true, redirectTo });
    }

    return Response.redirect(new URL(redirectTo, request.url));
  } catch (error) {
    console.error("Server logout error:", error);
    return Response.json({ ok: false, error: "Logout failed" }, { status: 500 });
  }
}
