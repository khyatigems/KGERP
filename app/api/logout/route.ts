import { NextResponse } from "next/server";
import { auth, signOut } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { redirectTo = "/login" } = await request.json().catch(() => ({}));
    const session = await auth();

    if (session) {
      await signOut({ redirect: false });
    }

    const response = NextResponse.redirect(new URL(redirectTo, request.url));

    const cookieNames = [
      "next-auth.session-token",
      "next-auth.csrf-token",
      "authjs.session-token",
      "authjs.csrf-token",
      "__Secure-next-auth.session-token",
      "__Secure-next-auth.csrf-token",
      "__Host-next-auth.session-token",
      "__Host-next-auth.csrf-token",
      "__Secure-authjs.session-token",
      "__Secure-authjs.csrf-token",
      "__Host-authjs.session-token",
      "__Host-authjs.csrf-token",
    ];

    cookieNames.forEach((name) => {
      response.cookies.set(name, "", {
        expires: new Date(0),
        path: "/",
        sameSite: "lax",
      });
      response.cookies.set(name, "", {
        expires: new Date(0),
        path: "/",
        sameSite: "none",
        secure: true,
      });
    });

    return response;
  } catch (error) {
    console.error("Server logout error:", error);
    return NextResponse.json({ ok: false, error: "Logout failed" }, { status: 500 });
  }
}
